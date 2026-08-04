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
  xp: number;                        // 1 MXN gastado = 1 XP
  tier: CollectorTier;
  rankPosition?: number;             // Posición en el ranking global
  collection: CollectionItem[];       // Bóveda de pares comprados
  ordersCount: number;
  totalSpent: number;
}

export interface LeaderboardEntry {
  position: number;
  username: string;
  xp: number;
  tier: CollectorTier;
  isCurrentUser?: boolean;
}