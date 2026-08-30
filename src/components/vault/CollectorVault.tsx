// src/components/vault/CollectorVault.tsx
//
// Ronda "anima Vault" (2026-08-27): antes era una lista estática — cero
// reveals, cero micro-interacción salvo el tilt de HolographicCard (que ya
// existía). Se suma: entrada en cascada consistente con el resto del sitio
// (fadeUp/staggerContainer, mismos tokens de lib/motion.ts), y un botón real
// de "Flexionar / Compartir" por pieza usando el Web Share API nativo — la
// pieza social que se había quedado pendiente de una ronda anterior.

'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { UserProfile, CollectionItem } from '@/types/user';
import { Product } from '@/types/product';
import { MostWantedSection } from './MostWantedSection';
import { calculateGamificationTier, computeCollectionIndex } from '@/utils/gamification';
import { useApp } from '@/context/AppContext';
import { HolographicCard } from '@/components/ui/holographic-card';
import { Magnetic } from '@/components/ui/Magnetic';
import { ReviewForm } from './ReviewForm';
import { CollectorPlaque } from './CollectorPlaque';
import { RankProgress } from './RankProgress';
import { RankLadder } from './RankLadder';
import { CollectionIndexPanel } from './CollectionIndexPanel';
import { haptics } from '@/lib/haptics';
import { fadeUp, staggerContainer } from '@/lib/motion';

const LAST_TIER_KEY = 'lamk_last_seen_tier_v1';

interface CollectorVaultProps {
  user: UserProfile;
  username?: string;
  wishlist?: Product[]; // Most Wanted — solo se pasa en la propia bóveda, ver vault/page.tsx
  isOwnProfile?: boolean;
}

// Comparte la pieza real (imagen + texto) vía Web Share API nativo; si el
// navegador no lo soporta (la mayoría de desktop), cae a copiar el texto al
// portapapeles — nunca falla en silencio.
async function shareCollectionItem(item: CollectionItem, onFallback: () => void) {
  const text = `I just copped ${item.sneakerTitle} at LAMK — Serial ${item.serialNumber}.`;
  const url = typeof window !== 'undefined' ? window.location.origin : undefined;

  if (typeof navigator === 'undefined' || !navigator.share) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url ? `${text} ${url}` : text);
      onFallback();
    }
    return;
  }

  try {
    const res = await fetch(item.imageUrl);
    const blob = await res.blob();
    const file = new File([blob], 'lamk-vault.jpg', { type: blob.type || 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: 'Look At My Kicks', text, files: [file] });
      return;
    }
  } catch {
    // la imagen puede fallar por CORS del CDN — se cae al share de solo texto
  }

  try {
    await navigator.share({ title: 'Look At My Kicks', text, url });
  } catch {
    // usuario canceló el share nativo — no es un error real, no hacer nada
  }
}

// Rareza real (ver deriveRealRarity en utils/gamification.ts) — solo se
// muestra la insignia para RARE/LEGENDARY; COMMON no necesita etiqueta
// (es el caso por default, marcarlo todo sería ruido).
const RARITY_BADGE: Record<CollectionItem['rarity'], { label: string; color: string } | null> = {
  COMMON: null,
  RARE: { label: 'RARE', color: '#C5A059' },
  LEGENDARY: { label: 'LEGENDARY', color: '#FF1E42' },
};

function CollectionCard({ item, index }: { item: CollectionItem; index: number }) {
  const [copied, setCopied] = useState(false);
  const badge = RARITY_BADGE[item.rarity];

  return (
    <motion.div variants={fadeUp} custom={index}>
      <HolographicCard className="group relative p-3 bg-gradient-to-b from-zinc-800/50 to-zinc-950 border border-zinc-700/80 rounded-xl overflow-hidden hover:border-[#C5A059]/50 transition-colors">
        <div className="relative aspect-square bg-black rounded-lg mb-2 overflow-hidden">
          <img src={item.imageUrl} alt={item.sneakerTitle} className="w-full h-full object-cover" />
          {badge && (
            <span
              className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded font-mono text-[8px] font-bold uppercase tracking-wide text-black"
              style={{ background: badge.color }}
            >
              {badge.label}
            </span>
          )}
        </div>
        <h4 className="text-[11px] font-bold line-clamp-1 uppercase">{item.sneakerTitle}</h4>
        <span className="text-[9px] font-mono text-[#C5A059] block mt-0.5">{item.serialNumber}</span>

        <Magnetic className="absolute top-2 right-2" strength={0.25}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              haptics.tap();
              shareCollectionItem(item, () => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
            }}
            className="flex items-center justify-center h-7 w-7 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 text-zinc-300 hover:text-white hover:border-[#C5A059]/50 transition opacity-0 group-hover:opacity-100"
            aria-label="Flexionar / compartir esta pieza"
            title="Flexionar / Compartir"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5"/></svg>
          </button>
        </Magnetic>
        {copied && (
          <span className="absolute top-2 right-11 text-[9px] font-mono bg-black/80 text-emerald-400 px-1.5 py-0.5 rounded whitespace-nowrap">
            Copiado ✓
          </span>
        )}
      </HolographicCard>
    </motion.div>
  );
}

