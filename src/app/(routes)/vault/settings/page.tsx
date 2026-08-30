// src/app/(routes)/vault/settings/page.tsx

import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { socialProfiles, linkedAccounts } from '@/db/schema';
import { getCustomerProfile } from '@/lib/shopify/customer';
import { getPendingDeletion } from '@/lib/account-deletion';
import { VaultSettingsForm } from '@/components/vault/VaultSettingsForm';

export const dynamic = 'force-dynamic';

export default async function VaultSettingsPage() {
  const token = cookies().get('lamk_customer_token')?.value;
  if (!token) redirect('/auth/login');

  const user = await getCustomerProfile(token);
  if (!user) redirect('/auth/login');

  const db = getDb();
  const [[profile], linked, pending] = await Promise.all([
    db.select().from(socialProfiles).where(eq(socialProfiles.customerId, user.id)).limit(1),
    db.select().from(linkedAccounts).where(eq(linkedAccounts.customerId, user.id)),
    getPendingDeletion(user.id),
  ]);

  return (
    <VaultSettingsForm
      email={user.email}
      profile={
        profile
          ? {
              username: profile.username,
              bio: profile.bio,
              profileVisibility: profile.profileVisibility,
              vaultVisibility: profile.vaultVisibility,
              dateOfBirth: profile.dateOfBirth,
            }
          : null
      }
      linkedProviders={linked.map((l) => l.provider)}
      pendingDeletion={pending ? pending.scheduledFor.toISOString() : null}
    />
  );
}
