// src/app/(routes)/vault/page.tsx

import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CollectorVault } from '@/components/vault/CollectorVault';
import { getCustomerProfile } from '@/lib/shopify/customer';
import { getWishlistProducts } from '@/lib/wishlist';

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

  return <CollectorVault user={user} username={username} wishlist={wishlist} isOwnProfile />;
}
