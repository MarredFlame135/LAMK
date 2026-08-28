// src/app/api/catalog/cross-sell/route.ts
//
// "Double Check" — sugerencias de cross-sell para el carrito (agujetas,
// limpiadores, calcetas) antes del checkout. Recibe los IDs de producto que
// ya están en el carrito (?productIds=gid1,gid2) — NO nombres de marca desde
// el cliente, porque CartItem no guarda `brand` y adivinarla del título en
// el cliente duplicaría el heurístico de shopify/index.ts. En su lugar el
// servidor busca esos IDs en el catálogo real (misma fuente que Home/
// Catálogo) para leer su `.brand` de verdad, y con eso busca accesorios/ropa
// que la mencionen en el título.
//
// La heurística de "coincide con la marca" es best-effort — no todos los
// accesorios mencionan una marca de tenis en su nombre, así que si no hay
// coincidencia directa se cae a los accesorios/ropa con más Hype del
// catálogo, en vez de devolver 0 resultados.

import { NextResponse } from 'next/server';
import { getCatalogLive } from '@/lib/catalog-source';
import { CrossSellSuggestion } from '@/types/cart';
import { Product } from '@/types/product';

const CROSS_SELL_CATEGORIES: Product['category'][] = ['ACCESSORIES', 'APPAREL'];
const MAX_SUGGESTIONS = 3;

function toSuggestion(p: Product, matchedBrand: string): CrossSellSuggestion {
  return {
    productId: p.id,
    handle: p.handle,
    title: p.title,
    image: p.images[0] || '/placeholder-sneaker.svg',
    price: p.variants[0]?.price ?? 0,
    matchedBrand,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cartProductIds = (searchParams.get('productIds') || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  const { products } = await getCatalogLive();

  // Marcas reales de lo que ya está en el carrito (no adivinadas en el cliente).
  const brands = Array.from(
    new Set(
      products
        .filter((p) => cartProductIds.includes(p.id))
        .map((p) => p.brand)
    )
  );

  const candidates = products.filter(
    (p) => CROSS_SELL_CATEGORIES.includes(p.category) && !p.isSoldOut && !cartProductIds.includes(p.id)
  );

  const suggestions: CrossSellSuggestion[] = [];

  // 1) Match directo: el título del accesorio menciona una de las marcas del carrito.
  for (const brand of brands) {
    const match = candidates.find(
      (p) =>
        p.title.toLowerCase().includes(brand.toLowerCase()) &&
        !suggestions.some((s) => s.productId === p.id)
    );
    if (match) suggestions.push(toSuggestion(match, brand));
    if (suggestions.length >= MAX_SUGGESTIONS) break;
  }

  // 2) Relleno: si no hubo suficientes matches por marca, completa con los
  //    accesorios/ropa de mayor Hype real (nunca inventa productos).
  if (suggestions.length < MAX_SUGGESTIONS) {
    const fallback = [...candidates]
      .filter((p) => !suggestions.some((s) => s.productId === p.id))
      .sort((a, b) => b.hypeMeter.score - a.hypeMeter.score);

    for (const p of fallback) {
      if (suggestions.length >= MAX_SUGGESTIONS) break;
      suggestions.push(toSuggestion(p, brands[0] || p.brand));
    }
  }

  return NextResponse.json({ suggestions });
}
