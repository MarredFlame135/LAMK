// src/components/vault/CollectorSearch.tsx
//
// Buscar coleccionistas por nombre de usuario, entrar a su closet, seguirlos y
// calificar su colección.
//
// Sin escribir nada muestra el directorio: los coleccionistas públicos con más
// piezas. Es lo que hace que la pantalla sirva la primera vez, cuando todavía
// no sabes el nombre de nadie.
//
// **Solo aparecen perfiles que su dueño puso en público** — ni "solo
// seguidores", ni privados, ni cuentas de menores. La regla completa y el
// porqué están en lib/social/discover.ts. Consecuencia a no confundir con un
// error: mientras nadie haya hecho público su perfil, el resultado vacío es
// correcto, y el texto de abajo lo dice en vez de dejar un hueco mudo.

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { haptics } from '@/lib/haptics';
import { fadeUp, staggerContainer } from '@/lib/motion';
import type { CollectorHit } from '@/lib/social/discover';

const GOLD = '#C5A059';

export function CollectorSearch() {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<CollectorHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buscar = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/social/discover?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo buscar.');
        setHits([]);
        return;
      }
      setHits(data.collectors ?? []);
    } catch {
      setError('Sin conexión.');
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Rebote de 300 ms: sin esto se dispara una consulta por tecla y el límite de
  // la ruta (40 cada 5 minutos) se agota escribiendo un nombre largo.
  useEffect(() => {
    const t = setTimeout(() => buscar(query), 300);
    return () => clearTimeout(t);
  }, [query, buscar]);

  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="space-y-1">
        <h3 className="text-xs font-mono uppercase text-muted-foreground tracking-wider">
          // COLECCIONISTAS
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Busca a alguien por su usuario para ver su closet, seguirlo y calificar su colección.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 focus-within:border-[#FF1E42] transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nombre de usuario"
          aria-label="Buscar coleccionista por nombre de usuario"
          autoComplete="off"
          className="flex-1 bg-transparent py-2.5 text-sm text-foreground outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Limpiar búsqueda"
            className="text-muted-foreground hover:text-foreground transition text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded p-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-[11px] font-mono text-muted-foreground">Buscando…</p>
      ) : hits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            {query
              ? `Ningún coleccionista público con "${query}".`
              : 'Todavía no hay coleccionistas con perfil público.'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Aquí solo aparece quien eligió hacer público su perfil. Puedes hacer el tuyo público en{' '}
            <a href="/vault/settings" className="underline hover:text-foreground">Configuración</a>.
          </p>
        </div>
      ) : (
        <motion.ul
          variants={staggerContainer(0.05)}
          initial="hidden"
          animate="show"
          className="grid gap-2 sm:grid-cols-2"
        >
          {hits.map((c) => (
            <motion.li key={c.username} variants={fadeUp}>
              <a
                href={`/vault/@${encodeURIComponent(c.username)}`}
                onClick={() => haptics.tap()}
                className="group flex items-center gap-3 rounded-lg border border-border bg-muted p-3 transition hover:border-[#C5A059]/60"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-display text-sm font-black uppercase"
                  style={{ borderColor: `${GOLD}66`, color: GOLD }}
                  aria-hidden
                >
                  {c.username.slice(0, 1)}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs font-bold truncate">@{c.username}</span>
                    {c.following && (
                      <span className="rounded-full border border-emerald-600/50 px-1.5 py-px font-mono text-[8px] uppercase tracking-wide text-emerald-500 dark:text-emerald-400">
                        Sigues
                      </span>
                    )}
                  </span>

                  <span className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                    <span>{c.pieces} {c.pieces === 1 ? 'pieza' : 'piezas'}</span>
                    {/* La calificación solo se muestra si alguien ya calificó.
                        "Sin calificar" es más honesto que un 0 que se lee como
                        una colección mala. */}
                    {c.ratingCount > 0 && (
                      <span style={{ color: GOLD }}>
                        ★ {c.rating!.toFixed(1)} ({c.ratingCount})
                      </span>
                    )}
                  </span>

                  {c.bio && (
                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{c.bio}</span>
                  )}
                </span>

                <span className="text-[#C5A059] transition group-hover:translate-x-0.5" aria-hidden>→</span>
              </a>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </section>
  );
}
