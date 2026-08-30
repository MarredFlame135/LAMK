// src/components/product/WishlistButton.tsx
//
// Most Wanted (Fase B, brief B.3 punto 5). Doble propósito, real en los
// dos sentidos: al coleccionista le sirve de lista de deseos; agregado
// también alimenta la señal "wishlist" del Índice ponderado (hallazgo #2)
// y, a futuro, el dashboard de demanda insatisfecha de inventario (Fase D).
//
// Sin sesión, el click manda a login en vez de fallar en silencio o
// pretender que se guardó.

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { haptics } from '@/lib/haptics';

const GOLD = '#C5A059';

export function WishlistButton({ productId }: { productId: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [inWishlist, setInWishlist] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (authLoading || !user) {
      setChecked(true);
      return;
    }
    fetch(`/api/wishlist/${encodeURIComponent(productId)}`)
      .then((r) => r.json())
      .then((data) => setInWishlist(Boolean(data.inWishlist)))
      .catch(() => {})
      .finally(() => setChecked(true));
  }, [productId, user, authLoading]);

  const handleClick = async () => {
    if (!user) {
      router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setPending(true);
    const next = !inWishlist;
    setInWishlist(next); // optimista — se revierte si falla
    haptics.tap();
    try {
      const res = await fetch('/api/wishlist', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error('request failed');
    } catch {
      setInWishlist(!next); // revertir el optimismo
    } finally {
      setPending(false);
    }
  };

  if (!checked) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="w-full py-3 border rounded flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition disabled:opacity-60"
      style={{
        borderColor: inWishlist ? GOLD : 'var(--border)',
        color: inWishlist ? GOLD : undefined,
        background: inWishlist ? 'rgba(197,160,89,0.08)' : 'transparent',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={inWishlist ? GOLD : 'none'} stroke={inWishlist ? GOLD : 'currentColor'} strokeWidth="2">
        <path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.6 4.2 5c2.2-1.3 4.9-.7 6.4 1.2.4.5.7 1 1 1.5.3-.5.6-1 1-1.5 1.5-1.9 4.2-2.5 6.4-1.2 2.8 1.6 3.4 5.1 1.5 7.9C18.7 16.65 12 21 12 21z" />
      </svg>
      {inWishlist ? 'EN TU MOST WANTED' : 'AGREGAR A MOST WANTED'}
    </button>
  );
}
