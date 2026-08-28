// src/app/(routes)/auth/reset-password/page.tsx

'use client';

import React, { useState } from 'react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } finally {
      setIsLoading(false);
      setSent(true); // Siempre mostramos éxito, exista o no el correo (seguridad)
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background text-foreground px-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// CLUB LAMK</span>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Recupera tu contraseña</h1>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-zinc-300">
              Si <strong>{email}</strong> tiene una cuenta con nosotros, te llegará un correo con instrucciones para restablecer tu contraseña.
            </p>
            <a href="/auth/login" className="inline-block text-xs text-[#FF1E42] font-bold hover:underline">
              ← Volver a iniciar sesión
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Correo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-black border border-border rounded-lg text-sm text-white outline-none focus:border-[#FF1E42]"
                placeholder="tu@correo.com"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#FF1E42] hover:bg-red-700 disabled:opacity-60 text-white font-black text-xs uppercase tracking-widest rounded-lg transition"
            >
              {isLoading ? 'ENVIANDO...' : 'ENVIAR ENLACE DE RECUPERACIÓN'}
            </button>
            <p className="text-center text-xs text-zinc-400">
              <a href="/auth/login" className="hover:underline">← Volver a iniciar sesión</a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
