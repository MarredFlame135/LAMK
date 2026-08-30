// src/components/auth/SocialAuthButtons.tsx
//
// Compartido por /auth/login y /auth/register. `privacyAccepted` viene del
// padre — nunca se dispara el redirect a Google/Apple sin el checkbox
// marcado (hallazgo #3: el login social no se salta el consentimiento).
// El estado de qué proveedores están configurados se pide a
// /api/auth/social/providers en vez de asumir que ambos siempre están
// listos (ver esa ruta) — así el sitio no muestra botones rotos antes de
// que Dante pegue las credenciales reales en .env.local.

'use client';

import React, { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';

interface SocialAuthButtonsProps {
  privacyAccepted: boolean;
  marketingOptIn?: boolean;
}

export function SocialAuthButtons({ privacyAccepted, marketingOptIn = false }: SocialAuthButtonsProps) {
  const [available, setAvailable] = useState<{ google: boolean; apple: boolean } | null>(null);
  const [pendingProvider, setPendingProvider] = useState<'google' | 'apple' | null>(null);

  useEffect(() => {
    fetch('/api/auth/social/providers')
      .then((r) => r.json())
      .then(setAvailable)
      .catch(() => setAvailable({ google: false, apple: false }));
  }, []);

  const handleClick = async (provider: 'google' | 'apple') => {
    if (!privacyAccepted) return;
    setPendingProvider(provider);
    try {
      // Deja el consentimiento guardado en cookie ANTES de salir del sitio
      // — el redirect a Google/Apple no puede llevarse estado de React.
      const res = await fetch('/api/auth/social/prepare-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacyAccepted, marketingOptIn }),
      });
      if (!res.ok) return;
      await signIn(provider, { callbackUrl: '/vault' });
    } finally {
      setPendingProvider(null);
    }
  };

  if (!available || (!available.google && !available.apple)) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
        <div className="h-px flex-1 bg-border" />
        <span>o continúa con</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-1 gap-2">
        {available.google && (
          <button
            type="button"
            onClick={() => handleClick('google')}
            disabled={!privacyAccepted || pendingProvider !== null}
            title={privacyAccepted ? undefined : 'Acepta el Aviso de Privacidad primero'}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed text-black text-xs font-bold uppercase tracking-wide rounded-lg transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.64v3h3.88c2.27-2.09 3.57-5.17 3.57-8.83z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24z" />
              <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.29V6.6H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.4z" />
              <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.6l4 3.11C6.22 6.86 8.87 4.75 12 4.75z" />
            </svg>
            {pendingProvider === 'google' ? 'Conectando...' : 'Google'}
          </button>
        )}
        {available.apple && (
          <button
            type="button"
            onClick={() => handleClick('apple')}
            disabled={!privacyAccepted || pendingProvider !== null}
            title={privacyAccepted ? undefined : 'Acepta el Aviso de Privacidad primero'}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-black hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wide rounded-lg border border-zinc-700 transition"
          >
            <svg width="15" height="15" viewBox="0 0 384 512" fill="currentColor" aria-hidden>
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 0 184.8 0 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-57.7-90-57.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
            {pendingProvider === 'apple' ? 'Conectando...' : 'Apple'}
          </button>
        )}
      </div>
    </div>
  );
}
