// src/components/vault/CollectorVault.tsx
//
// Ronda "anima Vault" (2026-08-27): antes era una lista estática — cero
// reveals, cero micro-interacción salvo el tilt de HolographicCard (que ya
// existía). Se suma: entrada en cascada consistente con el resto del sitio
// (fadeUp/staggerContainer, mismos tokens de lib/motion.ts), y un botón real
// de "Flexionar / Compartir" por pieza usando el Web Share API nativo — la
// pieza social que se había quedado pendiente de una ronda anterior.
//
// Ronda "Closet Digital" (2026-09-02): la rejilla uniforme de tarjetas se
// reemplazó por tres salas con arquitectura propia (pedestal / perchero /
// vitrina) — ver VaultZones.tsx, que también se lleva el CollectionCard y el
// botón de compartir que vivían aquí. Esta pantalla vuelve a ser lo que debe:
// el armado de la página, no el dibujo de cada pieza.

'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { UserProfile } from '@/types/user';
import { Product } from '@/types/product';
import { MostWantedSection } from './MostWantedSection';
import { VaultZones } from './VaultZones';
import { calculateGamificationTier, computeCollectionIndex } from '@/utils/gamification';
import { useApp } from '@/context/AppContext';
import { Magnetic } from '@/components/ui/Magnetic';
import { ReviewForm } from './ReviewForm';
import { PurchaseClaimForm } from './PurchaseClaimForm';
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
            {/* Fix (reportado 2026-08-30): text-muted-foreground hover:text-white
                es prácticamente invisible en modo claro (gris claro sobre
                fondo claro, y el hover pasaba a BLANCO sobre fondo claro —
                peor todavía). Estos dos links son la única forma de llegar
                a /vault/pass y /vault/settings desde la Bóveda. */}
            <a href="/vault/pass" className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition">
              Mi Pass →
            </a>
            <a href="/vault/settings" className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition">
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
            <h3 className="text-xs font-mono uppercase text-muted-foreground tracking-wider">
              // MI CLOSET ({user.collection.length} {user.collection.length === 1 ? 'PIEZA' : 'PIEZAS'})
            </h3>

            {user.collection.length === 0 ? (
              <div className="p-8 border border-dashed border-border rounded-lg text-center space-y-3">
                <p className="text-muted-foreground text-xs">Aún no tienes pares en tu bóveda. Completa tu primer pedido para desbloquear tu tarjeta digital.</p>
                <Magnetic className="inline-block" strength={0.2}>
                  <a href="/catalog" className="inline-block px-5 py-2.5 bg-[#FF1E42] hover:bg-red-700 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg transition">
                    Ver catálogo →
                  </a>
                </Magnetic>
              </div>
            ) : (
              <VaultZones collection={user.collection} />
            )}
          </div>

          </div>

          {/* "¿Ya has comprado antes? Registrar compra" (pedido directo de
              Dante, 2026-08-30) — solo en tu propia bóveda, panel aparte
              por la misma razón que Most Wanted: aprobar/rechazar no debe
              reordenar visualmente la colección de arriba. */}
          {isOwnProfile && <PurchaseClaimForm />}

          {/* Most Wanted (solo en tu propia bóveda) — panel aparte, no
              dentro de la misma card que Colección/Historial, para que
              quitar/agregar piezas no reordene visualmente lo de arriba. */}
          {isOwnProfile && wishlist && <MostWantedSection initialItems={wishlist} />}

          <div className="bg-card border border-border rounded-xl p-6 space-y-6">

          {/* Historial Real de Pedidos (solo en tu propia bóveda) */}
          {isOwnProfile && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase text-muted-foreground tracking-wider">
                // HISTORIAL DE PEDIDOS
              </h3>
              {!user.recentOrders || user.recentOrders.length === 0 ? (
                <div className="p-6 border border-dashed border-border rounded-lg text-center text-muted-foreground text-xs">
                  Todavía no tienes pedidos registrados en Shopify.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border/80 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="text-muted-foreground font-mono border-b border-border bg-muted">
                      <tr>
                        <th className="py-2 px-3">PEDIDO</th>
                        <th className="py-2 px-3">FECHA</th>
                        <th className="py-2 px-3 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {user.recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-muted transition-colors">
                          <td className="py-2 px-3 font-bold text-foreground">{order.name}</td>
                          <td className="py-2 px-3 text-muted-foreground font-mono">
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
