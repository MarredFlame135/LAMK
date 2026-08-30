// src/components/ui/volumetric-studio.tsx
//
// "Estudio 3D volumétrico": exhibe un producto como si estuviera en un set de
// fotografía real, con iluminación dual (spotlight de estudio en modo oscuro,
// luz ambiental de galería en modo claro) y un tilt 3D + especular que sigue
// el cursor. Todo CSS/Framer Motion puro — cero WebGL, cero assets 3D nuevos.
// Los gradientes aquí SIMULAN luz real (funcionales, no decorativos): caen
// dentro de la excepción de los guardrails de diseño del proyecto.
//
// El "stand" (podio, perchero o vitrina) también es CSS puro, dibujado según
// la categoría del producto — así sneakers, ropa y accesorios se exhiben
// distinto sin necesitar fotografía de producto nueva.

'use client';

import React from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useMotionTemplate, useSpring } from 'framer-motion';
import { Product } from '@/types/product';
import { cn } from '@/lib/utils';

export type StandType = 'podium' | 'rack' | 'vitrine';

const STAND_BY_CATEGORY: Record<Product['category'], StandType> = {
  SNEAKERS: 'podium',
  APPAREL: 'rack',
  ACCESSORIES: 'vitrine',
  COLLECTIBLES: 'vitrine',
  JEWELRY: 'vitrine',
};

interface VolumetricStudioProps {
  product: Product;
  standType?: StandType;
  className?: string;
}

export function VolumetricStudio({ product, standType, className }: VolumetricStudioProps) {
  const stand = standType || STAND_BY_CATEGORY[product.category];
  const price = product.variants[0]?.price;

  // Tilt 3D + especular: reaccionan a la posición del cursor dentro de la
  // tarjeta. Con spring para que se sienta como una pieza física, no un
  // seguimiento 1:1 robótico.
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rotateX = useSpring(rawRotateX, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(rawRotateY, { stiffness: 200, damping: 20 });
  const specX = useMotionValue(50);
  const specY = useMotionValue(50);
  const specularBg = useMotionTemplate`radial-gradient(circle at ${specX}% ${specY}%, rgba(255,255,255,0.22), transparent 42%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rawRotateY.set((px - 0.5) * 14);
    rawRotateX.set((0.5 - py) * 10);
    specX.set(px * 100);
    specY.set(py * 100);
  };

  const handleMouseLeave = () => {
    rawRotateX.set(0);
    rawRotateY.set(0);
    specX.set(50);
    specY.set(50);
  };

  return (
    <motion.a
      href={`/product/${product.handle}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 900 }}
      className={cn(
        'group relative block aspect-[4/5] rounded-2xl overflow-hidden border border-black/10 dark:border-zinc-800 bg-rawBone dark:bg-obsidian',
        className
      )}
    >
      {/* Iluminación de estudio — spotlight cálido enfocado en oscuro, ambiental alto-key en claro */}
      <div className="absolute inset-0 [background:radial-gradient(ellipse_70%_55%_at_50%_-8%,rgba(255,255,255,0.9),transparent_70%)] dark:[background:radial-gradient(ellipse_55%_45%_at_50%_0%,rgba(255,244,222,0.28),transparent_65%)]" />
      <div className="absolute inset-0 hidden dark:block [background:radial-gradient(ellipse_40%_30%_at_50%_100%,rgba(255,30,66,0.14),transparent_70%)]" />

      {/* Sombra de piso — ancla el producto al set */}
      <div className="absolute bottom-[13%] left-1/2 -translate-x-1/2 w-2/3 h-4 rounded-full bg-black/25 dark:bg-black/60 blur-md" />

      {/* Stand según tipo de pieza */}
      {stand === 'podium' && (
        <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-1/2 h-[3px] rounded-full bg-gradient-to-r from-transparent via-black/25 dark:via-white/25 to-transparent" />
      )}
      {stand === 'rack' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
          <span className="w-2 h-2 rounded-full border border-black/25 dark:border-zinc-500" />
          <span className="w-16 h-px bg-black/20 dark:bg-zinc-600" />
        </div>
      )}
      {stand === 'vitrine' && (
        <div className="absolute inset-3 rounded-xl border border-black/10 dark:border-white/10" />
      )}

      {/* Especular que sigue el cursor */}
      <motion.div className="pointer-events-none absolute inset-0" style={{ background: specularBg }} />

      {/* Producto, con tilt 3D */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center p-8"
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      >
        <div className="relative w-full h-full">
          <Image
            src={product.images[0] || '/placeholder-sneaker.svg'}
            alt={product.title}
            fill
            sizes="(min-width: 1024px) 320px, 45vw"
            className="object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </motion.div>

      {/* Hype Score — mismo umbral de muestra mínima que ProductCard/HypeMeter */}
      <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-black font-mono uppercase tracking-wide bg-[#FF1E42] text-white">
        Index {product.hypeMeter.sampleSize >= 50 ? product.hypeMeter.score.toFixed(1) : '—'}
      </span>

      {/* Ficha — overlay funcional para legibilidad del texto sobre la foto */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/75 dark:from-black/85 to-transparent">
        <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-300">{product.brand}</p>
        <p className="text-sm font-black uppercase text-white truncate">{product.title}</p>
        {price !== undefined && <p className="text-xs text-amber-400 font-mono mt-0.5">${price.toLocaleString()} MXN</p>}
      </div>
    </motion.a>
  );
}
