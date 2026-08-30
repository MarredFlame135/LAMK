// src/components/admin/ClientsPanel.tsx
//
// Fase 4 — pestaña "Clientes & Adelanto de Pagos / Apartados": une clientes
// reales de Shopify (si hay Admin API token configurado) con contactos que
// TENISIN ya capturó por WhatsApp, muestra su nivel XP, sus apartados
// activos y un historial de abonos con fecha y monto — con botón directo de
// WhatsApp para recordatorio/recibo.

'use client';

import React, { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { LayawayRequest } from '@/types/admin';

const TIER_STYLES: Record<string, string> = {
  ROOKIE: 'bg-zinc-800 text-foreground border-zinc-700',
  HYPEBEAST: 'bg-sky-950 text-sky-400 border-sky-900',
  COLLECTOR: 'bg-violet-950 text-violet-400 border-violet-900',
  LEGEND: 'bg-amber-950 text-amber-400 border-amber-900',
};

function whatsAppReceiptMessage(customerName: string, layaway: LayawayRequest): string {
  const paid = layaway.paymentNotes.reduce((acc, p) => acc + p.amount, 0);
  const remaining = Math.max(0, layaway.totalPrice - paid);
  return (
    `Hola ${customerName !== 'Contacto sin cuenta registrada' ? customerName : ''}! 🔥 Te escribimos de Look At My Kicks MX sobre tu apartado de ` +
    `"${layaway.productTitle}" (talla ${layaway.requestedSize}).\n` +
    `Total: $${layaway.totalPrice.toLocaleString()} MXN · Abonado: $${paid.toLocaleString()} MXN · Restante: $${remaining.toLocaleString()} MXN.\n` +
    `¿Seguimos para coordinar tu próximo abono?`
  );
}

function PaymentNoteForm({ layawayId, onSave }: { layawayId: string; onSave: (id: string, amount: number, note: string) => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const submit = () => {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) return;
    onSave(layawayId, parsed, note);
    setAmount('');
    setNote('');
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <input
        type="number"
        min="1"
        placeholder="Monto MXN"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-24 bg-muted border border-border rounded px-2 py-1 text-[11px] text-foreground outline-none focus:border-red-600"
      />
      <input
        type="text"
        placeholder="Nota (ej. transferencia, efectivo...)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="flex-1 min-w-[140px] bg-muted border border-border rounded px-2 py-1 text-[11px] text-foreground outline-none focus:border-red-600"
      />
      <button
        onClick={submit}
        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase rounded transition"
      >
        + Registrar abono
      </button>
    </div>
  );
}

export function ClientsPanel() {
  const { customers, adminApiConfigured, isLoading, addPaymentNote } = useClients();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="p-5 bg-card border border-border rounded-xl shadow-lg shadow-black/20 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="font-display text-sm font-black uppercase tracking-wider text-zinc-100 flex items-center gap-2">
          CLIENTES & ADELANTO DE PAGOS / APARTADOS
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground">{customers.length} cliente(s)</span>
      </div>

      {!adminApiConfigured && (
        <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded text-[11px] text-amber-400 leading-relaxed">
          ⚠️ Solo se muestran contactos capturados por TENISIN (leads/apartados) — el token de{' '}
          <strong>Shopify Admin API</strong> no está configurado, así que no se puede listar la base completa de
          clientes con cuenta. Agrega <code className="font-mono">SHOPIFY_ADMIN_API_ACCESS_TOKEN</code> y{' '}
          <code className="font-mono">SHOPIFY_ADMIN_API_STORE_DOMAIN</code> en <code className="font-mono">.env.local</code>{' '}
          (Shopify Admin → Apps y canales de venta → Desarrollo de apps → scopes{' '}
          <code className="font-mono">read_customers</code>/<code className="font-mono">read_orders</code>) para activarlo.
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground text-xs">Cargando clientes...</div>
      ) : customers.length === 0 ? (
        <div className="p-8 border border-dashed border-border rounded-lg text-center text-muted-foreground text-xs">
          Aún no hay clientes ni contactos capturados.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground border-b border-border font-mono">
              <tr>
                <th className="py-2">CLIENTE</th>
                <th className="py-2">WHATSAPP</th>
                <th className="py-2">NIVEL XP</th>
                <th className="py-2">APARTADOS ACTIVOS</th>
                <th className="py-2 text-right">ACCIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {customers.map((c) => {
                const isExpanded = expandedId === c.id;
                const activeLayaways = c.layaways.filter((l) => l.status !== 'CANCELLED');
                return (
                  <React.Fragment key={c.id}>
                    <tr className="hover:bg-muted align-top">
                      <td className="py-3 max-w-[200px]">
                        <p className="font-semibold text-foreground truncate">{c.name}</p>
                        {c.email && <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>}
                        {c.source === 'LEAD_ONLY' && (
                          <span className="text-[9px] text-muted-foreground font-mono uppercase">Sin cuenta Shopify</span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-foreground">{c.phone || '—'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${TIER_STYLES[c.tier]}`}>
                          {c.tier}
                        </span>
                        <p className="text-[10px] text-muted-foreground font-mono mt-1">{c.xp.toLocaleString()} XP</p>
                      </td>
                      <td className="py-3">
                        {activeLayaways.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-900">
                            {activeLayaways.length} activo(s)
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {activeLayaways.length > 0 && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-foreground font-bold text-[10px] rounded uppercase transition"
                          >
                            {isExpanded ? 'Ocultar' : 'Ver abonos'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {isExpanded && activeLayaways.map((l) => (
                      <tr key={l.id} className="bg-muted">
                        <td colSpan={5} className="py-3 px-3">
                          <div className="flex flex-col gap-2 border border-border rounded-lg p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-foreground font-semibold">
                                {l.productTitle} <span className="text-muted-foreground font-normal">· talla {l.requestedSize}</span>
                              </p>
                              <a
                                href={`https://wa.me/52${c.phone}?text=${encodeURIComponent(whatsAppReceiptMessage(c.name, l))}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded uppercase tracking-wider transition"
                              >
                                Enviar recordatorio / recibo WhatsApp
                              </a>
                            </div>

                            <p className="text-[10px] font-mono text-muted-foreground">
                              Total ${l.totalPrice.toLocaleString()} MXN · Anticipo pactado ${l.depositAmount.toLocaleString()} MXN ({l.percentage}%)
                              {' · Abonado hasta ahora: '}
                              <strong className="text-emerald-400">
                                ${l.paymentNotes.reduce((acc, p) => acc + p.amount, 0).toLocaleString()} MXN
                              </strong>
                            </p>

                            {l.paymentNotes.length > 0 && (
                              <ul className="space-y-1 text-[11px]">
                                {l.paymentNotes.map((p) => (
                                  <li key={p.id} className="flex justify-between text-muted-foreground border-b border-zinc-900 pb-1">
                                    <span>{p.note || 'Abono sin nota'}</span>
                                    <span className="font-mono text-foreground">
                                      ${p.amount.toLocaleString()} MXN · {new Date(p.date).toLocaleDateString('es-MX')}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}

                            <PaymentNoteForm layawayId={l.id} onSave={addPaymentNote} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
