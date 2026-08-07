// src/components/admin/AdminDashboard.tsx

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { OfflineSalesModule } from './OfflineSalesModule';
import { DemandRequestsPanel } from './DemandRequestsPanel';
import { AnalyticsPanel } from './AnalyticsPanel';
import { InventoryManager } from './InventoryManager';

export function AdminDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div className="space-y-8 bg-[#0A0A0C] text-[#F4F4F0] p-6">

      {/* Banner de Bienvenida Admin */}
      <div className="p-6 bg-gradient-to-r from-red-950/80 via-[#121215] to-[#121215] border border-zinc-800 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-xs font-mono text-red-500 uppercase tracking-widest">// PARETO & DEMAND CONTROL CENTER</span>
          <h1 className="text-3xl font-black uppercase tracking-tight mt-1">DASHBOARD DE OPERACIÓN E INTELIGENCIA</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right font-mono text-xs text-zinc-400">
            <span>IA PIPELINE STATUS: </span>
            <strong className="text-emerald-400">ONLINE 🟢</strong>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase tracking-widest rounded transition"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Dashboard Analítico Dinámico: ventas físicas, más deseados, demanda de agotados */}
      <AnalyticsPanel />

      {/* Peticiones capturadas por TENISIN (búsquedas atendidas y no atendidas) */}
      <DemandRequestsPanel />

      {/* Alta y baja de inventario */}
      <InventoryManager />

      {/* Módulo de Ventas Offline, Deudas y Publicación Masiva */}
      <OfflineSalesModule />

    </div>
  );
}