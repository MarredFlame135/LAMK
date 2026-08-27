// src/components/ui/Navbar.tsx
//
// Navegación principal traducida vía useApp()/t.nav.* (ES/EN real, no textos
// fijos) — extraída de layout.tsx (Server Component) porque useApp() necesita
// 'use client'. El link "ADMIN" NUNCA debe volver aquí: la ruta /admin/* es
// intencionalmente invisible para el público (ver src/middleware.ts).

'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { HeaderAuthLink } from '@/components/ui/HeaderAuthLink';

export function Navbar() {
  const { t } = useApp();

  return (
    <nav className="hidden md:flex items-center gap-6 text-xs font-bold tracking-widest uppercase text-zinc-400">
      <a href="/" className="hover:text-[#FF1E42] transition">{t.nav.home}</a>
      <a href="/catalog" className="hover:text-foreground transition">{t.nav.catalog}</a>
      <a href="/vault" className="hover:text-foreground transition">{t.nav.vault}</a>
      <HeaderAuthLink />
    </nav>
  );
}
