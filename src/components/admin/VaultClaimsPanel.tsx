// src/components/admin/VaultClaimsPanel.tsx
//
// Cola de aprobación de "¿Ya has comprado antes?" (pedido directo de
// Dante, 2026-08-30 — ver lib/vault-claims.ts). Un cliente declara una
// pieza que no viene de un pedido real en este sitio; solo aparece en su
// Bóveda si un admin la aprueba aquí. "Rechazar" pide un motivo opcional
// que el cliente ve en su propio panel.

'use client';

import React, { useEffect, useState } from 'react';

interface Claim {
  id: string;
  customerName: string;
  customerEmail: string;
  productTitle: string;
  imageUrl: string;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  createdAt: string;
}

type Filter = 'pending' | 'approved' | 'rejected' | 'all';

export function VaultClaimsPanel() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (f: Filter) => {
    setLoading(true);
    try {
      const qs = f === 'all' ? '' : `?status=${f}`;
      const res = await fetch(`/api/admin/vault-claims${qs}`);
      const data = await res.json();
      setClaims(data.claims || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      await fetch('/api/admin/vault-claims', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' }),
      });
      await load(filter);
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    setBusyId(id);
    try {
      await fetch('/api/admin/vault-claims', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'rejected', reviewNote: rejectNote || undefined }),
      });
      setRejectingId(null);
      setRejectNote('');
      await load(filter);
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = claims.filter((c) => c.status === 'pending').length;

  return (
    <div className="p-5 bg-card border border-border rounded-xl shadow-lg shadow-black/20 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="font-display text-sm font-black uppercase tracking-wider text-foreground">
          BÓVEDA · COMPRAS REGISTRADAS POR CLIENTES
        </h3>
        {filter === 'pending' && pendingCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-900">
            {pendingCount} SIN REVISAR
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wide border transition ${
              filter === f ? 'bg-[#FF1E42] text-white border-[#FF1E42]' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobadas' : f === 'rejected' ? 'Rechazadas' : 'Todas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-xs">Cargando...</div>
      ) : claims.length === 0 ? (
        <div className="p-8 border border-dashed border-border rounded-lg text-center text-muted-foreground text-xs">
          {filter === 'pending' ? 'No hay registros pendientes de revisar.' : 'No hay registros en esta categoría.'}
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <div key={claim.id} className="flex flex-col sm:flex-row gap-3 p-3 border border-border rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={claim.imageUrl} alt={claim.productTitle} className="w-full sm:w-20 h-32 sm:h-20 rounded object-cover shrink-0" />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-bold text-foreground text-sm">{claim.productTitle}</p>
                <p className="text-[11px] text-muted-foreground">
                  {claim.customerName} · {claim.customerEmail}
                </p>
                {claim.note && <p className="text-[11px] text-muted-foreground italic">"{claim.note}"</p>}
                <p className="text-[10px] font-mono text-muted-foreground">
                  {new Date(claim.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                {claim.status !== 'pending' && (
                  <span className={`inline-block px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase tracking-wide ${
                    claim.status === 'approved' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800' : 'bg-red-950/30 text-red-400 border-red-900'
                  }`}>
                    {claim.status === 'approved' ? 'APROBADA' : 'RECHAZADA'}
                  </span>
                )}
                {claim.status === 'rejected' && claim.reviewNote && (
                  <p className="text-[10px] text-muted-foreground">Motivo: {claim.reviewNote}</p>
                )}
              </div>

              {claim.status === 'pending' && (
                <div className="flex sm:flex-col gap-2 sm:justify-center shrink-0">
                  <button
                    onClick={() => handleApprove(claim.id)}
                    disabled={busyId === claim.id}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[10px] rounded uppercase tracking-wider transition"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => setRejectingId(rejectingId === claim.id ? null : claim.id)}
                    disabled={busyId === claim.id}
                    className="px-3 py-1.5 bg-muted hover:bg-border disabled:opacity-50 text-foreground font-bold text-[10px] rounded uppercase tracking-wider transition"
                  >
                    Rechazar
                  </button>
                </div>
              )}

              {rejectingId === claim.id && (
                <div className="w-full sm:w-56 shrink-0 space-y-2">
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Motivo (opcional) — lo verá el cliente"
                    rows={2}
                    className="w-full p-2 bg-muted border border-border rounded text-[11px] text-foreground outline-none focus:border-[#FF1E42]"
                  />
                  <button
                    onClick={() => handleReject(claim.id)}
                    disabled={busyId === claim.id}
                    className="w-full px-3 py-1.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-bold text-[10px] rounded uppercase tracking-wider transition"
                  >
                    Confirmar rechazo
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
