// src/components/catalog/ProductCard.tsx
//
// Tarjeta "Vitrina de Museo" (Haute-Tech Luxury Vault) — sin emojis
// informales, vocabulario HUD técnico. Cada señal mostrada sigue siendo un
// dato real del producto, solo cambió el ropaje:
//   - INDEX {score} // VERIFIED ALLOCATION: product.hypeMeter.score (RF-05)
//   - EDITION.../DEADSTOCK (+ puntos ●●○○○, no son emoji): stockRemaining
//   - TERMINAL ACTIVE · N VIEWING: product.hypeMeter.viewsLast24h (real)
// No hay un contador de "vendidos hoy": no existe una señal real por
// producto para eso — ver nota de la ronda de rebrand anterior, sigue vigente.

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Product, ProductVariant, HypeMeterData } from '@/types/product';
import { haptics } from '@/lib/haptics';
import { BOUNCE_TAP, fadeUp } from '@/lib/motion';
import { useApp } from '@/context/AppContext';
import { CountUp } from '@/components/ui/count-up';
import { deriveSerial } from '@/lib/utils';

const MAX_SCARCITY_DOTS = 5;

function ScarcityDots({ stockRemaining }: { stockRemaining: number }) {
  const filled = Math.max(0, Math.min(MAX_SCARCITY_DOTS, stockRemaining));
  return (
    <span className="inline-flex gap-0.5 align-middle" aria-hidden>
      {Array.from({ length: MAX_SCARCITY_DOTS }).map((_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < filled ? 'bg-[#FF1E42]' : 'bg-zinc-700'}`} />
      ))}
    </span>
  );
}

function HypeBadge({ hypeMeter }: { hypeMeter: HypeMeterData }) {
  return (
    <div className="absolute top-2.5 right-2.5 min-w-[7.5rem] px-2.5 py-1.5 rounded-md bg-black/80 backdrop-blur-sm border border-white/10">
      <span className="block text-[11px] font-black font-mono text-white leading-none whitespace-nowrap tracking-wide">
        INDEX {hypeMeter.score.toFixed(1)}
      </span>
      <span className="block text-[7px] font-mono text-[#C5A059] uppercase tracking-[0.2em] mt-0.5 whitespace-nowrap">
        Verified Allocation
      </span>
      <div className="mt-1 h-1 w-full rounded-full bg-white/15 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#FF1E42] to-[#C5A059]"
          initial={{ width: 0 }}
          whileInView={{ width: `${hypeMeter.score}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  index?: number;
  onAddToCart: (product: Product, variant: ProductVariant) => void;
}

export function ProductCard({ product, index = 0, onAddToCart }: ProductCardProps) {
  const { t } = useApp();
  const [justAdded, setJustAdded] = useState(false);
  const defaultVariant = product.variants.find((v) => v.isAvailable) || product.variants[0];
  const stockRemaining = product.hypeMeter.stockRemaining;
  const serial = deriveSerial(product);

  const handleAdd = () => {
    if (!defaultVariant || !defaultVariant.isAvailable) return;
    onAddToCart(product, defaultVariant);
    haptics.success();
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 900);
  };

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      transition={{ ...fadeUp.show.transition, delay: (index % 12) * 0.04 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between group shadow-sm hover:shadow-2xl hover:shadow-black/25 transition-shadow"
    >
      {/* Cabecera técnica — placa de vitrina de museo */}
      <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-2 px-0.5">
        <span>LAMK Vault // Verified</span>
        <span>Serial #{serial}</span>
      </div>

      <a href={`/product/${product.handle}`} className="block">
        {/* Fotografía flotando sobre fondo de estudio neutro, con sombra de oclusión */}
        <div className="relative aspect-square bg-gradient-to-b from-muted to-muted/40 rounded-xl overflow-hidden mb-4">
          <Image
            src={product.images[0] || '/placeholder-sneaker.svg'}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain p-4 drop-shadow-[0_18px_20px_rgba(0,0,0,0.35)] group-hover:scale-[1.02] transition-transform duration-500"
            loading={index < 3 ? 'eager' : 'lazy'}
          />
          {product.isSoldOut && (
            <span className="absolute top-2.5 left-2.5 bg-zinc-800 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              {t.catalogPage.soldOut}
            </span>
          )}
          <HypeBadge hypeMeter={product.hypeMeter} />
        </div>

        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">{product.brand}</span>
        <h3 className="font-display text-sm font-bold uppercase mt-0.5 line-clamp-1">{product.title}</h3>

        {/* Indicador de escasez real */}
        {!product.isSoldOut && (
          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.15em] mt-1.5 flex items-center gap-1.5">
            {stockRemaining <= 1 ? (
              <span className="text-[#FF1E42] font-bold">Edition 01/01 · Deadstock</span>
            ) : (
              <span>Deadstock · {stockRemaining} Units Allocated</span>
            )}
            <ScarcityDots stockRemaining={stockRemaining} />
          </p>
        )}

        {/* Ticker de prueba social — solo vistas reales */}
        {product.hypeMeter.viewsLast24h > 0 && (
          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.15em] mt-1">
            Terminal Active · {product.hypeMeter.viewsLast24h} Viewing
          </p>
        )}
      </a>

      <div className="mt-3 pt-3 border-t border-border/80 flex items-center justify-between">
        <span className="text-base font-black text-[#C5A059] font-mono tabular-nums">
          MXN <CountUp value={defaultVariant?.price ?? 0} />
        </span>
        <motion.button
          onClick={handleAdd}
          disabled={!defaultVariant || !defaultVariant.isAvailable}
          animate={justAdded ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          whileTap={{ scale: 0.9 }}
          transition={BOUNCE_TAP}
          className="relative px-4 py-2 bg-[#FF1E42] hover:bg-[#e0182f] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-[11px] font-bold uppercase tracking-wide rounded-lg transition-colors overflow-hidden"
        >
          {defaultVariant?.isAvailable ? (justAdded ? 'ADDED TO VAULT' : t.catalogPage.addToCart) : t.catalogPage.soldOut}
          {/* Línea láser inferior */}
          <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-70" />
        </motion.button>
      </div>
    </motion.div>
  );
}
