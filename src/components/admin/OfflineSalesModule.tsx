// src/components/admin/OfflineSalesModule.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { OfflineSale } from '@/types/admin';

export function OfflineSalesModule() {
  const [sales, setSales] = useState<OfflineSale[]>([]);

  // Ventas físicas reales del servidor (data/offline-sales.json) — antes
  // vivían en localStorage y no sincronizaban entre el celular y la
  // computadora del admin, ni con nadie más que abriera el panel.
  const loadSales = () => {
    fetch('/api/admin/sales').then((r) => r.json()).then((d) => setSales(d.sales || []));
  };
  useEffect(() => { loadSales(); }, []);

  // Formulario para nueva venta física
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    itemsSummary: '',
    totalAmount: '',
    amountPaid: '',
    dueDate: '',
  });

  const [isPublishingSocial, setIsPublishingSocial] = useState(false);

  // Cálculo de deuda total en el sistema
  const totalDebt = sales.reduce((acc, sale) => acc + sale.pendingBalance, 0);

  // Registrar nueva venta en tienda (servidor — ver src/lib/sales-store.ts)
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(form.totalAmount) || 0;
    const paid = parseFloat(form.amountPaid) || 0;

    await fetch('/api/admin/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        itemsSummary: form.itemsSummary,
        totalAmount: total,
        amountPaid: paid,
        dueDate: form.dueDate,
      }),
    });

    loadSales();
    setForm({ customerName: '', customerPhone: '', itemsSummary: '', totalAmount: '', amountPaid: '', dueDate: '' });
    alert('¡Venta física registrada correctamente!');
  };

  // Disparar mensaje de recordatorio de cobro por WhatsApp
  const handleSendWhatsAppReminder = (sale: OfflineSale) => {
    const message = `Hola ${sale.customerName}, te saludamos de Look At My Kicks MX 🔥. Te recordamos que tienes un saldo pendiente de $${sale.pendingBalance.toLocaleString()} MXN por tu pedido "${sale.itemsSummary}". Puedes saldarlo mediante transferencia o en el siguiente link de pago seguro: https://lookatmykicksmx.com/pay/${sale.id}`;
    const whatsappUrl = `https://wa.me/52${sale.customerPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Accionar Publicación Masiva a Redes Sociales (RF-09)
  const handleSocialPush = async () => {
    setIsPublishingSocial(true);
    try {
      const res = await fetch('/api/social-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productTitle: 'NUEVO DROP EXCLUSIVO',
          imageUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3',
          price: '6,500',
          productLink: 'https://lookatmykicksmx.com/catalog',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('🚀 ¡DROP PUBLICADO EXITOSAMENTE EN INSTAGRAM Y FACEBOOK!');
      }
    } catch (err) {
      console.error('Error al publicar:', err);
    } finally {
      setIsPublishingSocial(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-[#050507] text-[#FFFFFF] min-h-screen space-y-8">
      
      {/* Header Admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">ADMIN CONTROL CENTER</span>
          </div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight mt-1">VENTAS OFFLINE & CONTROL DE DEUDAS</h1>
        </div>

        {/* Botón de Publicación Masiva (RF-09) */}
        <button
          onClick={handleSocialPush}
          disabled={isPublishingSocial}
          className="px-6 py-3 bg-[#FF1E42] hover:bg-red-700 font-black text-xs uppercase tracking-widest rounded shadow-lg shadow-red-900/30 transition flex items-center justify-center gap-2"
        >
          <span>{isPublishingSocial ? 'PUBLICANDO...' : '🚀 PUBLICACIÓN MASIVA (IG / FB / WA)'}</span>
        </button>
      </div>

      {/* Tarjeta Métricas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#0E0E13] border border-zinc-800 rounded-lg">
          <span className="text-xs text-zinc-400 font-mono">SALDO TOTAL PENDIENTE DE COBRO</span>
          <p className="text-2xl font-bold text-[#FF1E42] mt-1">${totalDebt.toLocaleString()} MXN</p>
        </div>
        <div className="p-4 bg-[#0E0E13] border border-zinc-800 rounded-lg">
          <span className="text-xs text-zinc-400 font-mono">VENTAS FÍSICAS REGISTRADAS</span>
          <p className="text-2xl font-bold text-white mt-1">{sales.length}</p>
        </div>
        <div className="p-4 bg-[#0E0E13] border border-zinc-800 rounded-lg">
          <span className="text-xs text-zinc-400 font-mono">ESTADO DE COBRANZA</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">OPTIMO</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulario para Registrar Nueva Venta Físicas */}
        <div className="lg:col-span-1 p-5 bg-[#0E0E13] border border-zinc-800 rounded-lg space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 border-b border-zinc-800 pb-2">
            REGISTRAR VENTA EN TIENDA / DROP
          </h3>
          <form onSubmit={handleCreateSale} className="space-y-3 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">Nombre del Cliente</label>
              <input
                type="text"
                required
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="w-full p-2.5 bg-black border border-zinc-800 rounded text-white focus:border-[#FF1E42] outline-none"
                placeholder="ej. Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Teléfono WhatsApp (10 dígitos)</label>
              <input
                type="tel"
                required
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                className="w-full p-2.5 bg-black border border-zinc-800 rounded text-white focus:border-[#FF1E42] outline-none"
                placeholder="ej. 5512345678"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Detalle del Producto / Talla</label>
              <input
                type="text"
                required
                value={form.itemsSummary}
                onChange={(e) => setForm({ ...form, itemsSummary: e.target.value })}
                className="w-full p-2.5 bg-black border border-zinc-800 rounded text-white focus:border-[#FF1E42] outline-none"
                placeholder="ej. Travis Scott Mocha Talla 27.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-400 mb-1">Precio Total ($)</label>
                <input
                  type="number"
                  required
                  value={form.totalAmount}
                  onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                  className="w-full p-2.5 bg-black border border-zinc-800 rounded text-white focus:border-[#FF1E42] outline-none"
                  placeholder="6500"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Monto Pagado ($)</label>
                <input
                  type="number"
                  required
                  value={form.amountPaid}
                  onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
                  className="w-full p-2.5 bg-black border border-zinc-800 rounded text-white focus:border-[#FF1E42] outline-none"
                  placeholder="3000"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Fecha Límite de Pago</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full p-2.5 bg-black border border-zinc-800 rounded text-white focus:border-[#FF1E42] outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-widest rounded transition mt-2"
            >
              REGISTRAR EN BITÁCORA
            </button>
          </form>
        </div>

        {/* Tabla / Lista de Registro de Deudas */}
        <div className="lg:col-span-2 p-5 bg-[#0E0E13] border border-zinc-800 rounded-lg space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 border-b border-zinc-800 pb-2">
            LIBRO DE SALDOS PENDIENTES & CLIENTES
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-zinc-400 border-b border-zinc-800 font-mono">
                <tr>
                  <th className="py-2">CLIENTE</th>
                  <th className="py-2">PAR / DETALLE</th>
                  <th className="py-2">PENDIENTE</th>
                  <th className="py-2">ESTADO</th>
                  <th className="py-2 text-right">ACCIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-zinc-900/40">
                    <td className="py-3 font-semibold">{sale.customerName}</td>
                    <td className="py-3 text-zinc-400 max-w-[180px] truncate">{sale.itemsSummary}</td>
                    <td className="py-3 font-bold text-[#FF1E42]">
                      ${sale.pendingBalance.toLocaleString()} MXN
                    </td>
                    <td className="py-3">
                      {sale.pendingBalance === 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 font-bold">
                          PAGADO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-red-950 text-red-400 font-bold">
                          DEUDA PENDIENTE
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {sale.pendingBalance > 0 && (
                        <button
                          onClick={() => handleSendWhatsAppReminder(sale)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded uppercase tracking-wider transition"
                        >
                          COBRAR WA 📲
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}