// src/lib/mock-users.ts
//
// Directorio de coleccionistas usado por /vault (perfil propio) y
// /profile/[username] (perfiles públicos). Mientras no hay backend de
// usuarios real, esto sustituye a una consulta a base de datos por username.
// Las mismas entradas alimentan el Top 5 que se muestra en CollectorVault.

import { UserProfile } from '@/types/user';

export const MOCK_USERS: Record<string, UserProfile> = {
  'dante-medina': {
    id: 'usr-1',
    email: 'dante@lookatmykicks.mx',
    firstName: 'Dante',
    lastName: 'Medina',
    phone: '5512345678',
    isRegistered: true,
    xp: 12400,
    tier: 'LEGEND',
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
        rarity: 'LEGENDARY',
      },
    ],
  },
  'sneaker_god_mx': {
    id: 'usr-2',
    email: 'sneakergod@lookatmykicks.mx',
    firstName: 'Sneaker',
    lastName: 'God',
    phone: '5511111111',
    isRegistered: true,
    xp: 18900,
    tier: 'LEGEND',
    ordersCount: 9,
    totalSpent: 18900,
    collection: [
      {
        id: 'c2',
        sneakerTitle: 'AIR JORDAN 1 RETRO HIGH OG LOST & FOUND',
        sku: 'AJ1-LNF',
        serialNumber: '#002/15',
        purchaseDate: '2026-07-20',
        imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1200&q=80',
        rarity: 'LEGENDARY',
      },
    ],
  },
  'hype_valentina': {
    id: 'usr-3',
    email: 'valentina@lookatmykicks.mx',
    firstName: 'Valentina',
    lastName: 'Ruiz',
    phone: '5522222222',
    isRegistered: true,
    xp: 15200,
    tier: 'LEGEND',
    ordersCount: 7,
    totalSpent: 15200,
    collection: [
      {
        id: 'c3',
        sneakerTitle: 'HOODIE SP5DER RHINESTONE PINK',
        sku: 'SP5-RHINE-PNK',
        serialNumber: '#004/15',
        purchaseDate: '2026-07-15',
        imageUrl: 'https://cdn.shopify.com/s/files/1/0776/8984/8114/files/24_f656e803-a20d-4356-95f8-b1f5c1b94971.png?v=1783829402',
        rarity: 'RARE',
      },
    ],
  },
  'kickz_puebla': {
    id: 'usr-4',
    email: 'kickzpuebla@lookatmykicks.mx',
    firstName: 'Kickz',
    lastName: 'Puebla',
    phone: '5533333333',
    isRegistered: true,
    xp: 9800,
    tier: 'COLLECTOR',
    ordersCount: 5,
    totalSpent: 9800,
    collection: [],
  },
  'retro_collector': {
    id: 'usr-5',
    email: 'retro@lookatmykicks.mx',
    firstName: 'Retro',
    lastName: 'Collector',
    phone: '5544444444',
    isRegistered: true,
    xp: 7600,
    tier: 'COLLECTOR',
    ordersCount: 3,
    totalSpent: 7600,
    collection: [],
  },
};

export function getUserByUsername(username: string): UserProfile | undefined {
  const slug = username.replace(/^@/, '').toLowerCase();
  return MOCK_USERS[slug];
}
