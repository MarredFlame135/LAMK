// src/components/vault/CollectorVault.tsx

'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserProfile } from '@/types/user';
import { calculateGamificationTier, TIER_THRESHOLDS } from '@/utils/gamification';
import { useApp } from '@/context/AppContext';
import { HolographicCard } from '@/components/ui/holographic-card';
import { CountUp } from '@/components/ui/count-up';
import { ReviewForm } from './ReviewForm';
import { haptics } from '@/lib/haptics';

const LAST_TIER_KEY = 'lamk_last_seen_tier_v1';

interface CollectorVaultProps {
  user: UserProfile;
  username?: string;       // Slug público (ej. "sneaker_god_mx") del perfil que se está viendo
  isOwnProfile?: boolean;  // false cuando se ve el perfil público de otro coleccionista
}

export function CollectorVault({ user, username, isOwnProfile = true }: CollectorVaultProps) {
  // Curva de progresión geométrica (+30% de dificultad por nivel) — la misma
  // que usa el resto del sistema, en vez de un umbral local desincronizado.
  const tierInfo = calculateGamificationTier(user.xp);
  const { t } = useApp();

  // Haptic de "subir de nivel": compara el tier que la última vez vio este
  // navegador contra el actual. Solo en la propia bóveda — no tiene sentido
  // en un perfil público de otro coleccionista.
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
    <div className="max-w-7xl mx-auto p-6 bg-background text-foreground space-y-8">

      {/* Header de la Bóveda */}
      <div className="border-b border-border pb-4">
        <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// THE COLLECTOR VAULT</span>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight mt-1">
          {isOwnProfile ? t.vault.title : `PERFIL DE ${user.firstName.toUpperCase()} ${user.lastName.toUpperCase()}`}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Panel Izquierdo: Tarjeta de Perfil + Experiencia XP + Tarjetas Cromadas */}
        <div className="lg:col-span-7 bg-card border border-border rounded-xl p-6 space-y-6">
          
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
                transition={{ duration: 1.1, ease: 'easeOut' }}
                className="bg-gradient-to-r from-red-600 via-amber-500 to-amber-300 h-full"
              />
            </div>
            <p className="text-[10px] text-zinc-500 font-mono text-right">
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
              <div className="p-8 border border-dashed border-border rounded-lg text-center text-zinc-500 text-xs">
                Aún no tienes pares en tu bóveda. Completa tu primer pedido para desbloquear tu tarjeta digital.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {user.collection.map((item) => (
                  <HolographicCard
                    key={item.id}
                    className="p-3 bg-gradient-to-b from-zinc-800/50 to-zinc-950 border border-zinc-700/80 rounded-lg overflow-hidden group hover:border-amber-500/50 transition-colors"
                  >
                    <div className="aspect-square bg-black rounded mb-2 overflow-hidden">
                      <img src={item.imageUrl} alt={item.sneakerTitle} className="w-full h-full object-cover" />
                    </div>
                    <h4 className="text-[11px] font-bold line-clamp-1 uppercase">{item.sneakerTitle}</h4>
                    <span className="text-[9px] font-mono text-amber-400 block mt-0.5">{item.serialNumber}</span>
                  </HolographicCard>
                ))}
              </div>
            )}
          </div>

          {/* Historial Real de Pedidos (solo en tu propia bóveda) */}
          {isOwnProfile && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
                // HISTORIAL DE PEDIDOS
              </h3>
              {!user.recentOrders || user.recentOrders.length === 0 ? (
                <div className="p-6 border border-dashed border-border rounded-lg text-center text-zinc-500 text-xs">
                  Todavía no tienes pedidos registrados en Shopify.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border/80 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="text-zinc-500 font-mono border-b border-border bg-black/40">
                      <tr>
                        <th className="py-2 px-3">PEDIDO</th>
                        <th className="py-2 px-3">FECHA</th>
                        <th className="py-2 px-3 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {user.recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-zinc-900/40">
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

        {/* Panel Derecho: Niveles. El "Ranking Global Top 5" que había aquí
            era 100% inventado (mock-users.ts) — mostraba a "dante-medina"
            en el puesto #3 con 12,400 XP sin que existiera ninguna compra
            real detrás. Se quitó por completo en vez de dejarlo (2026-08-27,
            reporte del cliente); un ranking real necesita un directorio de
            clientes que este proyecto todavía no tiene — ver nota en
            mock-users.ts. */}
        <div className="lg:col-span-5 space-y-6">

          {/* Explicación de los Niveles (Tiers) */}
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
              ].map((row) => (
                <div key={row.tier} className="flex items-start gap-2.5 p-2 rounded-lg bg-black/30 border border-border/60">
                  <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${row.dot}`} />
                  <div>
                    <strong className={`${row.color} block`}>{row.tier} ({row.range})</strong>
                    {row.perk}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}