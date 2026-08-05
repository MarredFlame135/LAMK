// src/components/ui/PwaRegister.tsx
//
// Registra el service worker (public/sw.js) para que la PWA sea instalable y
// funcione parcialmente offline. Antes de esto, el manifest existía pero no
// había ningún service worker: la app no era realmente una PWA, solo lo parecía.

'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Error al registrar el Service Worker:', err);
      });
    }
  }, []);

  return null;
}
