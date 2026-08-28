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
import { calculateGamificationTier, TIER_THRESHOLDS } from '@/utils/gamification';
import { useApp } from '@/context/AppContext';
import { HolographicCard } from '@/components/ui/holographic-card';
import { CountUp } from '@/components/ui/count-up';
import { Magnetic } from '@/components/ui/Magnetic';
import { ReviewForm } from './ReviewForm';
import { haptics } from '@/lib/haptics';
import { fadeUp, staggerContainer } from '@/lib/motion';

const LAST_TIER_KEY = 'lamk_last_seen_tier_v1';

interface CollectorVaultProps {
  user: UserProfile;
  username?: string;
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

function CollectionCard({ item, index }: { item: CollectionItem; index: number }) {
  const [copied, setCopied] = useState(false);

  return (
    <motion.div variants={fadeUp} custom={index}>
      <HolographicCard className="group relative p-3 bg-gradient-to-b from-zinc-800/50 to-zinc-950 border border-zinc-700/80 rounded-xl overflow-hidden hover:border-amber-500/50 transition-colors">
        <div className="aspect-square bg-black rounded-lg mb-2 overflow-hidden">
          <img src={item.imageUrl} alt={item.sneakerTitle} className="w-full h-full object-cover" />
        </div>
        <h4 className="text-[11px] font-bold line-clamp-1 uppercase">{item.sneakerTitle}</h4>
        <span className="text-[9px] font-mono text-amber-400 block mt-0.5">{item.serialNumber}</span>

        <Magnetic className="absolute top-2 right-2" strength={0.25}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              haptics.tap();
              shareCollectionItem(item, () => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
            }}
            className="flex items-center justify-center h-7 w-7 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 text-zinc-300 hover:text-white hover:border-amber-500/50 transition opacity-0 group-hover:opacity-100"
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

export function CollectorVault({ user, username, isOwnProfile = true }: CollectorVaultProps) {
  const tierInfo = calculateGamificationTier(user.xp);
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
      <motion.div variants={fadeUp} className="border-b border-border pb-4">
        <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// THE COLLECTOR VAULT</span>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight mt-1">
          {isOwnProfile ? t.vault.title : `PERFIL DE ${user.firstName.toUpperCase()} ${user.lastName.toUpperCase()}`}
        </h1>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Panel Izquierdo: Tarjeta de Perfil + Experiencia XP + Tarjetas Cromadas */}
        <motion.div variants={fadeUp} className="lg:col-span-7 bg-card border border-border rounded-xl p-6 space-y-6">

          {/* Header del Perfil */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-amber-500 via-red-600 to-amber-300 p-0.5 animate-pulse">
              <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center font-black text-xl">
                {user.firstName[0]}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-black uppercase tracking-wide">{user.firstName} {user.lastName}</h2>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-amber-950/40 border border-amber-500/40 rounded-full text-amber-400 text-[10px] font-mono font-bold uppercase mt-1">
                ◆ TIER: {user.tier}
              </div>
            </div>
          </div>

          {/* Barra de Progreso XP (Efecto Meta-Gradiente) */}
          <div className="space-y-1.5 bg-black/50 p-4 border border-border/80 rounded-lg">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">{t.vault.xpLabel}</span>
              <span className="text-amber-400 font-bold">
                <CountUp value={user.xp} suffix=" XP" /> {tierInfo.nextTier !== 'HALL_OF_FAME' && `/ ${tierInfo.nextTierXp.toLocaleString()} XP`}
              </span>
            </div>
            <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${tierInfo.progressPercentage}%` }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.3 }}
                className="bg-gradient-to-r from-red-600 via-amber-500 to-amber-300 h-full"
              />
            </div>
            <p className="text-[10px] text-zinc-400 font-mono text-right">
              {tierInfo.nextTier === 'HALL_OF_FAME'
                ? '¡Rango máximo alcanzado! Eres HALL OF FAME.'
                : `Te faltan ${tierInfo.xpRemaining.toLocaleString()} XP para subir a ${tierInfo.nextTier}.`}
            </p>
          </div>

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

        </motion.div>

        {/* Panel Derecho: Niveles. El "Ranking Global Top 5" que había aquí era
            100% inventado (mock-users.ts) — se quitó por completo, ver commit
            2026-08-27 / nota en mock-users.ts. */}
        <motion.div variants={fadeUp} className="lg:col-span-5 space-y-6">

          {/* Explicación de los Niveles (Tiers) — la fila del tier actual se
              resalta (estado codificado en forma, no solo en texto) */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-mono text-amber-400 uppercase font-bold tracking-wider">
              BENEFICIOS POR TIER
            </h4>
            <div className="space-y-2 text-xs text-zinc-400">
              {[
                { tier: 'ROOKIE', range: `0 – ${TIER_THRESHOLDS.HYPEBEAST.toLocaleString()} XP`, color: 'text-zinc-200', dot: 'bg-zinc-500', perk: 'Perfil básico y acceso a la comunidad.' },
                { tier: 'HYPEBEAST', range: `${TIER_THRESHOLDS.HYPEBEAST.toLocaleString()} – ${TIER_THRESHOLDS.COLLECTOR.toLocaleString()} XP`, color: 'text-emerald-400', dot: 'bg-emerald-500', perk: 'Alertas prioritarias de Restock por WhatsApp.' },
                { tier: 'COLLECTOR', range: `${TIER_THRESHOLDS.COLLECTOR.toLocaleString()} – ${TIER_THRESHOLDS.LEGEND.toLocaleString()} XP`, color: 'text-amber-400', dot: 'bg-amber-500', perk: 'Acceso anticipado a Drops (30 min antes).' },
                { tier: 'LEGEND', range: `${TIER_THRESHOLDS.LEGEND.toLocaleString()}+ XP`, color: 'text-red-500', dot: 'bg-[#FF1E42]', perk: 'Piezas exclusivas, apartado extendido y eventos VIP.' },
              ].map((row, i) => {
                const isCurrent = row.tier === user.tier;
                return (
                  <motion.div
                    key={row.tier}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: 0.15 + i * 0.06 }}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors ${
                      isCurrent ? 'bg-amber-950/20 border-amber-500/40' : 'bg-black/30 border-border/60'
                    }`}
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${row.dot}`} />
                    <div className="flex-1">
                      <strong className={`${row.color} block`}>
                        {row.tier} ({row.range}) {isCurrent && <span className="text-[9px] text-amber-400 font-mono">· TÚ</span>}
                      </strong>
                      {row.perk}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

        </motion.div>

      </div>
    </motion.div>
  );
}
