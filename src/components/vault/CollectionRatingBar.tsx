// src/components/vault/CollectionRatingBar.tsx
//
// Calificar la colección COMPLETA de alguien, de 1 a 5 estrellas.
//
// Es distinto del me gusta / no me gusta por pieza: aquello valora un objeto
// concreto, esto valora la CURADURÍA — qué tan bien armado está el closet
// entero. Por eso son dos cosas separadas y no una suma de la otra.
//
// Solo se muestra el promedio y el número de votos. Nunca quién votó qué, ni
// siquiera al dueño — misma regla que las reacciones por pieza.

'use client';

import React, { useState } from 'react';
import { haptics } from '@/lib/haptics';

const GOLD = '#C5A059';

interface Props {
  username: string;
  average: number | null;
  count: number;
  mine: number | null;
  /** Falso para el dueño, para quien no inició sesión y para un escaneo de QR. */
  canRate: boolean;
}

export function CollectionRatingBar({ username, average, count, mine, canRate }: Props) {
  const [state, setState] = useState({ average, count, mine });
  const [hover, setHover] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calificar = async (stars: number) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    haptics.success();

    try {
      const res = await fetch('/api/vault/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, stars }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo calificar.');
        return;
      }
      setState({ average: data.average, count: data.count, mine: data.mine });
    } catch {
      setError('Sin conexión.');
    } finally {
      setBusy(false);
    }
  };

  // Lo que se pinta: al pasar el cursor, la nota que estás a punto de dar; si
  // no, la tuya; si no has votado, el promedio de todos.
  const shown = hover ?? state.mine ?? (state.average !== null ? Math.round(state.average) : 0);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHover(null)}
        role={canRate ? 'group' : undefined}
        aria-label={canRate ? 'Calificar esta colección' : undefined}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const activa = n <= shown;
          const estrella = (
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden
              fill={activa ? GOLD : 'none'} stroke={activa ? GOLD : 'currentColor'} strokeWidth="1.6">
              <path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 16.9 6.7 19.7l1.1-6.1L3.4 9.4l6-.8L12 3Z" strokeLinejoin="round" />
            </svg>
          );

          if (!canRate) {
            return <span key={n} className="text-muted-foreground">{estrella}</span>;
          }

          return (
            <button
              key={n}
              type="button"
              disabled={busy}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(null)}
              onClick={() => calificar(n)}
              aria-label={`Calificar con ${n} de 5`}
              aria-pressed={state.mine === n}
              className="p-0.5 text-muted-foreground transition hover:scale-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF1E42] rounded"
            >
              {estrella}
            </button>
          );
        })}
      </div>

      <span className="font-mono text-[10px] text-muted-foreground">
        {state.count === 0
          ? 'Sin calificar todavía'
          : `${state.average!.toFixed(1)} · ${state.count} ${state.count === 1 ? 'voto' : 'votos'}`}
        {state.mine !== null && ' · tu voto contado'}
      </span>

      {error && <span role="alert" className="font-mono text-[10px] text-[#FF1E42]">{error}</span>}
    </div>
  );
}
