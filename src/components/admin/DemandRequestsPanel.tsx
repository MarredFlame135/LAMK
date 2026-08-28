// src/components/admin/DemandRequestsPanel.tsx
//
// Muestra al admin, en vivo, cada búsqueda que un cliente le hizo a TENISIN:
// qué buscó, si se le encontró producto disponible o no, y su WhatsApp si lo
// dejó para que le avisen del restock. Se alimenta de src/hooks/useLeads.ts.

'use client';

import React from 'react';
import { useLeads } from '@/hooks/useLeads';

export function DemandRequestsPanel() {
  const { leads, markNotified, remove } = useLeads();

  const pendingCount = leads.filter((l) => !l.wasMatched && !l.notified).length;

  return (
    <div className="p-5 bg-[#0E0E13] border border-zinc-800 rounded-xl shadow-lg shadow-black/20 space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <h3 className="font-display text-sm font-black uppercase tracking-wider text-zinc-100 flex items-center gap-2">
          PETICIONES DE CLIENTES (TENISIN)
        </h3>
        {pendingCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-900">
            {pendingCount} SIN ATENDER
          </span>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="p-8 border border-dashed border-zinc-800 rounded-lg text-center text-zinc-500 text-xs">
          Aún no hay búsquedas registradas. En cuanto un cliente use el chat de TENISIN, sus peticiones
          (encontradas o no) aparecerán aquí en tiempo real.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-zinc-400 border-b border-zinc-800 font-mono">
              <tr>
                <th className="py-2">BÚSQUEDA DEL CLIENTE</th>
                <th className="py-2">RESULTADO</th>
                <th className="py-2">WHATSAPP</th>
                <th className="py-2">FECHA</th>
                <th className="py-2 text-right">ACCIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-zinc-900/40">
                  <td className="py-3 max-w-[200px]">
                    <p className="font-semibold text-zinc-200 truncate">"{lead.rawQuery || lead.productTitle}"</p>
                    {lead.wasMatched && (
                      <p className="text-[10px] text-zinc-500 truncate">→ {lead.productTitle}</p>
                    )}
                  </td>
                  <td className="py-3">
                    {lead.wasMatched ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 font-bold">
                        ENCONTRADO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 font-bold">
                        SIN STOCK / NO EXISTE
                      </span>
                    )}
                  </td>
                  <td className="py-3 font-mono text-zinc-300">
                    {lead.customerPhone || <span className="text-zinc-600">— no dejó —</span>}
                  </td>
                  <td className="py-3 text-zinc-500 font-mono">
                    {new Date(lead.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 text-right space-x-2">
                    {!lead.wasMatched && lead.customerPhone && (
                      <a
                        href={`https://wa.me/52${lead.customerPhone}?text=${encodeURIComponent(`Hola! Te contactamos de Look At My Kicks MX 🔥 sobre tu búsqueda de "${lead.rawQuery}". ¿Seguimos disponible?`)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => markNotified(lead.id)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded uppercase tracking-wider transition inline-block"
                      >
                        {lead.notified ? 'RE-CONTACTAR' : 'CONTACTAR WA'}
                      </a>
                    )}
                    <button
                      onClick={() => remove(lead.id)}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[10px] rounded uppercase tracking-wider transition"
                    >
                      DESCARTAR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
