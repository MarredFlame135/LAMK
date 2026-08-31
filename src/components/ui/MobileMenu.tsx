// src/components/ui/MobileMenu.tsx
//
// Fix crítico (reportado 2026-08-27): en mobile no aparecía NADA de
// navegación — ni Inicio, ni Catálogo, ni Vault, ni Iniciar sesión. Causa
// real: <Navbar /> siempre tuvo `hidden md:flex` (correcto para desktop)
// pero nunca existió una alternativa para mobile — el sitio era literalmente
// no-navegable por debajo de 768px, salvo escribiendo URLs a mano. Dado que
// el tráfico real del negocio entra desde Instagram en el teléfono, esto
// afectaba a la mayoría de los visitantes, no a una minoría.
//
// Este menú es el reemplazo: un botón hamburguesa visible solo en mobile
// (md:hidden) que abre un panel deslizante con exactamente los mismos links
// que ya tiene <Navbar />, más el estado de sesión.

'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { ThemeAndLangSwitcher } from '@/components/ui/ThemeAndLangSwitcher';

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useApp();
  const { user, isAdmin, logout } = useAuth();

  // Necesario para el portal de abajo: en el render del servidor no existe
  // `document`, así que el panel solo se monta después de hidratar.
  useEffect(() => setMounted(true), []);

  // Fix (reportado 2026-08-30): el menú "se veía transparente y se perdía la
  // información". La causa real no era opacidad: este componente vive dentro
  // del <header>, y ese header tenía `backdrop-blur-md`. Un elemento con
  // `backdrop-filter` se vuelve BLOQUE CONTENEDOR de sus descendientes
  // `position: fixed` (igual que `transform` o `filter`), así que
  // `fixed inset-y-0` se resolvía contra los 64px de alto del header en vez
  // del viewport: el panel medía 312×64 y los links de navegación se
  // dibujaban FUERA de él, flotando directo sobre la página sin ningún fondo
  // detrás. Se ve idéntico a un panel translúcido, pero es desbordamiento.
  // El portal a <body> lo saca de cualquier ancestro con filtro — arregla la
  // causa en vez del síntoma, y evita que vuelva a pasar si mañana alguien
  // le agrega un `transform` al header.
  // Fix (encontrado al verificar lo anterior en navegador): el banner de
  // consentimiento es `z-[70]`, así que se montaba ENCIMA del menú
  // (`z-[60]/[61]`) y le tapaba el switcher de tema/idioma y el botón de
  // Iniciar sesión — justo a los visitantes nuevos, que son el tráfico de
  // Instagram para el que se construyó este menú. Sube a 80/81.
  const overlay = (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Nota: la ronda "Fase 6" ya había intentado arreglar esto
                subiendo el velo a 90% y pasando el panel a `bg-card` — el
                síntoma que se veía era el mismo, pero la causa era el
                desbordamiento descrito arriba, no el color. Esos valores se
                conservan (siguen siendo los correctos: `bg-card` es un tono
                deliberadamente distinto del fondo de la página en los dos
                temas) y ahora sí se aplican sobre un panel de altura
                completa. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 right-0 z-[81] w-[80vw] max-w-xs bg-card text-foreground border-l border-border shadow-2xl md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <span className="font-display font-black text-sm uppercase tracking-tight">Menú</span>
                <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors" aria-label="Cerrar menú">✕</button>
              </div>

              <nav className="flex-1 flex flex-col p-5 gap-1 text-sm font-bold uppercase tracking-widest">
                <a href="/" onClick={() => setIsOpen(false)} className="py-3.5 border-b border-border hover:text-[#FF1E42] transition">{t.nav.home}</a>
                <a href="/catalog" onClick={() => setIsOpen(false)} className="py-3.5 border-b border-border hover:text-[#FF1E42] transition">{t.nav.catalog}</a>
                <a href="/vault" onClick={() => setIsOpen(false)} className="py-3.5 border-b border-border hover:text-[#FF1E42] transition">{t.nav.vault}</a>
                <a href="/tracking" onClick={() => setIsOpen(false)} className="py-3.5 border-b border-border hover:text-[#FF1E42] transition">Rastreo</a>
                {isAdmin && (
                  <a href="/admin/login" onClick={() => setIsOpen(false)} className="py-3.5 border-b border-border text-[#C5A059] hover:text-foreground transition">Admin</a>
                )}
              </nav>

              <div className="p-5 border-t border-border space-y-4">
                <ThemeAndLangSwitcher />
                {user ? (
                  <div className="flex items-center justify-between text-xs">
                    <a href="/vault" onClick={() => setIsOpen(false)} className="text-[#C5A059] font-bold uppercase">
                      {t.nav.hello} {user.firstName.toUpperCase()}
                    </a>
                    <button onClick={() => { logout(); setIsOpen(false); }} className="text-muted-foreground hover:text-[#FF1E42] uppercase font-bold transition-colors">
                      {t.nav.logout}
                    </button>
                  </div>
                ) : (
                  <a
                    href="/auth/login"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center py-3 bg-[#FF1E42] hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition"
                  >
                    {t.nav.login}
                  </a>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden flex items-center justify-center w-10 h-10 -mr-2 text-foreground hover:text-[#FF1E42] transition-colors"
        aria-label="Abrir menú"
        aria-expanded={isOpen}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>

      {mounted ? createPortal(overlay, document.body) : null}
    </>
  );
}
