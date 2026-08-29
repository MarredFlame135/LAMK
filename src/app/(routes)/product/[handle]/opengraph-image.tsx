// src/app/(routes)/product/[handle]/opengraph-image.tsx
//
// Fix (hallazgo #1 de la auditoría "Prompt Maestro v4", Fase A): sin esto,
// compartir un link de producto por WhatsApp o Instagram —el canal real de
// adquisición, según CLAUDE.md— salía como un cuadro gris sin imagen. Next
// detecta este archivo por convención de carpeta y lo inyecta solo en
// metadata.openGraph.images para /product/[handle], sin tocar
// generateMetadata() a mano.
//
// Mismo lenguaje visual que ProductCard.tsx (INDEX/Verified Allocation,
// mono uppercase, acentos Laser Crimson / Muted Gold) — la tarjeta que se
// comparte tiene que sentirse como la misma marca que la página que abre.

import { ImageResponse } from 'next/og';
import { getProductByHandleLive } from '@/lib/catalog-source';
import { deriveSerial } from '@/lib/utils';
import { loadBrandOgFonts } from '@/lib/og-fonts';
import { SAAS_CONFIG } from '@/lib/saas-config';

// Fix: `getProductByHandleLive` toca `fs`/`path` indirectamente (hype.ts,
// inventory-store.ts — mismos stores JSON documentados en CLAUDE.md), que
// no existen en el runtime Edge. `ImageResponse` (next/og) funciona igual
// de bien en runtime Node — solo Edge estaba de más aquí.
export const alt = 'LAMK Vault — Producto verificado';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function ProductOgImage({ params }: { params: { handle: string } }) {
  const [{ product }, fonts] = await Promise.all([
    getProductByHandleLive(params.handle),
    loadBrandOgFonts(),
  ]);

  const OBSIDIAN = '#050507';
  const CRIMSON = '#FF1E42';
  const GOLD = '#C5A059';
  const BONE = '#F5F3ED';

  if (!product) {
    // Producto no encontrado (link viejo/roto) — imagen de marca genérica en
    // vez de una imagen rota o un fallback sin diseño.
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: OBSIDIAN, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 64, fontWeight: 700, color: BONE, letterSpacing: -1 }}>
            {SAAS_CONFIG.brandName}
          </div>
        </div>
      ),
      { ...size, fonts },
    );
  }

  const variant = product.variants.find((v) => v.isAvailable) || product.variants[0];
  const price = variant?.price ?? 0;
  const serial = deriveSerial(product);
  const image = product.images[0];

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: OBSIDIAN,
          position: 'relative',
        }}
      >
        {/* Imagen del producto — mitad derecha, con degradado hacia el fondo
            para que el texto de la izquierda siempre tenga contraste sin
            importar la foto. */}
        {image && (
          <img
            src={image}
            width={630}
            height={630}
            style={{ position: 'absolute', right: 0, top: 0, objectFit: 'cover', opacity: 0.92 }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(90deg, ${OBSIDIAN} 38%, rgba(5,5,7,0.35) 62%, rgba(5,5,7,0) 100%)`,
            display: 'flex',
          }}
        />

        {/* Columna de datos — izquierda */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '56px 48px', width: 660, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: CRIMSON, display: 'flex' }} />
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 700, color: BONE, textTransform: 'uppercase', letterSpacing: 1, display: 'flex' }}>
              {SAAS_CONFIG.shortBrandName}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                fontFamily: 'JetBrains Mono',
                fontSize: 15,
                fontWeight: 700,
                color: GOLD,
                textTransform: 'uppercase',
                letterSpacing: 3,
              }}
            >
              // LAMK VAULT · VERIFIED ALLOCATION
            </div>
            <div
              style={{
                display: 'flex',
                fontFamily: 'Space Grotesk',
                fontSize: 52,
                fontWeight: 700,
                color: BONE,
                lineHeight: 1.05,
                letterSpacing: -1,
                textTransform: 'uppercase',
              }}
            >
              {product.title.length > 42 ? `${product.title.slice(0, 42)}…` : product.title}
            </div>
            <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 20, color: '#8E8E98', letterSpacing: 1 }}>
              {product.brand.toUpperCase()}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 44, fontWeight: 700, color: GOLD }}>
                MXN {price.toLocaleString('es-MX')}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  border: `1px solid ${CRIMSON}`,
                  borderRadius: 4,
                  fontFamily: 'JetBrains Mono',
                  fontSize: 13,
                  fontWeight: 700,
                  color: CRIMSON,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
              >
                100% Authenticated
              </div>
              <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 13, color: '#8E8E98', letterSpacing: 2 }}>
                SERIAL #{serial}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
