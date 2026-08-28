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

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { ThemeAndLangSwitcher } from '@/components/ui/ThemeAndLangSwitcher';

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useApp();
  const { user, isAdmin, logout } = useAuth();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden flex items-center justify-center w-10 h-10 -mr-2 text-zinc-300 hover:text-white"
        aria-label="Abrir menú"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Fix (pedido explícito, ronda "Fase 6"): el fondo del panel
                (antes bg-background) quedaba casi indistinguible del velo
                oscuro detrás — en modo oscuro ambos son prácticamente negro
                puro, así que el panel no se leía como una superficie sólida
                y el texto se sentía "flotando" sobre algo transparente.
                `bg-card` es un tono deliberadamente distinto (no solo más
                oscuro/claro) del fondo de la página en los dos temas, y el
                velo sube a 90% de opacidad para separar mejor el panel de
                lo que hay detrás. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 right-0 z-[61] w-[80vw] max-w-xs bg-card text-foreground border-l border-border shadow-2xl md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <span className="font-display font-black text-sm uppercase tracking-tight">Menú</span>
                <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white text-xl min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Cerrar menú">✕</button>
              </div>

              <nav className="flex-1 flex flex-col p-5 gap-1 text-sm font-bold uppercase tracking-widest">
                <a href="/" onClick={() => setIsOpen(false)} className="py-3.5 border-b border-border hover:text-[#FF1E42] transition">{t.nav.home}</a>
                <a href="/catalog" onClick={() => setIsOpen(false)} className="py-3.5 border-b border-border hover:text-[#FF1E42] transition">{t.nav.catalog}</a>
                <a href="/vault" onClick={() => setIsOpen(false)} className="py-3.5 border-b border-border hover:text-[#FF1E42] transition">{t.nav.vault}</a>
                <a href="/tracking" onClick={() => setIsOpen(false)} className="py-3.5 border-b border-border hover:text-[#FF1E42] transition">Rastreo</a>
                {isAdmin && (
                  <a href="/admin/login" onClick={() => setIsOpen(false)} className="py-3.5 border-b border-border text-[#C5A059] hover:text-white transition">Admin</a>
                )}
              </nav>

              <div className="p-5 border-t border-border space-y-4">
                <ThemeAndLangSwitcher />
                {user ? (
                  <div className="flex items-center justify-between text-xs">
                    <a href="/vault" onClick={() => setIsOpen(false)} className="text-amber-400 font-bold uppercase">
                      {t.nav.hello} {user.firstName.toUpperCase()}
                    </a>
                    <button onClick={() => { logout(); setIsOpen(false); }} className="text-zinc-400 hover:text-red-400 uppercase font-bold">
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
    </>
  );
}
