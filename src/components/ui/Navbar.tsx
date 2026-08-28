// src/components/ui/Navbar.tsx
//
// Navegación principal traducida vía useApp()/t.nav.* (ES/EN real, no textos
// fijos) — extraída de layout.tsx (Server Component) porque useApp() necesita
// 'use client'.
//
// El link "ADMIN" (2026-08-27, decisión revisada — antes decía "nunca debe
// volver aquí"): el cliente pidió explícitamente un acceso visible después
// de que el flujo por URL directa causó confusión repetida. Se muestra
// SOLO cuando `isAdmin` es true (calculado server-side en /api/auth/me
// contra ADMIN_EMAIL/ADMIN_EMAILS, nunca expuesto como lista) — para
// cualquier otro cliente, este link simplemente no existe en el DOM.

'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { HeaderAuthLink } from '@/components/ui/HeaderAuthLink';

export function Navbar() {
  const { t } = useApp();
  const { isAdmin } = useAuth();

  return (
    <nav className="hidden md:flex items-center gap-6 text-xs font-bold tracking-widest uppercase text-zinc-400">
      <a href="/" className="hover:text-[#FF1E42] transition">{t.nav.home}</a>
      <a href="/catalog" className="hover:text-foreground transition">{t.nav.catalog}</a>
      <a href="/vault" className="hover:text-foreground transition">{t.nav.vault}</a>
      {isAdmin && (
        <a href="/admin/login" className="text-[#C5A059] hover:text-white transition">
          Admin
        </a>
      )}
      <HeaderAuthLink />
    </nav>
  );
}
