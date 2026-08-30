// src/components/vault/PurchaseClaimForm.tsx
//
// "¿Ya has comprado antes? Registrar compra" (pedido directo de Dante,
// 2026-08-30) — para piezas de LAMK que el cliente tiene pero que no
// vienen de un pedido real en este sitio (compra anterior a esta app,
// tienda física, etc.). El cliente declara modelo + foto; un admin la
// aprueba o rechaza a mano en /admin (VaultClaimsPanel) — solo entonces
// aparece en "MI COLECCIÓN". Ver lib/vault-claims.ts para el porqué
// completo de no auto-aprobar nada.

'use client';

import React, { useEffect, useState } from 'react';
import { haptics } from '@/lib/haptics';

interface Claim {
  id: string;
  productTitle: string;
  imageUrl: string;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  createdAt: string;
}

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB — mismo límite que valida la API

const STATUS_META: Record<Claim['status'], { label: string; className: string }> = {
  pending: { label: 'EN REVISIÓN', className: 'bg-amber-950/30 text-amber-400 border-amber-800' },
  approved: { label: 'APROBADA · YA ESTÁ EN TU COLECCIÓN', className: 'bg-emerald-950/30 text-emerald-400 border-emerald-800' },
  rejected: { label: 'RECHAZADA', className: 'bg-red-950/30 text-red-400 border-red-900' },
};

export function PurchaseClaimForm() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [productTitle, setProductTitle] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadClaims = async () => {
    try {
      const res = await fetch('/api/vault/claims');
      if (!res.ok) return;
      const data = await res.json();
      setClaims(data.claims || []);
    } finally {
      setLoadingClaims(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError('La foto es demasiado grande. Usa una imagen de menos de 2MB.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!photo) {
      setError('Sube una foto del producto.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/vault/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productTitle, imageUrl: photo, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo enviar tu registro.');
        return;
      }
      haptics.success();
      setSuccess(true);
      setProductTitle('');
      setNote('');
      setPhoto(null);
      await loadClaims();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div>
        <h3 className="text-xs font-mono uppercase text-muted-foreground tracking-wider">// ¿YA HAS COMPRADO ANTES?</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          Si tienes una pieza de LAMK que no aparece en tu historial (compra anterior, en tienda física, etc.), regístrala aquí.
          Un administrador la revisa antes de que aparezca oficialmente en tu Bóveda.
        </p>
      </div>

      {success ? (
        <div className="p-4 bg-emerald-950/30 border border-emerald-800 rounded-lg text-center text-xs text-emerald-400">
          Registro enviado — en cuanto un admin lo confirme, aparecerá en tu colección.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Modelo exacto</label>
            <input
              required
              value={productTitle}
              onChange={(e) => setProductTitle(e.target.value)}
              placeholder="ej. Air Jordan 1 Retro High OG 'Lost & Found'"
              className="w-full p-2.5 bg-muted border border-border rounded-lg text-xs text-foreground outline-none focus:border-[#FF1E42]"
            />
          </div>

          <label className="flex items-center justify-center gap-2 h-24 border border-dashed border-border rounded-lg cursor-pointer hover:border-red-600/60 transition text-[11px] text-muted-foreground overflow-hidden relative">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              '📸 Foto del producto (obligatoria)'
            )}
            <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </label>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Nota (opcional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ej. Comprado en 2023, tienda física"
              rows={2}
              className="w-full p-2.5 bg-muted border border-border rounded-lg text-xs text-foreground outline-none focus:border-[#FF1E42]"
            />
          </div>

          {error && <p className="text-[11px] text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 min-h-[44px] bg-[#FF1E42] hover:bg-red-700 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition"
          >
            {isSubmitting ? 'ENVIANDO...' : 'REGISTRAR COMPRA'}
          </button>
        </form>
      )}

      {!loadingClaims && claims.length > 0 && (
        <div className="pt-3 border-t border-border space-y-2">
          <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-wide">Tus registros</p>
          {claims.map((claim) => (
            <div key={claim.id} className="flex items-center gap-3 p-2 bg-muted border border-border rounded-lg text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={claim.imageUrl} alt={claim.productTitle} className="w-10 h-10 rounded object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-foreground">{claim.productTitle}</p>
                <span className={`inline-block mt-1 px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase tracking-wide ${STATUS_META[claim.status].className}`}>
                  {STATUS_META[claim.status].label}
                </span>
                {claim.status === 'rejected' && claim.reviewNote && (
                  <p className="text-[10px] text-muted-foreground mt-1">Motivo: {claim.reviewNote}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
