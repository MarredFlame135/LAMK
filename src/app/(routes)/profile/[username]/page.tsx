// src/app/(routes)/profile/[username]/page.tsx

import React from 'react';
import { notFound } from 'next/navigation';
import { CollectorVault } from '@/components/vault/CollectorVault';
import { getUserByUsername } from '@/lib/mock-users';

interface ProfilePageProps {
  params: { username: string };
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const user = getUserByUsername(params.username);

  if (!user) {
    notFound();
  }

  return <CollectorVault user={user} username={params.username.replace(/^@/, '').toLowerCase()} isOwnProfile={false} />;
}
