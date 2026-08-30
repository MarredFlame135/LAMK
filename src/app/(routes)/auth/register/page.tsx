// src/app/(routes)/auth/register/page.tsx

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Fix (hallazgo #5 de la auditoría "Prompt Maestro v4", Fase A): sin señal
// de fortaleza ni confirmación, un typo en la contraseña producía una
// cuenta irrecuperable en silencio (el usuario nunca se enteraba hasta que
// intentaba entrar). Regla simple, sin librería nueva: 4 señales reales
// (longitud, mayúscula+minúscula, número, símbolo) — no un score inventado.
function passwordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Muy débil', color: '#FF1E42' },
    { label: 'Débil', color: '#FF1E42' },
    { label: 'Media', color: '#C5A059' },
    { label: 'Fuerte', color: '#22c55e' },
    { label: 'Muy fuerte', color: '#22c55e' },
  ] as const;
  return { score: score as 0 | 1 | 2 | 3 | 4, ...levels[score] };
}

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const strength = passwordStrength(form.password);
  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === form.password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación en cliente — la real (la que no se puede saltar) vive en
    // api/auth/register/route.ts; esta es solo para no gastar un roundtrip.
    if (form.password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!privacyAccepted) {
      setError('Debes aceptar el Aviso de Privacidad para continuar.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, privacyAccepted, marketingOptIn }),
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
            {form.password.length > 0 && (
              <div className="mt-1.5 space-y-1">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="h-1 flex-1 rounded-full transition-colors"
                      style={{ background: i < strength.score ? strength.color : '#27272a' }}
                    />
                  ))}
                </div>
                <p className="text-[10px] font-mono" style={{ color: strength.color }}>{strength.label}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Confirmar contraseña</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full p-3 bg-black border rounded-lg text-sm text-white outline-none transition-colors ${
                passwordsMatch ? 'border-border focus:border-[#FF1E42]' : 'border-[#FF1E42]'
              }`}
            />
            {!passwordsMatch && <p className="text-[10px] text-[#FF1E42] mt-1">Las contraseñas no coinciden.</p>}
          </div>

          {/* Fix (hallazgo #3 de la auditoría "Prompt Maestro v4", Fase A):
              dos casillas separadas, ninguna premarcada — el aviso es
              obligatorio para poder registrarse, el opt-in de WhatsApp es
              una decisión aparte que nunca se infiere del registro. */}
          <div className="space-y-2.5 pt-1">
            <label className="flex items-start gap-2.5 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#FF1E42]"
              />
              <span>
                He leído y acepto el{' '}
                <a href="/aviso-de-privacidad" target="_blank" className="text-[#FF1E42] font-bold hover:underline">
                  Aviso de Privacidad
                </a>
                . *
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#C5A059]"
              />
              <span>Quiero recibir avisos de drops y restocks por WhatsApp.</span>
            </label>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded p-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading || !privacyAccepted || !passwordsMatch}
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
