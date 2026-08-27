// src/components/themes/theme2/MarketTicker.tsx
//
// Cinta de "mercado" en la cabecera de After Hours Market. A propósito NO
// inventa variación de precio (%↑/%↓) porque este sistema no guarda
// histórico de precios — mostrar eso sería fabricar un dato que no existe.
// En su lugar usa únicamente señales reales: hypeMeter.label (RF-05, real:
// NORMAL / ALTA DEMANDA / ÚLTIMOS PARES / DROPPED) y, cuando el producto
// SÍ tiene descuento real en Shopify (compareAtPrice > price), el % de
// descuento real — ese es el único "▼" que aparece, y es genuino.

import React from 'react';
import { Product } from '@/types/product';
import { deriveSerial } from '@/lib/utils';

interface MarketTickerProps {
  products: Product[];
}

const LABEL_COLOR: Record<Product['hypeMeter']['label'], string> = {
  'ALTA DEMANDA': 'text-[#1B7A4D] dark:text-[#3FBE85]',
  'ULTIMOS PARES': 'text-[#8F7C50]',
  'DROPPED': 'text-[#B0342B] dark:text-[#E2645A]',
  'NORMAL': 'text-current opacity-70',
};

function TickerEntry({ p }: { p: Product }) {
  const price = p.variants[0]?.price;
  const compareAt = p.variants[0]?.compareAtPrice;
  const hasRealDiscount = compareAt !== undefined && price !== undefined && compareAt > price;
  const discountPct = hasRealDiscount ? Math.round(((compareAt! - price!) / compareAt!) * 100) : null;

  return (
    <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.02em] px-1">
      <span className="opacity-60">{deriveSerial(p)}</span>
      <span className={LABEL_COLOR[p.hypeMeter.label] || 'opacity-70'}>
        {discountPct !== null ? `▼ ${discountPct}% OFF` : `● ${p.hypeMeter.label}`}
      </span>
      {price !== undefined && <span>${price.toLocaleString()}</span>}
    </span>
  );
}

export function MarketTicker({ products }: MarketTickerProps) {
  if (products.length === 0) return null;
  // Se duplica la lista para que el loop de la animación sea continuo (-50%).
  const loop = [...products, ...products];

  return (
    <div className="bg-[#0C0C0D] text-[#F7F5F0] overflow-hidden whitespace-nowrap border-b border-white/10 font-mono">
      <div className="inline-flex gap-10 py-2.5 animate-[marquee_38s_linear_infinite] motion-reduce:animate-none">
        {loop.map((p, i) => (
          <TickerEntry key={`${p.id}-${i}`} p={p} />
        ))}
      </div>
    </div>
  );
}
