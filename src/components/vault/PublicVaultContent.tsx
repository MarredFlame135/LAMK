// src/components/vault/PublicVaultContent.tsx
//
// El contenido real de la bóveda pública — lo que queda visible debajo del
// overlay de PublicVaultReveal.tsx una vez que termina/se salta la
// secuencia. Mismo lenguaje HUD que el resto del sitio.

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '@/lib/motion';
import { haptics } from '@/lib/haptics';

const GOLD = '#C5A059';
const CRIMSON = '#FF1E42';

interface PublicVaultContentProps {
  handle: string;
  serial: string;
  tier?: string;
  bio: string | null;
  followerCount: number | null;
  vault: { id: string; title: string; imageUrl: string; note: string | null }[];
  isOwner: boolean;
  viewerLoggedIn: boolean;
}

export function PublicVaultContent({ handle, serial, tier, bio, followerCount, vault, isOwner, viewerLoggedIn }: PublicVaultContentProps) {
  const [followState, setFollowState] = useState<'idle' | 'following' | 'pending'>('idle');
  const [followBusy, setFollowBusy] = useState(false);

  const handleFollow = async () => {
    if (!viewerLoggedIn) {
      window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setFollowBusy(true);
    haptics.tap();
    try {
      const res = await fetch('/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: handle }),
      });
      const data = await res.json();
      if (res.ok) setFollowState(data.status === 'accepted' ? 'following' : 'pending');
    } finally {
      setFollowBusy(false);
    }
  };

  return (
    <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show" className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Placa — mismo lenguaje que CollectorPlaque, versión pública */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          <span>LAMK Vault // Collector</span>
          <span>#{serial}</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight">@{handle}</h1>
            <div className="flex items-center gap-2">
              {tier && (
                <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em]" style={{ borderColor: CRIMSON, color: CRIMSON }}>
                  {tier}
                </span>
              )}
              {followerCount !== null && (
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">{followerCount} seguidores</span>
              )}
            </div>
            {bio && <p className="text-xs text-muted-foreground max-w-md">{bio}</p>}
          </div>

          {!isOwner && (
            <button
              onClick={handleFollow}
              disabled={followBusy || followState !== 'idle'}
              className="px-5 py-2 bg-[#FF1E42] hover:bg-red-700 disabled:opacity-70 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition"
            >
              {followState === 'following' ? 'Siguiendo ✓' : followState === 'pending' ? 'Solicitud enviada' : 'Seguir'}
            </button>
          )}
        </div>
      </motion.div>

      {/* Bóveda curada */}
      <motion.div variants={fadeUp} className="bg-card border border-border rounded-xl p-6 space-y-3">
        <h3 className="text-xs font-mono uppercase text-muted-foreground tracking-wider">// BÓVEDA ({vault.length})</h3>
        {vault.length === 0 ? (
          <div className="p-8 border border-dashed border-border rounded-lg text-center">
            <p className="text-muted-foreground text-xs">Esta bóveda todavía no tiene piezas públicas.</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer(0.05)} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {vault.map((item) => (
              <motion.div key={item.id} variants={fadeUp} className="bg-muted border border-border/60 rounded-xl overflow-hidden">
                <div className="aspect-square bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-2.5">
                  <h4 className="text-[11px] font-bold line-clamp-1 uppercase text-foreground">{item.title}</h4>
                  {item.note && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{item.note}</p>}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {isOwner && (
        <motion.div variants={fadeUp} className="text-center">
          <a href="/vault/pass" className="text-xs font-mono text-muted-foreground hover:text-foreground transition uppercase tracking-widest">
            ← Volver a mi Collector Pass
          </a>
        </motion.div>
      )}
    </motion.div>
  );
}
