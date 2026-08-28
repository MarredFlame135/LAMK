// src/lib/site-url.ts
//
// Punto único para la URL pública del sitio — usada por metadataBase
// (layout raíz), robots.ts, sitemap.ts y el JSON-LD de producto. Antes cada
// uno improvisaba su propia resolución de dominio (o no tenía ninguna).
//
// `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` es el mismo patrón que ya usaba el
// JSON-LD de producto para el dominio propio (pendiente de compra, ver
// CLAUDE.md). Mientras no esté configurado, el fallback es el dominio real
// que SÍ está en producción hoy (`lamk.vercel.app`) — nunca un dominio que
// todavía no resuelve, porque eso generaría canónicas/sitemap apuntando a
// una URL muerta.
export function getSiteUrl(): string {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  return domain ? `https://${domain}` : 'https://lamk.vercel.app';
}
