// src/components/ui/WelcomeModal.tsx
//
// Aviso de bienvenida al entrar al sitio: TENISIN festejando a la izquierda,
// beneficios reales de membresía y CTA a la derecha. Referencia de estructura
// que trajo el cliente: el modal de membresía de Nike (imagen partida a la
// izquierda, copy y botones a la derecha, X en un círculo arriba).
//
// --- La animación "que se forme de las esquinas" ---
//
// Tres tiempos, en este orden:
//   1. Cuatro escuadras de encuadre (las esquinas) entran DESDE fuera de la
//      pantalla, cada una por su diagonal, y se clavan en las cuatro esquinas
//      del modal — como un visor que encuadra el objetivo antes de disparar.
//   2. El panel se abre entre ellas: crece desde el centro, primero en
//      horizontal y luego en vertical, con un clip que lo destapa.
//   3. El contenido entra en cascada y las escuadras se atenúan hasta quedar
//      como un detalle de encuadre, no como andamio.
//
// --- Cuatro decisiones que no son de estilo ---
//
// 1. NO se le muestra a quien ya inició sesión: el modal invita a hacerse
//    miembro. Enseñárselo a un miembro es ruido, y peor: pedirle que se
//    registre otra vez.
// 2. NO aparece encima del banner de privacidad. Ese banner es una
//    obligación legal (LFPDPPP) y tiene que poder contestarse; tapárselo con
//    una promoción sería exactamente el patrón oscuro que el propio aviso
//    dice no practicar. Este modal espera a que esa decisión esté tomada.
// 3. Una vez por sesión (sessionStorage, no localStorage): que reaparezca en
//    cada carga es hostil, y que no vuelva NUNCA lo hace inútil para quien
//    regresa otro día.
// 4. Con `prefers-reduced-motion` no hay escuadras ni apertura: el modal
//    simplemente aparece. La animación es adorno; el contenido no.
//
// El copy no promete nada que el sitio no haga hoy: los tres beneficios
// listados son la Bóveda real (/vault), el número de serie que el webhook
// orders/paid le pone a cada pieza comprada, y el Collector Pass con QR
// (/vault/pass). Los perks por rango salen de TIER_LADDER, no de una lista
// inventada para el modal.

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getAnalyticsConsent } from '@/lib/analytics';
import { haptics } from '@/lib/haptics';

const SEEN_KEY = 'lamk_welcome_seen_v1';

// Misma clave que escribe PrivacyConsentBanner al cerrarse. Se LEE, nunca se
// escribe desde aquí — este modal no decide nada sobre privacidad.
//
// Ojo: el banner no se cierra solo con esta clave. Su condición real es
// `noticeSeen && analyticsDecided` — son DOS decisiones distintas en la misma
// tarjeta (el aviso obligatorio y el opt-in de analítica). Al principio aquí
// solo se miraba la primera, y el modal se abría encima del banner mientras
// la segunda seguía sin contestar. Por eso abajo se reusa
// getAnalyticsConsent() de lib/analytics en vez de leer otra clave a mano:
// una sola fuente de verdad para "¿ya despachó el aviso?".
const PRIVACY_KEY = 'lamk_privacy_consent_v1';

// Cuánto espera después de que la persona ya despachó el aviso de privacidad.
// Suficiente para que el banner termine de salir y no se encimen dos capas.
const DELAY_MS = 900;

// El modal es CLARO en un sitio oscuro, y no por gusto: el arte de TENISIN
// está dibujado sobre fondo blanco y sin canal alfa (mismo caso que las fotos
// de producto en la banda del carrusel de la home). Sobre obsidiana se vería
// un recuadro blanco recortado. Además, una interrupción clara sobre una
// página oscura es justo lo que hace que se lea como "otra cosa" y no como un
// bloque más. Consecuencia: aquí los colores van HARDCODEADOS, no con tokens
// de tema — el modal no cambia con el tema porque el dibujo tampoco.
const BONE = '#F5F3ED';
const INK = '#0B0B0F';
const CRIMSON = '#FF1E42';
const GOLD = '#C5A059';

