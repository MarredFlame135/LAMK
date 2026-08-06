// src/components/home/HypeCarousel.tsx

'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Product } from '@/types/product';

interface HypeCarouselProps {
  products: Product[];
}

export function HypeCarousel({ products }: HypeCarouselProps) {
  // Ordenar productos por el score de Hype Meter de mayor a menor
  const trendingProducts = [...products].sort((a, b) => b.hypeMeter.score - a.hypeMeter.score);

  return (
    <section className="py-12 bg-[#0A0A0C] text-[#F4F4F0] border-y border-zinc-900">
      <div className="max-w-7xl mx-auto px-4">
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="animate-pulse">🔥</span>
              <span className="text-xs font-mono text-[#E60026] uppercase tracking-widest">LO MÁS DESEADO</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight mt-1">TRENDING & HYPE DROPS</h2>
          </div>
          <span className="text-xs font-mono text-zinc-500">ACTUALIZADO EN TIEMPO REAL</span>
        </div>

        {/* Carrusel Deslizable */}
        <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-zinc-800">
          {trendingProducts.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.06 }}
              whileHover={{ y: -6, borderColor: 'rgba(230,0,38,0.5)', boxShadow: '0 20px 40px -12px rgba(230,0,38,0.25)' }}
              className="flex-none w-72 bg-[#121215] border border-zinc-800 rounded-xl p-4 group"
            >
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden mb-3">
                <Image
                  src={product.images[0] || '/placeholder-sneaker.svg'}
                  alt={product.title}
                  fill
                  sizes="288px"
                  loading={idx < 4 ? 'eager' : 'lazy'}
                  className="object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute top-2 left-2 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                  🔥 {product.hypeMeter.score}% HYPE
                </span>
              </div>

              <span className="text-[10px] font-mono text-zinc-400 uppercase">{product.brand}</span>
              <h3 className="text-xs font-bold uppercase line-clamp-1 mt-0.5">{product.title}</h3>
              
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-[#E60026]">
                  ${product.variants[0]?.price.toLocaleString()} MXN
                </span>
                <a
                  href={`/product/${product.handle}`}
                  className="px-3 py-1 bg-zinc-800 hover:bg-[#E60026] text-white text-[10px] font-bold uppercase rounded transition"
                >
                  VER PAR →
                </a>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}