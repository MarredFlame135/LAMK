// src/app/(routes)/vault/page.tsx

import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CollectorVault } from '@/components/vault/CollectorVault';
import { getCustomerProfile } from '@/lib/shopify/customer';

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

  return <CollectorVault user={user} username={username} isOwnProfile />;
}
