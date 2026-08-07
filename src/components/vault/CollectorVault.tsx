// src/components/vault/CollectorVault.tsx

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { UserProfile, LeaderboardEntry } from '@/types/user';
import { calculateGamificationTier } from '@/utils/gamification';
import { useApp } from '@/context/AppContext';
import { HolographicCard } from '@/components/ui/holographic-card';
import { ReviewForm } from './ReviewForm';

interface CollectorVaultProps {
  user: UserProfile;
  username?: string;       // Slug público (ej. "sneaker_god_mx"), usado para resaltar en el ranking
  isOwnProfile?: boolean;  // false cuando se ve el perfil público de otro coleccionista
}

// Datos de ejemplo para el Ranking Global Top 5 (mismo directorio que src/lib/mock-users.ts)
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { position: 1, username: 'sneaker_god_mx', xp: 18900, tier: 'LEGEND' },
  { position: 2, username: 'hype_valentina', xp: 15200, tier: 'LEGEND' },
  { position: 3, username: 'dante-medina', xp: 12400, tier: 'LEGEND' },
  { position: 4, username: 'kickz_puebla', xp: 9800, tier: 'COLLECTOR' },
  { position: 5, username: 'retro_collector', xp: 7600, tier: 'COLLECTOR' },
];

export function CollectorVault({ user, username, isOwnProfile = true }: CollectorVaultProps) {
  // Curva de progresión geométrica (+30% de dificultad por nivel) — la misma
  // que usa el resto del sistema, en vez de un umbral local desincronizado.
  const tierInfo = calculateGamificationTier(user.xp);
  const { t } = useApp();

  return (
    <div className="max-w-7xl mx-auto p-6 bg-[#0A0A0C] text-[#F4F4F0] space-y-8">

      {/* Header de la Bóveda */}
      <div className="border-b border-zinc-800 pb-4">
        <span className="text-xs font-mono text-[#E60026] uppercase tracking-widest">// THE COLLECTOR VAULT</span>
        <h1 className="text-3xl font-black uppercase tracking-tight mt-1">
          {isOwnProfile ? t.vault.title : `PERFIL DE ${user.firstName.toUpperCase()} ${user.lastName.toUpperCase()}`}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Panel Izquierdo: Tarjeta de Perfil + Experiencia XP + Tarjetas Cromadas */}
        <div className="lg:col-span-7 bg-[#121215] border border-zinc-800 rounded-xl p-6 space-y-6">
          
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
          <div className="space-y-1.5 bg-black/50 p-4 border border-zinc-800/80 rounded-lg">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">{t.vault.xpLabel}</span>
              <span className="text-amber-400 font-bold">
                {user.xp.toLocaleString()} XP {tierInfo.nextTier !== 'HALL_OF_FAME' && `/ ${tierInfo.nextTierXp.toLocaleString()} XP`}
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
              <div className="p-8 border border-dashed border-zinc-800 rounded-lg text-center text-zinc-500 text-xs">
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
                <div className="p-6 border border-dashed border-zinc-800 rounded-lg text-center text-zinc-500 text-xs">
                  Todavía no tienes pedidos registrados en Shopify.
                </div>
              ) : (
                <div className="overflow-x-auto border border-zinc-800/80 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="text-zinc-500 font-mono border-b border-zinc-800 bg-black/40">
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
                          <td className="py-2 px-3 text-right font-mono text-[#E60026] font-bold">
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

        {/* Panel Derecho: Ranking Global (Leaderboard) & Niveles */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Tabla de Ranking Global */}
          <div className="bg-[#121215] border border-zinc-800 rounded-xl p-6 space-y-4">
            <h3 className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
              // {t.vault.rankGlobal}
            </h3>

            <div className="space-y-2">
              {MOCK_LEADERBOARD.map((entry) => {
                const isHighlighted = entry.username === (username || 'dante-medina');
                return (
                  <a
                    key={entry.position}
                    href={`/profile/${entry.username}`}
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs transition ${
                      isHighlighted
                        ? 'bg-red-950/20 border-red-600/50 text-white font-bold'
                        : 'bg-black/40 border-zinc-800/60 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-amber-400 font-bold text-sm">
                        #{entry.position < 10 ? `0${entry.position}` : entry.position}
                      </span>
                      <span>@{entry.username}{isHighlighted && isOwnProfile ? ' (TÚ)' : ''}</span>
                    </div>
                    <span className="font-mono text-zinc-400">{entry.xp.toLocaleString()} XP</span>
                  </a>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">
              El ranking se actualiza en tiempo real con cada compra completada.
            </p>
          </div>

          {/* Explicación de los Niveles (Tiers) */}
          <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-mono text-amber-400 uppercase font-bold tracking-wider">
              BENEFICIOS POR TIER
            </h4>
            <div className="space-y-2 text-xs text-zinc-400">
              <div className="p-2 border-l-2 border-zinc-600 bg-black/30">
                <strong className="text-zinc-200 block">ROOKIE (0 - 2,000 XP)</strong>
                Perfil básico y acceso a la comunidad.
              </div>
              <div className="p-2 border-l-2 border-emerald-500 bg-black/30">
                <strong className="text-emerald-400 block">HYPEBEAST (2,000 - 6,000 XP)</strong>
                Alertas prioritarias de Restock por WhatsApp.
              </div>
              <div className="p-2 border-l-2 border-amber-500 bg-black/30">
                <strong className="text-amber-400 block">COLLECTOR (6,000 - 12,000 XP)</strong>
                Acceso anticipado a Drops (30 min antes).
              </div>
              <div className="p-2 border-l-2 border-red-600 bg-black/30">
                <strong className="text-red-500 block">LEGEND (12,000+ XP)</strong>
                Piezas exclusivas, apartado extendido y eventos VIP.
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}