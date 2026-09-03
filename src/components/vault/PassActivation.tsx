// src/components/vault/PassActivation.tsx
//
// Activación del Collector Pass en un solo paso, para cualquier cliente
// registrado.
//
// --- Por qué existe ---
//
// El Pass NUNCA fue una función de admin: /vault/pass solo pide sesión de
// cliente. Pero en la práctica era inalcanzable, por dos motivos que juntos
// formaban un callejón sin salida:
//
//  1. Al entrar, quien no tuviera username y visibilidad pública se topaba con
//     un muro que lo mandaba a /vault/settings — otra pantalla, con otras seis
//     secciones, donde había que adivinar qué tres campos eran los relevantes.
//  2. Y aunque los llenara, `isMinor(null)` devuelve `true`: SIN FECHA DE
//     NACIMIENTO DECLARADA el servidor fuerza la visibilidad a 'private'
//     (protección anti mass-assignment de la Fase 2, correcta). El formulario
//     de ajustes respondía "Guardado." de todas formas. Así que la persona
//     creía haber puesto su bóveda en público, volvía al Pass, y se encontraba
//     exactamente el mismo muro sin ninguna pista de por qué.
//
// El resultado medible: un (1) perfil social en toda la base de datos.
//
// Este componente pide las tres cosas que el servidor realmente necesita
// —usuario, fecha de nacimiento y visibilidad— en la misma pantalla donde
// estás intentando activar el Pass, y explica por qué se pide cada una. Si el
// servidor termina forzando 'private' por edad, se dice; nunca se responde
// "listo" a algo que quedó bloqueado.

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { haptics } from '@/lib/haptics';
import { fadeUp, staggerContainer } from '@/lib/motion';

type Visibility = 'public' | 'followers' | 'private';

const VISIBILITY_OPTIONS: { value: Visibility; label: string; desc: string }[] = [
  { value: 'public', label: 'Pública', desc: 'Cualquiera con tu QR ve tu colección.' },
  { value: 'followers', label: 'Solo seguidores', desc: 'Primero te siguen, después ven tu bóveda.' },
];

export function PassActivation({ currentUsername }: { currentUsername: string | null }) {
  const router = useRouter();

  const [username, setUsername] = useState(currentUsername ?? '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedAsMinor, setLockedAsMinor] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLockedAsMinor(false);
    setSaving(true);

    try {
      const res = await fetch('/api/social/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          dateOfBirth,
          profileVisibility: visibility,
          vaultVisibility: visibility,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo activar tu Pass.');
        return;
      }

      // El servidor manda `isMinor`. Antes se ignoraba y por eso la pantalla
      // decía "Guardado." mientras la visibilidad quedaba forzada a privada.
      if (data.isMinor) {
        setLockedAsMinor(true);
        return;
      }

      haptics.success();
      router.refresh();
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (lockedAsMinor) {
    return (
      <div className="max-w-md mx-auto bg-card border border-border rounded-2xl p-6 space-y-3 text-center">
        <span className="text-xs font-mono text-[#C5A059] uppercase tracking-widest">// CUENTA PROTEGIDA</span>
        <h2 className="font-display text-xl font-black uppercase tracking-tight">Tu bóveda queda privada</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Según la fecha que declaraste eres menor de edad, así que tu perfil y tu bóveda se
          guardaron como privados y el Collector Pass no se puede compartir. Es una regla de
          seguridad, no un error: nadie puede escanear un QR y llegar a la colección de un menor.
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tu bóveda sigue funcionando para ti en{' '}
          <a href="/vault" className="text-[#FF1E42] hover:underline font-semibold">/vault</a>.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer(0.07)}
      initial="hidden"
      animate="show"
      className="max-w-md mx-auto bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6"
    >
      <motion.div variants={fadeUp} className="space-y-1.5 text-center">
        <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// COLLECTOR PASS</span>
        <h2 className="font-display text-2xl font-black uppercase tracking-tight">Activa tu pase</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tu Pass es un QR que enseñas en persona. Quien lo escanea ve tu colección y puede
          seguirte. Puedes revocarlo cuando quieras y el QR anterior deja de servir.
        </p>
      </motion.div>

      <motion.form variants={fadeUp} onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="pass-username" className="block text-xs font-bold uppercase tracking-wide mb-1.5">
            Tu usuario
          </label>
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 focus-within:border-[#FF1E42] transition-colors">
            <span className="font-mono text-sm text-muted-foreground" aria-hidden>@</span>
            <input
              id="pass-username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="tunombre"
              autoComplete="off"
              className="flex-1 bg-transparent py-3 text-sm text-foreground outline-none"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            3 a 24 caracteres: minúsculas, números o guion bajo. Es la dirección de tu bóveda.
          </p>
        </div>

        <div>
          <label htmlFor="pass-dob" className="block text-xs font-bold uppercase tracking-wide mb-1.5">
            Fecha de nacimiento
          </label>
          <input
            id="pass-dob"
            type="date"
            required
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm text-foreground outline-none focus:border-[#FF1E42] transition-colors"
          />
          {/* Se explica por qué se pide. Es el campo que bloqueaba todo sin
              que nadie supiera que existía. */}
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Obligatoria para compartir tu bóveda: las cuentas de menores nunca se pueden hacer
            públicas. No se muestra a nadie y no se puede cambiar después desde aquí.
          </p>
        </div>

        <fieldset>
          <legend className="block text-xs font-bold uppercase tracking-wide mb-1.5">
            Quién puede ver tu colección
          </legend>
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors ${
                  visibility === opt.value ? 'border-[#FF1E42] bg-muted' : 'border-border hover:border-zinc-600'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={visibility === opt.value}
                  onChange={() => setVisibility(opt.value)}
                  className="mt-0.5 accent-[#FF1E42]"
                />
                <span>
                  <span className="block text-xs font-bold">{opt.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{opt.desc}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Puedes cambiarlo cuando quieras en{' '}
            <a href="/vault/settings" className="underline hover:text-foreground">Configuración</a>.
          </p>
        </fieldset>

        {error && (
          <p role="alert" className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded p-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          onClick={() => haptics.tap()}
          className="w-full rounded-lg bg-[#FF1E42] py-3 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {saving ? 'Activando...' : 'Activar mi Collector Pass'}
        </button>
      </motion.form>
    </motion.div>
  );
}
