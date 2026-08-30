// src/app/api/admin/customers/route.ts
//
// Pestaña "Clientes" del Admin Dashboard (Fase 4): une clientes reales de
// Shopify (Admin API, si SHOPIFY_ADMIN_API_ACCESS_TOKEN está configurado —
// ver lib/shopify/admin.ts) con contactos que TENISIN ya capturó por
// WhatsApp (leads/apartados) pero que todavía no tienen cuenta Shopify, y
// les cruza sus apartados activos por teléfono.
//
// Protegido por src/middleware.ts (matcher incluye /api/admin/:path*).

import { NextResponse } from 'next/server';
import { getStoreCustomersWithXp, isAdminApiConfigured } from '@/lib/shopify/admin';
import { getLayaways } from '@/lib/layaway-store';
import { getLeads } from '@/lib/leads-store';
import { AdminCustomer, AdminCustomerDetail } from '@/types/admin';

// Sin esto, Next puede optimizar esta ruta como estática en build (si en ese
// momento el Admin API no está configurado, no hay ninguna señal dinámica
// que detectar) y serviría la misma respuesta cacheada en cada request en
// vez de leer leads/apartados/clientes en vivo.
export const dynamic = 'force-dynamic';

export async function GET() {
  const shopifyCustomers = await getStoreCustomersWithXp(100).catch((err) => {
    console.error('Error trayendo clientes de Shopify Admin API:', err);
    return [] as AdminCustomer[];
  });

  const layaways = getLayaways();
  const leads = getLeads();
  const knownPhones = new Set(shopifyCustomers.map((c) => c.phone).filter(Boolean));

  // Teléfonos que aparecen en apartados/leads pero sin cuenta Shopify conocida
  // todavía: se listan como LEAD_ONLY para no perder de vista a nadie que ya
  // mostró intención de compra real con TENISIN.
  const leadOnlyPhones = new Set<string>();
  for (const l of layaways) if (l.customerPhone && !knownPhones.has(l.customerPhone)) leadOnlyPhones.add(l.customerPhone);
  for (const l of leads) if (l.customerPhone && !knownPhones.has(l.customerPhone)) leadOnlyPhones.add(l.customerPhone);

  const leadOnlyCustomers: AdminCustomer[] = Array.from(leadOnlyPhones).map((phone) => ({
    id: `lead-${phone}`,
    name: 'Contacto sin cuenta registrada',
    email: '',
    phone,
    xp: 0,
    tier: 'ROOKIE',
    ordersCount: 0,
    totalSpent: 0,
    lastOrderDate: null,
    source: 'LEAD_ONLY',
  }));

  const layawaysByPhone = new Map<string, typeof layaways>();
  for (const l of layaways) {
    if (!l.customerPhone) continue;
    if (!layawaysByPhone.has(l.customerPhone)) layawaysByPhone.set(l.customerPhone, []);
    layawaysByPhone.get(l.customerPhone)!.push(l);
  }

  const customers: AdminCustomerDetail[] = [...shopifyCustomers, ...leadOnlyCustomers].map((c) => ({
    ...c,
    layaways: layawaysByPhone.get(c.phone) || [],
  }));

  // Los clientes con más actividad (apartados activos, luego XP) primero.
  customers.sort((a, b) => (b.layaways.length - a.layaways.length) || (b.xp - a.xp));

  return NextResponse.json({ customers, adminApiConfigured: isAdminApiConfigured() });
}
