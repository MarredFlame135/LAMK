// src/components/vault/PassManager.tsx
//
// Fase C.1: "el QR no es un cuadro negro pegado en una página, es una
// credencial". El propio dueño gestiona su pass — genera/revoca el QR,
// modo presentación (brillo máximo, todo lo demás en negro, para
// mostrarlo en persona) y exportar como imagen para stories.
//
// El QR se genera en el CLIENTE (paquete `qrcode`, ya en package.json —
// no se agregó ninguna librería nueva) porque el token solo existe
// después de un POST interactivo (`generar mi pass`), no algo que se
// pueda pre-renderizar server-side.

'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { motion } from 'framer-motion';
import { CollectorTier } from '@/types/user';
import { fadeUp } from '@/lib/motion';
import { haptics } from '@/lib/haptics';

const GOLD = '#C5A059';
const CRIMSON = '#FF1E42';
const OBSIDIAN = '#050507';

interface PassManagerProps {
  handle: string;
  serial: string;
  tier: CollectorTier;
  xp: number;
  pieces: number;
  siteUrl: string;
  featuredImageUrl: string | null;
}

interface QrState {
  token: string;
  expiresAt: string | null;
}

export function PassManager({ handle, serial, tier, xp, pieces, siteUrl, featuredImageUrl }: PassManagerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qr, setQr] = useState<QrState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [presenting, setPresenting] = useState(false);

  // Carga el QR activo (si ya existe) al montar.
  useEffect(() => {
    fetch('/api/social/qr')
      .then((r) => r.json())
      .then((data) => {
        const active = data.tokens?.[0];
        if (active) setQr({ token: active.token, expiresAt: active.expiresAt });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Dibuja el QR cada vez que hay token — nivel de corrección 'H' porque
  // el logo se dibuja encima (brief C.1: "verifica el contraste real con
  // un lector, un QR bonito que no escanea es un QR fallido").
  useEffect(() => {
    if (!qr || !canvasRef.current) return;
    const url = `${siteUrl}/vault/pass/${qr.token}`;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: '#F5F3ED', light: OBSIDIAN },
    }).then(() => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !canvasRef.current) return;
      // Isotipo simple al centro — un punto crimson, mismo lenguaje que el
      // logo del navbar (círculo rojo). Con nivel 'H' hay margen de sobra.
      const size = canvasRef.current.width;
      const center = size / 2;
      const r = size * 0.07;
      ctx.fillStyle = OBSIDIAN;
      ctx.beginPath();
      ctx.arc(center, center, r + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = CRIMSON;
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [qr, siteUrl]);

  const generate = async () => {
    setBusy(true);
    haptics.tap();
    try {
      const res = await fetch('/api/social/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ longDuration: true }), // el pass es "de larga duración" por default — es la credencial que se muestra en persona repetidamente, no un QR de un solo evento
      });
      const data = await res.json();
      if (res.ok) setQr({ token: data.token, expiresAt: data.expiresAt });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    haptics.tap();
    try {
      await fetch('/api/social/qr', { method: 'DELETE' });
      setQr(null);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <>
      <motion.div variants={fadeUp} className="max-w-sm mx-auto space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 space-y-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
            aria-hidden
          />

          <div className="relative text-center">
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-400">LAMK Vault // Collector Pass</span>
          </div>

          {featuredImageUrl && (
            <div className="relative h-28 w-28 mx-auto rounded-xl overflow-hidden bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={featuredImageUrl} alt="Pieza destacada" className="h-full w-full object-cover" />
            </div>
          )}

          <div className="relative flex items-center justify-between text-xs">
            <span className="font-display font-black uppercase">@{handle}</span>
            <span className="font-mono font-bold uppercase tracking-wide" style={{ color: CRIMSON }}>{tier}</span>
          </div>
          <div className="relative flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wide -mt-3">
            <span>ÍNDICE {xp.toLocaleString()}</span>
            <span>{pieces} PIEZAS</span>
          </div>

          {qr ? (
            <div className="relative flex justify-center">
              <canvas ref={canvasRef} className="rounded-lg" />
            </div>
          ) : (
            <div className="relative flex items-center justify-center h-[240px] border border-dashed border-border rounded-lg">
              <p className="text-xs text-zinc-500 text-center px-6">Genera tu pass para tener un QR que otros puedan escanear.</p>
            </div>
          )}

          <div className="relative flex items-center justify-between text-[9px] font-mono text-zinc-500 uppercase tracking-wide">
            <span>#LK-C-{serial}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {qr ? (
            <>
              <button
                onClick={() => setPresenting(true)}
                className="w-full py-3 bg-[#FF1E42] hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition"
              >
                Mostrar pass
              </button>
              <a
                href={`/api/vault/pass/story-image?token=${qr.token}`}
                download="lamk-collector-pass.png"
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition text-center"
              >
                Exportar para stories
              </a>
              <button
                onClick={revoke}
                disabled={busy}
                className="w-full py-2.5 text-zinc-500 hover:text-[#FF1E42] text-[11px] font-mono uppercase tracking-widest transition disabled:opacity-50"
              >
                Revocar mi QR
              </button>
            </>
          ) : (
            <button
              onClick={generate}
              disabled={busy}
              className="w-full py-3 bg-[#FF1E42] hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition"
            >
              {busy ? 'Generando...' : 'Generar mi Collector Pass'}
            </button>
          )}
          <a href="/vault/scan" className="text-center text-[11px] font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition">
            Escanear el pass de otro coleccionista →
          </a>
        </div>
      </motion.div>

      {/* Modo presentación — pantalla completa, todo lo demás en negro,
          pensado para mostrarse en persona en un evento/tienda mal
          iluminada (brief C.1). */}
      {presenting && qr && (
        <div
          className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center gap-6 p-8"
          onClick={() => setPresenting(false)}
        >
          <canvas
            ref={(node) => {
              if (!node || !qr) return;
              QRCode.toCanvas(node, `${siteUrl}/vault/pass/${qr.token}`, {
                width: 320,
                margin: 2,
                errorCorrectionLevel: 'H',
                color: { dark: '#050507', light: '#FFFFFF' },
              });
            }}
          />
          <span className="font-mono text-sm font-bold text-black uppercase tracking-widest">@{handle}</span>
          <button
            onClick={() => setPresenting(false)}
            className="px-5 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-lg"
          >
            Cerrar
          </button>
        </div>
      )}
    </>
  );
}
