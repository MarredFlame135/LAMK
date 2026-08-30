// src/app/(routes)/auth/link-account/page.tsx
//
// A donde redirige el signIn callback de NextAuth cuando alguien entra con
// Google/Apple usando un correo que YA tiene cuenta con contraseña en
// Shopify (ver lib/social-auth/bridge.ts, camino 3). No se fusiona sola —
// se le pide confirmar su contraseña real UNA vez; después de esto, ese
// proveedor queda vinculado y entra directo.

'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Fix: `useSearchParams()` obliga a un límite de Suspense en build estático
// (Next.js App Router) — sin esto, `next build` falla al pre-renderizar
// esta página ("should be wrapped in a suspense boundary").
export default function LinkAccountPage() {
  return (
    <Suspense fallback={null}>
      <LinkAccountForm />
    </Suspense>
  );
}

function LinkAccountForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const email = params.get('email') || '';
  const provider = params.get('provider') || '';
  const providerAccountId = params.get('providerAccountId') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/social/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, provider, providerAccountId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo vincular la cuenta.');
        return;
      }
      await refresh();
      router.push('/vault');
    } catch (err) {
      console.error(err);
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!email || !provider || !providerAccountId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <p className="text-sm text-zinc-400">Enlace inválido. Intenta iniciar sesión de nuevo desde <a href="/auth/login" className="text-[#FF1E42] underline">aquí</a>.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background text-foreground px-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// CLUB LAMK</span>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Confirma tu cuenta</h1>
          <p className="text-xs text-zinc-400">
            Ya existe una cuenta LAMK con <strong className="text-white">{email}</strong>. Confirma tu contraseña una sola vez para vincularla con {provider === 'google' ? 'Google' : 'Apple'} — después podrás entrar directo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Tu contraseña actual</label>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-black border border-border rounded-lg text-sm text-white outline-none focus:border-[#FF1E42]"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded p-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#FF1E42] hover:bg-red-700 disabled:opacity-60 text-white font-black text-xs uppercase tracking-widest rounded-lg transition"
          >
            {isLoading ? 'VINCULANDO...' : 'VINCULAR Y ENTRAR'}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400">
          ¿Olvidaste tu contraseña?{' '}
          <a href="/auth/reset-password" className="text-[#FF1E42] font-bold hover:underline">Recupérala aquí</a>
        </p>
      </div>
    </div>
  );
}
