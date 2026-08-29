// src/app/(routes)/opengraph-image.tsx
//
// Fix (hallazgo #1 de la auditoría "Prompt Maestro v4", Fase A): imagen OG
// de marca para home y cualquier ruta sin su propio opengraph-image.tsx
// (catálogo, /vault antes de login, etc. — Next hace fallback al más
// cercano en el árbol de rutas). El producto tiene la suya propia, más
// específica (ver product/[handle]/opengraph-image.tsx).

import { ImageResponse } from 'next/og';
import { loadBrandOgFonts } from '@/lib/og-fonts';
import { SAAS_CONFIG } from '@/lib/saas-config';

export const runtime = 'edge';
export const alt = SAAS_CONFIG.brandName;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function DefaultOgImage() {
  const fonts = await loadBrandOgFonts();
  const OBSIDIAN = '#050507';
  const CRIMSON = '#FF1E42';
  const GOLD = '#C5A059';
  const BONE = '#F5F3ED';

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: OBSIDIAN,
          padding: 64,
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        {/* Textura sutil de retícula — sin imagen externa, solo líneas, para
            que el fondo no se sienta plano sin depender de un asset. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: CRIMSON, display: 'flex' }} />
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 500, color: '#8E8E98', letterSpacing: 4, textTransform: 'uppercase', display: 'flex' }}>
            {SAAS_CONFIG.shortBrandName} // Live Index
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Space Grotesk',
              fontSize: 88,
              fontWeight: 700,
              color: BONE,
              lineHeight: 0.98,
              letterSpacing: -2,
              textTransform: 'uppercase',
              maxWidth: 900,
            }}
          >
            Sneakers &amp; Streetwear Exclusivo
          </div>
          <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 22, color: GOLD, letterSpacing: 1 }}>
            Drops limitados · Hype Index en vivo · Entregas express en México
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
