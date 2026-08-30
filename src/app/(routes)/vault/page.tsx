// src/app/(routes)/vault/page.tsx

import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CollectorVault } from '@/components/vault/CollectorVault';
import { getCustomerProfile } from '@/lib/shopify/customer';
import { getWishlistProducts } from '@/lib/wishlist';
import { getApprovedClaimsAsCollectionItems } from '@/lib/vault-claims';

export const dynamic = 'force-dynamic';

export default async function VaultPage() {
  const token = cookies().get('lamk_customer_token')?.value;

  if (!token) {
    redirect('/auth/login');
  }

  const user = await getCustomerProfile(token);

  if (!user) {
    redirect('/auth/login');
  }

  const username = user.email.split('@')[0];
  // Most Wanted (Fase B) — server-side, mismo patrón que el resto de la
  // página; solo en la propia bóveda, nunca en /profile/[username] (no hay
  // un control de privacidad diseñado todavía para la wishlist de otros).
  const wishlist = await getWishlistProducts(user.id);

  // Reclamos de compra manual aprobados por un admin (pedido de Dante,
  // 2026-08-30, ver lib/vault-claims.ts) — se fusionan con la colección
  // real de Shopify. Nunca se mutan las piezas reales, solo se agregan al
  // final; CollectionCard las distingue visualmente (item.source === 'manual').
  const approvedClaims = await getApprovedClaimsAsCollectionItems(user.id);
  const userWithClaims = approvedClaims.length > 0
    ? { ...user, collection: [...user.collection, ...approvedClaims] }
    : user;

  return <CollectorVault user={userWithClaims} username={username} wishlist={wishlist} isOwnProfile />;
}
