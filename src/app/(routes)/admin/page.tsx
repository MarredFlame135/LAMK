// src/app/(routes)/admin/page.tsx
//
// Fase D.2/D.3: "Panel de Mando" — el nuevo punto de entrada real del
// admin (antes /admin no tenía page.tsx propio; todo vivía en
// /admin/offline-sales, un nombre de ruta que ya no describe lo que hay
// ahí). Ese panel operativo (ventas offline, clientes, inventario,
// apartados) sigue existiendo tal cual — se enlaza desde aquí, no se
// duplicó ni se movió.

import React from 'react';
import { getDashboardFinance } from '@/lib/shopify/finance';
import { getStoreCustomersWithXp } from '@/lib/shopify/admin';
import { AdminCustomer } from '@/types/admin';
import { AdminOverview } from '@/components/admin/AdminOverview';

export const dynamic = 'force-dynamic'; // pedidos en vivo, nunca cacheado

export default async function AdminOverviewPage() {
  const [finance, customers] = await Promise.all([
    getDashboardFinance(),
    getStoreCustomersWithXp(250).catch((): AdminCustomer[] => []),
  ]);

  const xpOutstanding = customers.reduce((sum, c) => sum + c.xp, 0);
  const financeWithXp = finance ? { ...finance, xpOutstanding } : null;

  return (
    <div className="p-6 bg-background text-foreground space-y-6">
      <div className="border-b border-border pb-4">
        <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// PANEL DE MANDO</span>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight mt-1">Look At My Kicks MX</h1>
      </div>

      <AdminOverview finance={financeWithXp} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/admin/offline-sales', label: 'Operación diaria', desc: 'Ventas offline, clientes, apartados, inventario' },
          { href: '/admin/finanzas', label: 'Finanzas', desc: 'Margen por categoría, capital inmovilizado, proyección' },
          { href: '/admin/inventario', label: 'Inventario y productos', desc: 'Rotación, antigüedad, señal de reposición' },
          { href: '/admin/clientes', label: 'Clientes', desc: 'Segmentación RFM, cohortes, ficha 360°' },
          { href: '/vault/pass', label: 'Mi Collector Pass', desc: 'QR de admin, mismo sistema que clientes' },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="p-4 bg-card border border-border rounded-lg hover:border-zinc-600 transition"
          >
            <p className="text-xs font-bold uppercase tracking-wide">{link.label}</p>
            <p className="text-[10px] text-zinc-500 mt-1">{link.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
