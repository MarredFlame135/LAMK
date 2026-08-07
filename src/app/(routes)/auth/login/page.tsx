// src/app/(routes)/auth/login/page.tsx

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo iniciar sesión.');
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

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#0A0A0C] text-[#F4F4F0] px-4">
      <div className="w-full max-w-sm bg-[#121215] border border-zinc-800 rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs font-mono text-[#E60026] uppercase tracking-widest">// CLUB LAMK</span>
          <h1 className="text-2xl font-black uppercase tracking-tight">Inicia sesión</h1>
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
              placeholder="tu@correo.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-zinc-400">Contraseña</label>
              <a href="/auth/reset-password" className="text-[10px] text-zinc-500 hover:text-[#E60026] transition">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
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
            {isLoading ? 'ENTRANDO...' : 'INICIAR SESIÓN'}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500">
          ¿Aún no tienes cuenta?{' '}
          <a href="/auth/register" className="text-[#E60026] font-bold hover:underline">
            Regístrate
          </a>
        </p>
      </div>
    </div>
  );
}
