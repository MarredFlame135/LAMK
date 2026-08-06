// src/components/catalog/CatalogGrid.tsx
//
// Parte cliente del catálogo (filtros interactivos + micro-interacciones).
// Recibe los productos ya resueltos (Shopify real o mock) desde el Server
// Component en src/app/(routes)/catalog/page.tsx.

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { HypeMeter } from '@/components/hype-meter/HypeMeter';
import { useCart } from '@/hooks/useCart';
import { CATEGORY_LABELS } from '@/lib/catalog';
import { Product } from '@/types/product';

const CATEGORIES: Array<'TODOS' | Product['category']> = ['TODOS', 'SNEAKERS', 'APPAREL', 'ACCESSORIES', 'COLLECTIBLES', 'JEWELRY'];

interface CatalogGridProps {
  products: Product[];
}

export function CatalogGrid({ products }: CatalogGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<'TODOS' | Product['category']>('TODOS');
  const { addItem } = useCart();

  // Solo mostrar los filtros de categorías que realmente existen en el catálogo cargado
  const availableCategories = CATEGORIES.filter((c) => c === 'TODOS' || products.some((p) => p.category === c));

  const filtered = selectedCategory === 'TODOS'
    ? products
    : products.filter((p) => p.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-[#0A0A0C] text-[#F4F4F0] min-h-screen space-y-8">

      {/* Header Catálogo */}
      <div className="border-b border-zinc-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-mono text-[#E60026] uppercase">// DROPS & INVENTARIO REAL</span>
          <h1 className="text-3xl font-black uppercase tracking-tight mt-1">CATÁLOGO EXCLUSIVO</h1>
        </div>

        {/* Filtro por Categorías */}
        <div className="flex flex-wrap gap-2 text-xs font-bold font-mono">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg border transition ${
                selectedCategory === cat
                  ? 'bg-[#E60026] border-[#E60026] text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {cat === 'TODOS' ? 'TODOS' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-16 border border-dashed border-zinc-800 rounded-lg text-center text-zinc-500 text-sm">
          No hay productos en esta categoría por ahora.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product, idx) => {
            const defaultVariant = product.variants.find((v) => v.isAvailable) || product.variants[0];
            const sizeText = defaultVariant?.sizeLabel
              ? defaultVariant.sizeLabel
              : defaultVariant
              ? `${defaultVariant.size.mx} MX`
              : '—';

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.04 }}
                whileHover={{ y: -6, borderColor: 'rgba(230,0,38,0.5)', boxShadow: '0 20px 40px -14px rgba(230,0,38,0.25)' }}
                className="bg-[#121215] border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between group"
              >
                <a href={`/product/${product.handle}`} className="block">
                  <div className="relative aspect-square bg-black rounded-xl overflow-hidden mb-4">
                    <Image
                      src={product.images[0]}
                      alt={product.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition duration-500"
                      loading={idx < 3 ? 'eager' : 'lazy'}
                    />
                    {product.isSoldOut && (
                      <span className="absolute top-3 right-3 bg-zinc-800 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                        AGOTADO
                      </span>
                    )}
                    <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                      🔥 {product.hypeMeter.score}% HYPE
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-zinc-400 uppercase">{product.brand}</span>
                  <h3 className="text-sm font-bold uppercase mt-0.5 line-clamp-1">{product.title}</h3>
                  <p className="text-xs font-mono text-zinc-500 mt-1">Talla: {sizeText}</p>
                </a>

                <HypeMeter data={product.hypeMeter} />

                <div className="mt-2 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-base font-black text-[#E60026]">
                    ${(defaultVariant?.price ?? 0).toLocaleString()} MXN
                  </span>
                  <button
                    onClick={() => defaultVariant && defaultVariant.isAvailable && addItem(product.title, product.id, product.images[0], defaultVariant)}
                    disabled={!defaultVariant || !defaultVariant.isAvailable}
                    className="px-4 py-2 bg-[#E60026] hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-xs font-bold uppercase rounded-lg transition"
                  >
                    {defaultVariant?.isAvailable ? '+ CARRITO' : 'AGOTADO'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
