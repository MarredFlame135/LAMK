// src/app/(routes)/admin/page.tsx
//
// Fase D.2/D.3: "Panel de Mando" — el nuevo punto de entrada real del
// admin (antes /admin no tenía page.tsx propio; todo vivía en
// /admin/offline-sales, un nombre de ruta que ya no describe lo que hay
// ahí). Ese panel operativo (ventas offline, clientes, inventario,
// apartados) sigue existiendo tal cual — se enlaza desde aquí, no se
// duplicó ni se movió.

import React from 'react';
import { cookies } from 'next/headers';
import { getDashboardFinance } from '@/lib/shopify/finance';
import { getStoreCustomersWithXp } from '@/lib/shopify/admin';
import { AdminCustomer } from '@/types/admin';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { verifyAdminSession, getEffectiveRole } from '@/lib/session';

export const dynamic = 'force-dynamic'; // pedidos en vivo, nunca cacheado

export default async function AdminOverviewPage({ searchParams }: { searchParams: { denied?: string } }) {
  const [finance, customers, session] = await Promise.all([
    getDashboardFinance(),
    getStoreCustomersWithXp(250).catch((): AdminCustomer[] => []),
    verifyAdminSession(cookies().get('lamk_admin_session')?.value),
  ]);

  // Fail-closed: si por lo que sea no hay sesión válida aquí (no debería
  // pasar, middleware.ts ya la exige), se trata como el rol más
  // restrictivo — nunca se asume 'admin' por default en este punto.
  const role = session ? getEffectiveRole(session) : 'staff';

  const xpOutstanding = customers.reduce((sum, c) => sum + c.xp, 0);
  const financeWithXp = finance ? { ...finance, xpOutstanding } : null;

  const links = [
    { href: '/admin/offline-sales', label: 'Operación diaria', desc: 'Ventas offline, clientes, apartados, inventario', adminOnly: false },
    { href: '/admin/finanzas', label: 'Finanzas', desc: 'Margen por categoría, capital inmovilizado, proyección', adminOnly: true },
    { href: '/admin/inventario', label: 'Inventario y productos', desc: 'Rotación, antigüedad, señal de reposición', adminOnly: false },
    { href: '/admin/clientes', label: 'Clientes', desc: 'Segmentación RFM, cohortes, ficha 360°', adminOnly: true },
    { href: '/vault/pass', label: 'Mi Collector Pass', desc: 'Tu QR de coleccionista — el mismo que cualquier cliente', adminOnly: false },
  ].filter((link) => role === 'admin' || !link.adminOnly);

  return (
    <div className="p-6 bg-background text-foreground space-y-6">
      <div className="border-b border-border pb-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// PANEL DE MANDO</span>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight mt-1">Look At My Kicks MX</h1>
        </div>
        {role === 'staff' && (
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border rounded-full px-2.5 py-1">Rol: Staff</span>
        )}
      </div>

      {searchParams.denied && (
        <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-lg text-xs text-red-300">
          Tu rol (staff) no tiene acceso a <code className="font-mono">{searchParams.denied}</code>.
        </div>
      )}

      <AdminOverview finance={financeWithXp} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="p-4 bg-card border border-border rounded-lg hover:border-zinc-600 transition"
          >
            <p className="text-xs font-bold uppercase tracking-wide">{link.label}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{link.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
