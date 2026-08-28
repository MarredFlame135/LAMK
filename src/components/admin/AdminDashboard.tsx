// src/components/admin/AdminDashboard.tsx

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { OfflineSalesModule } from './OfflineSalesModule';
import { DemandRequestsPanel } from './DemandRequestsPanel';
import { LayawayPanel } from './LayawayPanel';
import { AnalyticsPanel } from './AnalyticsPanel';
import { InventoryManager } from './InventoryManager';
import { ClientsPanel } from './ClientsPanel';
import { AdminAccessPanel } from './AdminAccessPanel';
import { fadeUp, staggerContainer } from '@/lib/motion';

// Ronda "subir el nivel visual" 2026-08-27: antes este panel tenía colores
// fijos en hex (bg-[#050507]) en vez de los tokens del sitio (bg-background/
// text-foreground) — por eso se sentía "congelado" aunque el resto del sitio
// hubiera cambiado. Ahora hereda el mismo sistema de tema (light/dark) y la
// misma curva de entrada (fadeUp/EASE_LUXURY) que Home y el catálogo.

export function AdminDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="show"
      className="space-y-8 bg-background text-foreground p-6"
    >

      {/* Banner de Bienvenida Admin — misma textura "Obsidian Quarry" del Hero,
          para que el panel admin comparta la misma pieza visual real que el
          resto del sitio en vez de solo un gradiente liso. */}
      <motion.div variants={fadeUp} className="relative overflow-hidden p-6 bg-gradient-to-r from-red-950/30 via-card to-card border border-border rounded-2xl flex items-center justify-between flex-wrap gap-4">
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: "url('/assets/hero/obsidian-texture.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          aria-hidden
        />
        <div className="relative">
          <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// PARETO & DEMAND CONTROL CENTER</span>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight mt-1">DASHBOARD DE OPERACIÓN E INTELIGENCIA</h1>
        </div>
        <div className="relative flex items-center gap-4">
          <div className="text-right font-mono text-xs text-muted-foreground">
            <span>IA PIPELINE STATUS: </span>
            <strong className="text-emerald-400">ONLINE 🟢</strong>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-muted hover:bg-border text-muted-foreground text-[10px] font-bold uppercase tracking-widest rounded transition"
          >
            Cerrar sesión
          </button>
        </div>
      </motion.div>

      {/* Dashboard Analítico Dinámico: ventas físicas, más deseados, demanda de agotados */}
      <motion.div variants={fadeUp}><AdminAccessPanel /></motion.div>

      <motion.div variants={fadeUp}><AnalyticsPanel /></motion.div>

      {/* Peticiones capturadas por TENISIN (búsquedas atendidas y no atendidas) */}
      <motion.div variants={fadeUp}><DemandRequestsPanel /></motion.div>

      {/* Apartados de TENISIN: producto, % de anticipo y WhatsApp listo para contactar */}
      <motion.div variants={fadeUp}><LayawayPanel /></motion.div>

      {/* Clientes: nivel XP, apartados activos, historial de abonos y recordatorio por WhatsApp */}
      <motion.div variants={fadeUp}><ClientsPanel /></motion.div>

      {/* Alta y baja de inventario */}
      <motion.div variants={fadeUp}><InventoryManager /></motion.div>

      {/* Módulo de Ventas Offline, Deudas y Publicación Masiva */}
      <motion.div variants={fadeUp}><OfflineSalesModule /></motion.div>

    </motion.div>
  );
}