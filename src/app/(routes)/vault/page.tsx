// src/app/(routes)/vault/page.tsx

import React from 'react';
import { CollectorVault } from '@/components/vault/CollectorVault';
import { MOCK_USERS } from '@/lib/mock-users';

export default function VaultPage() {
  // TODO: cuando exista sesión real, sustituir por el usuario autenticado.
  const currentUser = MOCK_USERS['dante-medina'];

  return <CollectorVault user={currentUser} username="dante-medina" isOwnProfile />;
}
