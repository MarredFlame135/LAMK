// src/app/(routes)/vault/page.tsx

import React from 'react';
import { CollectorVault } from '@/components/vault/CollectorVault';

export default function VaultPage() {
  const mockUser = {
    id: 'usr-1',
    email: 'dante@lookatmykicks.mx',
    firstName: 'Dante',
    lastName: 'Medina',
    phone: '5512345678',
    isRegistered: true,
    xp: 12400,
    tier: 'LEGEND' as const,
    ordersCount: 4,
    totalSpent: 12400,
    collection: [
      {
        id: 'c1',
        sneakerTitle: 'HOODIE BAPE SEOUL EXCLUSIVE',
        sku: 'BAPE-SEOUL',
        serialNumber: '#001/15',
        purchaseDate: '2026-08-01',
        imageUrl: 'https://cdn.shopify.com/s/files/1/0776/8984/8114/files/26_205bc3c0-8181-49ae-8b46-b5ac52fd656e.png?v=1781933042',
        rarity: 'LEGENDARY' as const,
      },
    ],
  };

  return <CollectorVault user={mockUser} />;
}