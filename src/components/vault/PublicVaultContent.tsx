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
import { VaultZones } from './VaultZones';
import { CollectionItem } from '@/types/user';

const GOLD = '#C5A059';
const CRIMSON = '#FF1E42';

interface PublicVaultContentProps {
  handle: string;
  serial: string;
  tier?: string;
  bio: string | null;
  followerCount: number | null;
  vault: {
    id: string;
    title: string;
    imageUrl: string;
    note: string | null;
    productId: string | null;
    serialNumber: string | null;
    category: string;
  }[];
  isOwner: boolean;
  viewerLoggedIn: boolean;
}

export function PublicVaultContent({ handle, serial, tier, bio, followerCount, vault, isOwner, viewerLoggedIn }: PublicVaultContentProps) {
  const [followState, setFollowState] = useState<'idle' | 'following' | 'pending'>('idle');
  const [followBusy, setFollowBusy] = useState(false);

  // Las piezas públicas traducidas a la forma que consumen las zonas. Los
  // campos que esta vista NO conoce se dejan neutros a propósito, nunca
  // rellenados: sin fecha de compra no se muestra año, y la rareza se manda
  // en COMMON (que es "sin insignia") en vez de calcularse aquí — el estado
  // de escasez de un producto no es asunto de la bóveda de otra persona.
  const publicCollection: CollectionItem[] = vault.map((v) => ({
    id: v.id,
    sneakerTitle: v.title,
    sku: '',
    serialNumber: v.serialNumber || '',
    purchaseDate: '',
    imageUrl: v.imageUrl,
    category: v.category,
    rarity: 'COMMON',
  }));

  const notes = vault.filter((v) => v.note);

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

      {/* Bóveda curada — mismas tres zonas que la bóveda propia (/vault),
          para que un coleccionista reconozca el mismo closet cuando visita el
          de alguien más. La nota libre del dueño se conserva: es lo único que
          esta vista tiene y la propia no. */}
      <motion.div variants={fadeUp} className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="text-xs font-mono uppercase text-muted-foreground tracking-wider">// EL CLOSET ({vault.length})</h3>
        {vault.length === 0 ? (
          <div className="p-8 border border-dashed border-border rounded-lg text-center">
            <p className="text-muted-foreground text-xs">Esta bóveda todavía no tiene piezas públicas.</p>
          </div>
        ) : (
          <VaultZones collection={publicCollection} />
        )}
        {notes.length > 0 && (
          <div className="pt-1 space-y-1.5 border-t border-border/60">
            <h4 className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest pt-3">// Notas del coleccionista</h4>
            {notes.map((n) => (
              <p key={n.id} className="text-[10px] text-muted-foreground">
                <span className="text-foreground font-bold uppercase">{n.title}:</span> {n.note}
              </p>
            ))}
          </div>
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
