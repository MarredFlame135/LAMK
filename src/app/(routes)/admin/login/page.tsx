// src/app/(routes)/admin/login/page.tsx

'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo iniciar sesión.');
        return;
      }

      const redirectTo = searchParams.get('redirect') || '/admin/offline-sales';
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-[#121215] border border-zinc-800 rounded-2xl p-8 space-y-6">
      <div className="text-center space-y-1">
        <span className="text-xs font-mono text-[#E60026] uppercase tracking-widest">// STAFF ACCESS</span>
        <h1 className="text-2xl font-black uppercase tracking-tight">Panel Admin LAMK</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Correo</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-black border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-[#E60026]"
            placeholder="admin@lookatmykicksmx.com"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Contraseña</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-black border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-[#E60026]"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded p-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-[#E60026] hover:bg-red-700 disabled:opacity-60 text-white font-black text-xs uppercase tracking-widest rounded-lg transition"
        >
          {isLoading ? 'VERIFICANDO...' : 'INICIAR SESIÓN'}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0C] text-[#F4F4F0] px-4">
      <Suspense fallback={<div className="text-zinc-500 text-xs">Cargando...</div>}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
