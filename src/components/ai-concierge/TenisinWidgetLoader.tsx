// src/components/ai-concierge/TenisinWidgetLoader.tsx
//
// Fix (hallazgo #6 de la auditoría de Fase 3): TenisinWidget es un chat
// flotante 100% interactivo — no aporta nada al primer render (ni SEO ni
// contenido visible hasta que alguien lo abre), así que no hay razón para
// que su JS viaje en el bundle inicial de la home. `next/dynamic` con
// `ssr: false` lo difiere a un chunk aparte que solo se pide cuando el
// navegador ya terminó lo importante — pero `ssr: false` solo se permite
// dentro de un Client Component, y page.tsx es un Server Component (lee el
// catálogo). Este wrapper existe solo para eso: es el único punto
// 'use client' necesario para poder diferir la carga.

'use client';

import dynamic from 'next/dynamic';

const TenisinWidget = dynamic(
  () => import('./TenisinWidget').then((mod) => mod.TenisinWidget),
  { ssr: false }
);

export function TenisinWidgetLoader() {
  return <TenisinWidget />;
}
