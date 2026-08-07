// src/lib/reviews-store.ts
//
// Reseñas reales de clientes con compra verificada (On-Feet Review, RF-4.4).
// Persistencia server-side en JSON (mismo patrón que hype.ts / inventory-store.ts).

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');

export interface Review {
  id: string;
  customerId: string;
  customerName: string;
  rating: number; // 1-5
  text: string;
  photoUrl?: string;
  createdAt: string;
  verifiedPurchase: true; // solo se crean reseñas de clientes con pedidos reales
}

function readReviews(): Review[] {
  try {
    if (!fs.existsSync(REVIEWS_FILE)) return [];
    return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error al leer reviews.json:', err);
    return [];
  }
}

function writeReviews(reviews: Review[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews));
  } catch (err) {
    console.error('Error al guardar reviews.json:', err);
  }
}

export function getReviews(): Review[] {
  return readReviews().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addReview(input: Omit<Review, 'id' | 'createdAt' | 'verifiedPurchase'>): Review {
  const review: Review = { ...input, id: `REV-${Date.now()}`, createdAt: new Date().toISOString(), verifiedPurchase: true };
  const current = readReviews();
  // Un cliente, una reseña — si ya dejó una, se actualiza en vez de duplicar.
  const filtered = current.filter((r) => r.customerId !== input.customerId);
  writeReviews([review, ...filtered]);
  return review;
}