const BENEFITS = [
  { title: 'Tu Bóveda del Coleccionista', desc: 'Cada pieza que compras entra a tu closet digital.' },
  { title: 'Número de serie por pieza', desc: 'Autenticidad verificada, asignada al pagar.' },
  { title: 'Collector Pass con QR', desc: 'Comparte tu bóveda en persona, y revócalo cuando quieras.' },
];

// Las cuatro escuadras. `from` es la diagonal por la que entra cada una.
const CORNERS = [
  // -inset para que la escuadra quede POR FUERA del panel: pegada al borde
  // se la come el redondeo de la esquina y solo asoma una astilla roja.
  { key: 'tl', pos: '-top-2 -left-2', from: { x: -140, y: -140 }, path: 'M0 34 V4 A4 4 0 0 1 4 0 H34' },
  { key: 'tr', pos: '-top-2 -right-2', from: { x: 140, y: -140 }, path: 'M6 0 H36 A4 4 0 0 1 40 4 V34' },
  { key: 'bl', pos: '-bottom-2 -left-2', from: { x: -140, y: 140 }, path: 'M0 6 V36 A4 4 0 0 0 4 40 H34' },
  { key: 'br', pos: '-bottom-2 -right-2', from: { x: 140, y: 140 }, path: 'M40 6 V36 A4 4 0 0 1 36 40 H6' },
] as const;

