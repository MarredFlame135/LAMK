// src/lib/site-url.ts
//
// Punto único para la URL pública del sitio — usada por metadataBase
// (layout raíz), robots.ts, sitemap.ts, el JSON-LD de producto y el QR del
// Collector Pass. Antes cada uno improvisaba su propia resolución de
// dominio (o no tenía ninguna).
//
// Fix (reportado 2026-08-30 por Dante — el QR del Pass lo mandaba "a la
// página antigua"): esta función usaba `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`
// como respaldo, asumiendo que era "el dominio de este sitio" porque el
// comentario original decía que lookatmykicksmx.com estaba "pendiente de
// compra". Pero esa variable es el dominio de la TIENDA de Shopify (la usa
// la Storefront API, ver lib/shopify/config.ts) — un propósito distinto —
// y en la práctica lookatmykicksmx.com ya está comprado y sigue siendo la
// tienda vieja de Shopify, en vivo, sirviendo su propio tema (confirmado:
// responde con cookies _shopify_y/_shopify_s y CDN de Shopify). Usarlo
// aquí mandaba el QR de la Bóveda, el sitemap, el og:image y las URLs
// canónicas de producto a la tienda vieja en vez de a esta app.
//
// Ahora el respaldo es `VERCEL_PROJECT_PRODUCTION_URL` — Vercel la inyecta
// solo (dominio de producción estable del proyecto, sin protocolo, no
// cambia entre deploys), así que no depende de que nadie configure nada
// nuevo ni de una variable con un propósito distinto.
//
// Si en el futuro lookatmykicksmx.com se apunta (vía DNS) a ESTA app en
// vez de a la tienda vieja, ahí sí hace falta una variable propia — no
// reusar NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN para eso, para no repetir este
// mismo bug.
export function getSiteUrl(): string {
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercelProductionUrl ? `https://${vercelProductionUrl}` : 'https://lamk.vercel.app';
}
