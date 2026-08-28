// src/components/cart/CrossSellModule.tsx
//
// "Double Check" — módulo de cross-sell que vive en SpecialCartDrawer justo
// antes del botón de pagar. Sugiere accesorios/ropa reales del catálogo
// relacionados con la(s) marca(s) que ya están en el carrito (agujetas,
// limpiadores, calcetas) vía /api/catalog/cross-sell — nunca copy ni
// productos inventados; si el catálogo no tiene nada que sugerir, el módulo
// simplemente no se renderiza (mismo criterio que SocialProofSection).

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CartItem, CrossSellSuggestion } from '@/types/cart';
import { useCart } from '@/hooks/useCart';
import { fadeUp, staggerContainer } from '@/lib/motion';
import { haptics } from '@/lib/haptics';

interface CrossSellModuleProps {
  items: CartItem[];
}

export function CrossSellModule({ items }: CrossSellModuleProps) {
  const { addItem } = useCart();
  const [suggestions, setSuggestions] = useState<CrossSellSuggestion[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const productIds = Array.from(new Set(items.map((i) => i.productId))).sort().join(',');

  useEffect(() => {
    if (!productIds) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/catalog/cross-sell?productIds=${encodeURIComponent(productIds)}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setSuggestions(data.suggestions || []); })
      .catch((err) => console.error('Error al cargar sugerencias de cross-sell:', err));
    return () => { cancelled = true; };
  }, [productIds]);

  if (suggestions.length === 0) return null;

  const handleQuickAdd = (s: CrossSellSuggestion) => {
    // Sugerencia no trae variante — se agrega como ítem propio con un ID
    // sintético; el checkout real la resuelve por handle igual que cualquier
    // producto. Suficiente para el flujo de "agregar rápido" del carrito.
    addItem(s.title, s.productId, s.image, {
      id: `${s.productId}-crosssell`,
      sku: '',
      price: s.price,
      stock: 1,
      isAvailable: true,
      size: { mx: 0, usMen: 0, usWomen: 0, eu: 0, cm: 0 },
      sizeLabel: 'ÚNICA',
    });
    haptics.success();
    setAddedIds((prev) => new Set(prev).add(s.productId));
  };

  return (
    <motion.div
      variants={staggerContainer(0.06)}
      initial="hidden"
      animate="show"
      className="p-4 bg-gradient-to-br from-red-950/30 via-card to-card border border-[#FF1E42]/20 rounded-2xl space-y-4"
    >
      <motion.div variants={fadeUp} className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF1E42]/15 text-[#FF1E42] text-xs font-black shrink-0">✓</span>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-white">Double Check</p>
          <p className="text-[10px] text-zinc-500">¿Es todo lo que buscas? Esto combina con lo que ya llevas.</p>
        </div>
      </motion.div>

      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {suggestions.map((s) => {
            const added = addedIds.has(s.productId);
            return (
              <motion.div
                key={s.productId}
                variants={fadeUp}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                whileHover={{ y: -2 }}
                className="flex items-center gap-3 p-2.5 bg-black/40 border border-white/5 rounded-xl transition-colors hover:border-[#FF1E42]/30"
              >
                <img src={s.image} alt={s.title} className="w-16 h-16 object-cover bg-black rounded-lg shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase line-clamp-1 text-zinc-100">{s.title}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Va bien con tu {s.matchedBrand}</p>
                  <p className="font-display text-sm font-black text-[#C5A059] mt-1 tabular-nums">${s.price.toLocaleString()} MXN</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleQuickAdd(s)}
                  disabled={added}
                  className="shrink-0 h-9 px-4 text-[10px] font-black uppercase tracking-wide rounded-full transition-colors
                    disabled:bg-emerald-950/40 disabled:text-emerald-400
                    bg-[#FF1E42] hover:bg-red-700 text-white"
                >
                  {added ? '✓ Listo' : '+ Agregar'}
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
