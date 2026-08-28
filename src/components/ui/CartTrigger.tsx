// src/components/ui/CartTrigger.tsx
//
// Fix (mismo hallazgo de mobile, 2026-08-27): no había NINGÚN botón para
// abrir el carrito manualmente — solo se abría solo al agregar un producto
// (setIsOpen(true) dentro de addItem, ver CartContext.tsx). Si el cliente lo
// cerraba y quería volver a verlo, no tenía cómo, en desktop o mobile.

'use client';

import React from 'react';
import { useCart } from '@/hooks/useCart';

export function CartTrigger() {
  const { items, setIsOpen } = useCart();
  const count = items.reduce((a, b) => a + b.quantity, 0);

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="relative flex items-center justify-center w-10 h-10 text-zinc-300 hover:text-white transition"
      aria-label={`Abrir carrito${count > 0 ? `, ${count} artículos` : ''}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[#FF1E42] text-white text-[9px] font-bold font-mono">
          {count}
        </span>
      )}
    </button>
  );
}
