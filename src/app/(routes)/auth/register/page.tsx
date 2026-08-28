// src/app/(routes)/auth/register/page.tsx

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo crear la cuenta.');
        return;
      }

      await refresh();
      // Onboarding gamificado post-registro (RF-03)
      router.push('/onboarding');
    } catch (err) {
      console.error(err);
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background text-foreground px-4 py-12">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// CLUB LAMK</span>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Crea tu cuenta</h1>
          <p className="text-xs text-zinc-400 mt-2">Suma XP desde tu primera compra y desbloquea la Bóveda del Coleccionista.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nombre</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full p-3 bg-black border border-border rounded-lg text-sm text-white outline-none focus:border-[#FF1E42]"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Apellido</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full p-3 bg-black border border-border rounded-lg text-sm text-white outline-none focus:border-[#FF1E42]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Correo</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full p-3 bg-black border border-border rounded-lg text-sm text-white outline-none focus:border-[#FF1E42]"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">WhatsApp (10 dígitos)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
              maxLength={10}
              className="w-full p-3 bg-black border border-border rounded-lg text-sm text-white outline-none focus:border-[#FF1E42]"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Contraseña</label>
            <input
              type="password"
              required
              minLength={5}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full p-3 bg-black border border-border rounded-lg text-sm text-white outline-none focus:border-[#FF1E42]"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded p-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#FF1E42] hover:bg-red-700 disabled:opacity-60 text-white font-black text-xs uppercase tracking-widest rounded-lg transition mt-2"
          >
            {isLoading ? 'CREANDO CUENTA...' : 'CREAR CUENTA'}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400">
          ¿Ya tienes cuenta?{' '}
          <a href="/auth/login" className="text-[#FF1E42] font-bold hover:underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
