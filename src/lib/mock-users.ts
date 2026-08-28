// src/lib/mock-users.ts
//
// Directorio de coleccionistas usado SOLO por /profile/[username] (perfiles
// públicos de otros coleccionistas) — /vault (tu propio perfil) YA NO usa
// esto, jala tu sesión real de Shopify (ver vault/page.tsx).
//
// ⚠️ Corrección (2026-08-27): este archivo tenía una entrada 'dante-medina'
// con 12,400 XP / tier LEGEND que coincide con el nombre real del cliente
// dueño de LAMK — y CollectorVault.tsx la usaba para un "Ranking Global Top
// 5" inventado que se mostraba en TODAS las bóvedas, resaltando esa entrada
// falsa como "(TÚ)" cuando el propio Dante veía su bóveda real. Ya se quitó
// el ranking de CollectorVault.tsx por completo. Este directorio se queda
// (todavía alimenta /profile/[username]) pero un ranking real necesitaría
// un directorio de clientes de verdad, que no existe hoy.

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
