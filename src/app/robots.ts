// src/app/robots.ts
//
// Fix (hallazgo #3 de la auditoría de Fase 4): no existía ni un robots.txt
// estático ni esta ruta dinámica — no había ninguna directiva explícita de
// qué SÍ rastrear y qué no. `/admin/` y `/api/` no aportan nada indexable y
// no deberían competir por presupuesto de rastreo; `/profile/` es refuerzo
// del `noindex` que ya lleva esa página (ver profile/[username]/page.tsx) —
// un disallow por sí solo no saca del índice algo ya indexado, por eso el
// noindex en meta es la protección real y esto es el respaldo.

import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/profile/'],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