export function WelcomeModal() {
  const { user, isLoading } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);
  // El JSX nunca lee la media query cruda (patrón obligatorio del repo: en el
  // primer render del cliente esto vale false, igual que en el servidor).
  const reducedUI = mounted && prefersReducedMotion;

  const close = useCallback(() => {
    setOpen(false);
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // sessionStorage puede fallar en modo privado — entonces reaparece en
      // la siguiente carga. Molesto, pero nunca roto.
    }
  }, []);

  useEffect(() => {
    if (isLoading || user) return; // sesión iniciada: no hay nada que ofrecer

    let seen = false;
    let privacyDecided = false;
    try {
      seen = Boolean(sessionStorage.getItem(SEEN_KEY));
      privacyDecided =
        Boolean(localStorage.getItem(PRIVACY_KEY)) && getAnalyticsConsent() !== 'undecided';
    } catch {
      // Sin storage no se puede saber si el aviso ya se contestó; en ese caso
      // NO se abre, para no arriesgarse a tapárselo.
      return;
    }
    if (seen || !privacyDecided) return;

    const timer = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, [isLoading, user]);

  // Escape cierra, y el foco se manda al botón de cerrar al abrir: es lo
  // primero que alguien necesita poder alcanzar en una capa que se le
  // atravesó sin pedirla.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    const focusTimer = setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(focusTimer);
    };
  }, [open, close]);

  // Bloquea el scroll del fondo mientras el modal está abierto. `overflow`
  // se restaura al valor que tenía, no a '' — la home usa `overflow-x: clip`
  // en el body (ver globals.css) y pisarlo rompería el sticky del despiece.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
        >
          {/* Telón. Clic fuera cierra — es una invitación, no un trámite. */}
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-default"
            aria-label="Cerrar aviso de bienvenida"
            onClick={close}
          />

          <div className="relative w-full max-w-3xl">
            {/* --- Tiempo 1: las escuadras entran desde fuera de pantalla --- */}
            {!reducedUI &&
              CORNERS.map((corner, i) => (
                <motion.svg
                  key={corner.key}
                  className={`pointer-events-none absolute ${corner.pos} h-11 w-11 z-30`}
                  viewBox="0 0 40 40"
                  fill="none"
                  aria-hidden
                  initial={{ ...corner.from, opacity: 0, scale: 1.6 }}
                  animate={{ x: 0, y: 0, opacity: [0, 1, 1, 0.9], scale: 1 }}
                  transition={{
                    duration: 0.75,
                    delay: i * 0.05,
                    ease: [0.16, 1, 0.3, 1], // salida exponencial: llega rápido y se asienta
                    opacity: { times: [0, 0.35, 0.75, 1], duration: 1.4, delay: i * 0.05 },
                  }}
                >
                  <path d={corner.path} stroke={CRIMSON} strokeWidth="2.5" strokeLinecap="round" />
                </motion.svg>
              ))}

            {/* --- Tiempo 2: el panel se abre entre las escuadras --- */}
            <motion.div
              className="relative overflow-hidden rounded-2xl shadow-2xl"
              style={{ background: BONE }}
              initial={
                reducedUI
                  ? { opacity: 0 }
                  : { opacity: 0, clipPath: 'inset(46% 46% 46% 46% round 16px)' }
              }
              animate={
                reducedUI
                  ? { opacity: 1 }
                  : { opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 16px)' }
              }
              exit={{ opacity: 0, scale: 0.97 }}
              transition={
                reducedUI
                  ? { duration: 0.2 }
                  : { duration: 0.7, delay: 0.42, ease: [0.16, 1, 0.3, 1] }
              }
            >
              <div className="grid sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
                {/* Panel de TENISIN. Se oculta abajo de sm: en 390px de ancho,
                    partir el modal deja las dos mitades inservibles. */}
                <div
                  className="relative hidden sm:block"
                  style={{ background: 'linear-gradient(160deg, #FFFFFF 0%, #EFEBE0 100%)' }}
                >
                  <div
                    className="absolute inset-0 opacity-[0.07]"
                    style={{
                      backgroundImage: "url('/assets/hero/obsidian-texture.webp')",
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                    aria-hidden
                  />
                  <motion.div
                    className="relative h-full min-h-[19rem] flex items-center justify-center p-4"
                    initial={reducedUI ? false : { opacity: 0, y: 24, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.55, delay: reducedUI ? 0 : 0.72, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Image
                      src="/assets/branding/tenisin-happy.webp"
                      alt="TENISIN, la mascota de LAMK, festejando con el puño en alto"
                      width={340}
                      height={430}
                      className="w-full max-w-[17.5rem] h-auto object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.18)]"
                      priority
                    />
                  </motion.div>
                </div>

                {/* Contenido */}
                <div className="relative p-6 sm:p-8" style={{ color: INK }}>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => {
                      haptics.tap();
                      close();
                    }}
                    className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2"
                    style={{ borderColor: `${INK}33` }}
                    aria-label="Cerrar"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.5" aria-hidden>
                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>

                  <motion.div
                    initial={reducedUI ? false : 'hidden'}
                    animate="show"
                    variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: reducedUI ? 0 : 0.78 } } }}
                    className="space-y-4"
                  >
                    {[
                      <span key="eyebrow" className="block font-mono text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: CRIMSON }}>
                        // BIENVENIDO A LAMK
                      </span>,
                      <h2 key="title" id="welcome-title" className="font-display text-2xl sm:text-3xl font-black uppercase leading-[0.95] tracking-tight pr-8">
                        Beneficios exclusivos<br />para coleccionistas
                      </h2>,
                      <ul key="list" className="space-y-2.5 pt-1">
                        {BENEFITS.map((b) => (
                          <li key={b.title} className="flex gap-2.5">
                            <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: GOLD }} aria-hidden />
                            <span>
                              <span className="block text-[13px] font-bold leading-tight">{b.title}</span>
                              <span className="block text-[12px] leading-snug" style={{ color: `${INK}A8` }}>
                                {b.desc}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>,
                      <div key="cta" className="flex flex-wrap gap-2.5 pt-2">
                        <a
                          href="/auth/register"
                          onClick={() => haptics.tap()}
                          className="rounded-full px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition hover:opacity-90"
                          style={{ background: INK }}
                        >
                          Regístrate
                        </a>
                        <a
                          href="/auth/login"
                          onClick={() => haptics.tap()}
                          className="rounded-full border px-6 py-2.5 text-[11px] font-black uppercase tracking-widest transition hover:bg-black/5"
                          style={{ borderColor: `${INK}33`, color: INK }}
                        >
                          Ingresa
                        </a>
                      </div>,
                      <p key="note" className="text-[10px] leading-snug" style={{ color: `${INK}80` }}>
                        Registrarte es gratis. Puedes seguir comprando sin cuenta, pero sin bóveda ni número de serie.
                      </p>,
                    ].map((child, i) => (
                      <motion.div
                        key={i}
                        variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {child}
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
