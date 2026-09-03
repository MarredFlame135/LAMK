// Fix (hallazgo #5 de la auditoría de Fase 1): antes no había ningún header
// de seguridad propio. No se detectó ningún XSS activo en el proyecto hoy
// (revisión completa en docs/audit/FASE-1-SEGURIDAD.md), así que esto es
// defensa-en-profundidad, no el parche de un exploit concreto — si algún
// día se introduce un XSS (ej. al conectar image-pipeline a un proveedor
// real que devuelva HTML/SVG sin sanear), esto limita el daño.
//
// 'unsafe-inline' en script-src es necesario porque Next.js App Router
// inyecta scripts inline para hidratar el payload de RSC — una CSP con
// nonces sería más estricta pero requiere generar el nonce en
// middleware.ts y pasarlo a cada request; queda como siguiente paso, no se
// hizo aquí para no tocar el middleware en la misma pasada que ya arregla
// autenticación. 'unsafe-inline' en style-src es necesario por los
// `style={{ backgroundImage: ... }}` que ya usan HeroSection/layout.tsx
// para las texturas de Higgsfield.
const isDev = process.env.NODE_ENV !== 'production';

// Vercel Analytics (agregado 2026-09-02). Se instaló en la Fase 5 y NUNCA
// llegó a cargar: la CSP de la Fase 1 dejaba script-src en 'self', así que el
// navegador rechazaba su loader ("Refused to load the script
// 'https://va.vercel-scripts.com/...'") en silencio, salvo por una línea roja
// en la consola. Es decir, todo el embudo de compra, los clics de carrusel
// por posición y las búsquedas que esa fase dejó instrumentados llevaban
// desde entonces sin registrar un solo evento.
//
// Se abren los dos hosts que usa, y nada más: el loader del script y el
// endpoint al que manda los eventos. En un deploy de Vercel los eventos van
// por /_vercel/insights (mismo origen, ya cubierto por 'self'); el host de
// vitals hace falta fuera de ese camino.
const VERCEL_ANALYTICS_SCRIPT = 'https://va.vercel-scripts.com';
const VERCEL_ANALYTICS_ENDPOINT = 'https://vitals.vercel-insights.com';

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${VERCEL_ANALYTICS_SCRIPT}${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://cdn.shopify.com https://images.unsplash.com https://lookatmykicksmx.com",
  "font-src 'self' data:",
  `connect-src 'self' ${VERCEL_ANALYTICS_ENDPOINT}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lookatmykicksmx.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
