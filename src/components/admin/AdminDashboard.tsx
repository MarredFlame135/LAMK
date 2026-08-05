// src/components/admin/AdminDashboard.tsx

'use client';

import React from 'react';
import { OfflineSalesModule } from './OfflineSalesModule';
import { DemandRequestsPanel } from './DemandRequestsPanel';

export function AdminDashboard() {
  return (
    <div className="space-y-8 bg-[#0A0A0C] text-[#F4F4F0] p-6">

      {/* Banner de Bienvenida Admin */}
      <div className="p-6 bg-gradient-to-r from-red-950/80 via-[#121215] to-[#121215] border border-zinc-800 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-xs font-mono text-red-500 uppercase tracking-widest">// PARETO & DEMAND CONTROL CENTER</span>
          <h1 className="text-3xl font-black uppercase tracking-tight mt-1">DASHBOARD DE OPERACIÓN E INTELIGENCIA</h1>
        </div>
        <div className="text-right font-mono text-xs text-zinc-400">
          <span>IA PIPELINE STATUS: </span>
          <strong className="text-emerald-400">ONLINE 🟢</strong>
        </div>
      </div>

      {/* Peticiones capturadas por TENISIN (búsquedas atendidas y no atendidas) */}
      <DemandRequestsPanel />

      {/* Módulo de Ventas Offline, Deudas y Publicación Masiva */}
      <OfflineSalesModule />

    </div>
  );
}