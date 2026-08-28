// src/components/admin/LayawayPanel.tsx
//
// Solicitudes de apartado que TENISIN recolecta en el chat: qué producto,
// qué % dejó el cliente, cuánto es el anticipo en pesos y su WhatsApp.
// Un clic abre WhatsApp con el mensaje ya armado; la nota es editable aquí
// y queda visible tanto para el admin como (a futuro) en el perfil del cliente.

'use client';

import React, { useState } from 'react';
import { useLayaway } from '@/hooks/useLayaway';
import { LayawayStatus } from '@/types/admin';

const STATUS_STYLES: Record<LayawayStatus, string> = {
  PENDING: 'bg-amber-950 text-amber-400 border-amber-900',
  CONTACTED: 'bg-sky-950 text-sky-400 border-sky-900',
  CONFIRMED: 'bg-emerald-950 text-emerald-400 border-emerald-900',
  CANCELLED: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

const STATUS_LABELS: Record<LayawayStatus, string> = {
  PENDING: 'PENDIENTE',
  CONTACTED: 'CONTACTADO',
  CONFIRMED: 'CONFIRMADO',
  CANCELLED: 'CANCELADO',
};

function NoteCell({ id, initialNote, onSave }: { id: string; initialNote: string; onSave: (id: string, note: string) => void }) {
  const [value, setValue] = useState(initialNote);
  return (
    <input
      type="text"
      value={value}
      placeholder="Sin comentario..."
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => { if (value !== initialNote) onSave(id, value); }}
      className="w-full min-w-[140px] bg-black border border-zinc-800 rounded px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:border-red-600"
    />
  );
}

export function LayawayPanel() {
  const { layaways, setStatus, setNote, remove } = useLayaway();
  const pendingCount = layaways.filter((l) => l.status === 'PENDING').length;

  return (
    <div className="p-5 bg-[#0E0E13] border border-zinc-800 rounded-xl shadow-lg shadow-black/20 space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <h3 className="font-display text-sm font-black uppercase tracking-wider text-zinc-100 flex items-center gap-2">
          APARTADOS (TENISIN)
        </h3>
        {pendingCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-900">
            {pendingCount} SIN CONTACTAR
          </span>
        )}
      </div>

      {layaways.length === 0 ? (
        <div className="p-8 border border-dashed border-zinc-800 rounded-lg text-center text-zinc-400 text-xs">
          Aún no hay apartados. En cuanto un cliente aparte un par con TENISIN, la solicitud
          (producto, % y anticipo) aparecerá aquí con su WhatsApp listo para contactar.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-zinc-400 border-b border-zinc-800 font-mono">
              <tr>
                <th className="py-2">PRODUCTO</th>
                <th className="py-2">ANTICIPO</th>
                <th className="py-2">WHATSAPP</th>
                <th className="py-2">NOTA</th>
                <th className="py-2">ESTATUS</th>
                <th className="py-2 text-right">ACCIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {layaways.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-900/40 align-top">
                  <td className="py-3 max-w-[220px]">
                    <div className="flex items-center gap-2">
                      {l.productImage && (
                        <div className="w-9 h-9 rounded bg-black overflow-hidden shrink-0 border border-zinc-800">
                          <img src={l.productImage} alt={l.productTitle} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-200 truncate">{l.productTitle}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          Talla {l.requestedSize} · HEAT {l.hypeScore}%
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 font-mono">
                    <p className="text-emerald-400 font-bold">${l.depositAmount.toLocaleString()} MXN</p>
                    <p className="text-[10px] text-zinc-400">{l.percentage}% de ${l.totalPrice.toLocaleString()}</p>
                  </td>
                  <td className="py-3 font-mono text-zinc-300">{l.customerPhone}</td>
                  <td className="py-3">
                    <NoteCell id={l.id} initialNote={l.note} onSave={setNote} />
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${STATUS_STYLES[l.status]}`}>
                      {STATUS_LABELS[l.status]}
                    </span>
                  </td>
                  <td className="py-3 text-right space-y-1">
                    <a
                      href={`https://wa.me/52${l.customerPhone}?text=${encodeURIComponent(`Hola! Te contactamos de Look At My Kicks MX 🔥 sobre tu apartado de "${l.productTitle}" (talla ${l.requestedSize}). Tu anticipo del ${l.percentage}% es de $${l.depositAmount.toLocaleString()} MXN. ¿Seguimos para coordinar el pago?`)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => l.status === 'PENDING' && setStatus(l.id, 'CONTACTED')}
                      className="block px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded uppercase tracking-wider transition"
                    >
                      Escribir WhatsApp
                    </a>
                    <div className="flex justify-end gap-1">
                      {l.status !== 'CONFIRMED' && (
                        <button
                          onClick={() => setStatus(l.id, 'CONFIRMED')}
                          className="px-2 py-1 bg-zinc-800 hover:bg-emerald-900 text-zinc-300 font-bold text-[10px] rounded uppercase transition"
                        >
                          Confirmar
                        </button>
                      )}
                      <button
                        onClick={() => remove(l.id)}
                        className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[10px] rounded uppercase transition"
                      >
                        Descartar
                      </button>
                    </div>
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
