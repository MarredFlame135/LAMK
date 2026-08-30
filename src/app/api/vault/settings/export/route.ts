// src/app/api/vault/settings/export/route.ts
//
// Derecho de Acceso/Portabilidad (ARCO, brief B.4). Un solo JSON con todo
// lo que este proyecto sabe de la persona — su perfil real de Shopify
// (compras, XP, colección) más lo propio de la base de datos (perfil
// social, bóveda pública, wishlist, historial de consentimiento, cuentas
// vinculadas). Nunca se incluye `encryptedPassword` de linked_accounts —
// es un secreto interno del sistema, no un dato personal que la persona
// "tenga" en el sentido de ARCO, y exponerlo sería un riesgo de seguridad
// real sin ningún beneficio para quien pide sus datos.

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { socialProfiles, vaultItems, wishlistItems, consentLog, linkedAccounts } from '@/db/schema';
import { requireCustomer } from '@/lib/social/auth';

export async function GET(request: NextRequest) {
  const user = await requireCustomer(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const db = getDb();
  const [socialProfile, vault, wishlist, consentHistory, linked] = await Promise.all([
    db.select().from(socialProfiles).where(eq(socialProfiles.customerId, user.id)).limit(1),
    db.select().from(vaultItems).where(eq(vaultItems.customerId, user.id)),
    db.select().from(wishlistItems).where(eq(wishlistItems.customerId, user.id)),
    db.select().from(consentLog).where(eq(consentLog.customerId, user.id)),
    db.select().from(linkedAccounts).where(eq(linkedAccounts.customerId, user.id)),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    shopify: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      xp: user.xp,
      tier: user.tier,
      ordersCount: user.ordersCount,
      totalSpent: user.totalSpent,
      collection: user.collection,
      recentOrders: user.recentOrders ?? [],
    },
    perfilSocial: socialProfile[0] ?? null,
    bovedaPublica: vault,
    mostWanted: wishlist.map((w) => ({ productId: w.productId, agregadoEl: w.createdAt })),
    historialDeConsentimiento: consentHistory,
    cuentasVinculadas: linked.map((l) => ({ provider: l.provider, email: l.email, vinculadaEl: l.createdAt })), // sin encryptedPassword
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="lamk-mis-datos-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
