// src/components/themes/theme3/Theme3Hero.tsx
//
// Hero de "The Wall" — brutalismo callejero (Grailed): blanco/negro extremo,
// cero radios, tipografía enorme superpuesta. El modo oscuro del sitio
// invierte literalmente el fondo/tinta aquí (como un negativo fotográfico)
// en vez de solo atenuar colores — encaja con la identidad de fotografía
// cruda y es una decisión, no un olvido (ver ThemeVariantContext).

'use client';

import React from 'react';
import { ThemeAndLangSwitcher } from '@/components/ui/ThemeAndLangSwitcher';
import { ThemeSwitcher } from '@/components/themes/ThemeSwitcher';
import { SAAS_CONFIG } from '@/lib/saas-config';
import { Magnetic } from '@/components/ui/Magnetic';

const GRAIN_BG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

export function Theme3Hero() {
  return (
    <section className="bg-white text-black dark:bg-black dark:text-white border-b-[3px] border-current">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
        <span className="font-black uppercase tracking-tight text-lg" style={{ fontFamily: 'Arial Black, Helvetica Neue, Arial, sans-serif' }}>
          {SAAS_CONFIG.shortBrandName}
        </span>
        <div className="flex items-center gap-2">
          <ThemeAndLangSwitcher />
          <ThemeSwitcher />
        </div>
      </div>

      <div className="relative overflow-hidden border-t-[3px] border-current">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay"
          style={{ backgroundImage: GRAIN_BG }}
          aria-hidden
        />
        <div className="relative px-4 sm:px-6 py-16 sm:py-24">
          <h1
            className="font-black uppercase leading-[0.92] tracking-tight"
            style={{ fontFamily: 'Arial Black, Helvetica Neue, Arial, sans-serif', fontSize: 'clamp(3rem, 9.5vw, 7rem)' }}
          >
            NO<br />RULES.<br />JUST HEAT.
          </h1>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <p className="max-w-xs text-sm opacity-80">
              Sin poses ensayadas. El catálogo que ves aquí es el mismo que está en la tienda ahora mismo.
            </p>
            <div className="flex gap-3">
              <Magnetic className="inline-block" strength={0.3}>
                <a href="#the-wall" className="font-black uppercase text-sm px-6 py-3.5 border-2 border-current bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition">
                  Ver el drop
                </a>
              </Magnetic>
              <a href="/catalog" className="font-black uppercase text-sm px-6 py-3.5 border-2 border-current hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition">
                Catálogo
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