export function CollectorVault({ user, username, wishlist, isOwnProfile = true }: CollectorVaultProps) {
  const tierInfo = calculateGamificationTier(user.xp);
  const collectionIndex = computeCollectionIndex({ totalSpentMxn: user.totalSpent, collection: user.collection });
  const { t } = useApp();

  useEffect(() => {
    if (!isOwnProfile) return;
    try {
      const lastSeen = localStorage.getItem(LAST_TIER_KEY);
      if (lastSeen && lastSeen !== user.tier) haptics.levelUp();
      localStorage.setItem(LAST_TIER_KEY, user.tier);
    } catch {
      // localStorage puede fallar en modo privado — la vibración es un extra, no crítico.
    }
  }, [isOwnProfile, user.tier]);

  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto p-6 bg-background text-foreground space-y-8"
    >

      {/* Header de la Bóveda */}
      <motion.div variants={fadeUp} className="border-b border-border pb-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// THE COLLECTOR VAULT</span>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight mt-1">
            {isOwnProfile ? t.vault.title : `PERFIL DE ${user.firstName.toUpperCase()} ${user.lastName.toUpperCase()}`}
          </h1>
        </div>
        {isOwnProfile && (
          <div className="flex items-center gap-4 mb-1">
            <a href="/vault/pass" className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-white transition">
              Mi Pass →
            </a>
            <a href="/vault/settings" className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-white transition">
              Configuración →
            </a>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Panel Izquierdo: Tarjeta de Perfil + Experiencia XP + Tarjetas Cromadas */}
        <motion.div variants={fadeUp} className="lg:col-span-7 space-y-6">

          {/* Placa de Coleccionista + barra de rango — reemplaza el header
              de perfil genérico anterior (avatar+pill+barra plana) por la
              credencial de membresía y un nivel de videojuego real, con
              checkpoints en cada rango de TIER_LADDER. */}
          <CollectorPlaque user={user} displayName={`@${username || user.email.split('@')[0]}`} />
          <RankProgress tierInfo={tierInfo} />

          {/* Colección + historial + reseña — un solo panel, como antes */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">

          {/* Colección de Piezas (Tarjetas Cromadas) */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
              // MI COLECCIÓN ({user.collection.length} PIEZAS)
            </h3>

            {user.collection.length === 0 ? (
              <div className="p-8 border border-dashed border-border rounded-lg text-center space-y-3">
                <p className="text-zinc-400 text-xs">Aún no tienes pares en tu bóveda. Completa tu primer pedido para desbloquear tu tarjeta digital.</p>
                <Magnetic className="inline-block" strength={0.2}>
                  <a href="/catalog" className="inline-block px-5 py-2.5 bg-[#FF1E42] hover:bg-red-700 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg transition">
                    Ver catálogo →
                  </a>
                </Magnetic>
              </div>
            ) : (
              <motion.div variants={staggerContainer(0.06)} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {user.collection.map((item, i) => (
                  <CollectionCard key={item.id} item={item} index={i} />
                ))}
              </motion.div>
            )}
          </div>

          </div>

          {/* Most Wanted (solo en tu propia bóveda) — panel aparte, no
              dentro de la misma card que Colección/Historial, para que
              quitar/agregar piezas no reordene visualmente lo de arriba. */}
          {isOwnProfile && wishlist && <MostWantedSection initialItems={wishlist} />}

          <div className="bg-card border border-border rounded-xl p-6 space-y-6">

          {/* Historial Real de Pedidos (solo en tu propia bóveda) */}
          {isOwnProfile && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
                // HISTORIAL DE PEDIDOS
              </h3>
              {!user.recentOrders || user.recentOrders.length === 0 ? (
                <div className="p-6 border border-dashed border-border rounded-lg text-center text-zinc-400 text-xs">
                  Todavía no tienes pedidos registrados en Shopify.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border/80 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="text-zinc-400 font-mono border-b border-border bg-black/40">
                      <tr>
                        <th className="py-2 px-3">PEDIDO</th>
                        <th className="py-2 px-3">FECHA</th>
                        <th className="py-2 px-3 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {user.recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="py-2 px-3 font-bold text-zinc-200">{order.name}</td>
                          <td className="py-2 px-3 text-zinc-400 font-mono">
                            {order.date ? new Date(order.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-[#FF1E42] font-bold">
                            ${order.total.toLocaleString()} {order.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Reseña verificada — solo si tiene compra real */}
          {isOwnProfile && user.ordersCount > 0 && <ReviewForm />}

          </div>

        </motion.div>

        {/* Panel Derecho: Escalera de Rango. El "Ranking Global Top 5" que
            había aquí era 100% inventado (mock-users.ts) — se quitó por
            completo, ver commit 2026-08-27 / nota en mock-users.ts. */}
        <motion.div variants={fadeUp} className="lg:col-span-5 space-y-6">
          <CollectionIndexPanel breakdown={collectionIndex} />
          <RankLadder currentTier={user.tier} />
        </motion.div>

      </div>
    </motion.div>
  );
}
