// src/components/vault/MostWantedSection.tsx
//
// Fase B (brief B.3 punto 5). Solo se monta en tu propia bóveda (ver
// vault/page.tsx) — no hay control de privacidad diseñado todavía para
// mostrar la wishlist de otro coleccionista.

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Product } from '@/types/product';
import { fadeUp, staggerContainer } from '@/lib/motion';
import { haptics } from '@/lib/haptics';

const GOLD = '#C5A059';
const CRIMSON = '#FF1E42';

function MostWantedCard({ product, onRemove }: { product: Product; onRemove: (id: string) => void }) {
  const [removing, setRemoving] = useState(false);
  const price = product.variants[0]?.price;

  const handleRemove = async () => {
    setRemoving(true);
    haptics.tap();
    try {
      await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
      onRemove(product.id);
    } catch {
      setRemoving(false);
    }
  };

  return (
    <motion.div variants={fadeUp} className="group relative bg-black/40 border border-border/80 rounded-xl overflow-hidden">
      <a href={`/product/${product.handle}`} className="block">
        <div className="relative aspect-square bg-muted/40">
          <Image src={product.images[0] || '/placeholder-sneaker.svg'} alt={product.title} fill sizes="200px" className="object-contain p-3" />
          {product.isSoldOut && (
            <span className="absolute top-2 left-2 bg-zinc-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase">
              Agotado
            </span>
          )}
        </div>
        <div className="p-2.5">
          <p className="text-[9px] font-mono text-zinc-400 uppercase truncate">{product.brand}</p>
          <h4 className="text-[11px] font-bold uppercase line-clamp-1">{product.title}</h4>
          {price !== undefined && (
            <p className="text-xs font-mono font-bold mt-0.5" style={{ color: GOLD }}>MXN {price.toLocaleString('es-MX')}</p>
          )}
        </div>
      </a>
      <button
        onClick={handleRemove}
        disabled={removing}
        title="Quitar de Most Wanted"
        className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-full bg-black/70 backdrop-blur-sm border border-white/10 text-zinc-300 hover:text-white hover:border-[#FF1E42]/60 transition opacity-0 group-hover:opacity-100 disabled:opacity-40"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </motion.div>
  );
}

export function MostWantedSection({ initialItems }: { initialItems: Product[] }) {
  const [items, setItems] = useState(initialItems);

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h3 className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
        // MOST WANTED ({items.length})
      </h3>

      {items.length === 0 ? (
        <div className="p-6 border border-dashed border-border rounded-lg text-center">
          <p className="text-zinc-400 text-xs">
            Aún no agregas piezas a tu Most Wanted. Marca las que quieres cazar desde su ficha de producto.
          </p>
        </div>
      ) : (
        <motion.div
          variants={staggerContainer(0.06)}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          {items.map((product) => (
            <MostWantedCard
              key={product.id}
              product={product}
              onRemove={(id) => setItems((prev) => prev.filter((p) => p.id !== id))}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
