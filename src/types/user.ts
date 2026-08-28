// src/types/user.ts

import { SizeSystem } from './product';

export type CollectorTier = 'ROOKIE' | 'HYPEBEAST' | 'COLLECTOR' | 'LEGEND';

export interface CollectionItem {
  id: string;
  sneakerTitle: string;
  sku: string;
  serialNumber: string;       // ej. "#004/15"
  purchaseDate: string;
  imageUrl: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
}

export interface UserPreferences {
  preferredBrands: string[];
  favoriteStyles: string[];
  shoeSize: number;
  shoeSizeSystem: SizeSystem;
  apparelSize?: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
}

// Segmentación para CRM/campañas (RF pendiente — hoy solo el tipo, la
// captura real de estos datos todavía no existe en /auth/register ni en el
// checkout, así que en la práctica llega undefined hasta que se agregue esa
// UI. No inventar un valor por defecto en el frontend: si no se preguntó,
// se queda sin segmentar).
export type AgeSegment = 'TEEN_13_17' | 'YOUNG_ADULT_18_24' | 'ADULT_25_34' | 'ADULT_35_PLUS';

// Afinidad de marca real: a diferencia de `preferredBrands` (elegido a mano
// por el usuario en su perfil), esto es un score derivado de comportamiento
// real — vistas y compras — no una preferencia declarada. Se calcula server-side
// (ver lib/segmentation.ts) a partir de CollectionItem[] + historial de vistas;
// nunca se debe inicializar con valores inventados en el cliente.
export interface BrandAffinityScore {
  brand: string;
  score: number;        // 0-100, ponderado: compra > vista repetida > vista única
  purchaseCount: number;
  viewCount: number;
}

export interface CustomerSegment {
  ageSegment?: AgeSegment;
  shoeSize?: number;             // atajo a preferences.shoeSize, para filtrar sin desanidar
  topBrandAffinity: BrandAffinityScore[]; // ordenado desc por score, top 3 típicamente
  tier: CollectorTier;
  xp: number;
}

export interface OrderSummary {
  id: string;
  name: string;         // ej. "#1042"
  date: string;
  total: number;
  currency: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl?: string;
  isRegistered: boolean;
  preferences?: UserPreferences;

  // Módulo de Gamificación & Collector Vault (Costo $0)
  xp: number;                        // $1 MXN gastado = 1 XP, más un bono si el producto tenía Hype (ver calculateHypeXp)
  tier: CollectorTier;
  rankPosition?: number;             // Posición en el ranking global
  collection: CollectionItem[];       // Bóveda de pares comprados
  ordersCount: number;
  totalSpent: number;
  recentOrders?: OrderSummary[];      // Historial real de pedidos (Shopify), opcional (mock no lo trae)

  // Segmentación CRM — opcional a propósito, ver CustomerSegment arriba.
  segment?: CustomerSegment;
}

export interface LeaderboardEntry {
  position: number;
  username: string;
  xp: number;
  tier: CollectorTier;
  isCurrentUser?: boolean;
}