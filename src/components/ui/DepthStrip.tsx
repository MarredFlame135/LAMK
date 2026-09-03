// src/components/ui/DepthStrip.tsx
//
// Una tira horizontal de producto que **se mueve sola** y tiene **profundidad
// 3D real** (no una imitación con escala).
//
// --- La idea, y por qué esta y no un coverflow ---
//
// Un coverflow es el efecto de iTunes 2005: tarjetas abanicadas alrededor de
// una central. No dice nada sobre este negocio. Lo que sí existe en el mundo
// de LAMK es **el muro de una sneaker store**: una repisa larga vista de lado,
// donde las piezas del centro te miran de frente y las de las orillas se van
// girando y hundiéndose hacia el fondo.
//
// Eso es exactamente lo que hace este componente: `perspective` en el
// contenedor, y por cada pieza `rotateY` (se gira hacia la pared) +
// `translateZ` (se aleja) + una caída de brillo, todo en función de qué tan
// lejos está del centro del encuadre. La cámara está quieta; la repisa se
// desliza.
//
// Y hay una razón práctica para que esto funcione aquí: las fotos del catálogo
// son rectángulos opacos sobre gris de estudio, sin canal alfa. Un rectángulo
// girado en Y con perspectiva se lee como un panel de una pared curva — el
// efecto trabaja CON la restricción en vez de pelearse con ella.
//
// --- Cómo se mueve, y por qué de ida y vuelta ---
//
// La deriva es continua, no de tarjeta en tarjeta, y al llegar a un extremo
// **invierte el sentido** en vez de saltar al inicio.
//
// Lo obvio habría sido duplicar la lista para un bucle infinito sin costura,
// pero eso rompe dos cosas reales de este proyecto: duplicaría las impresiones
// que mide `CarouselItemTracker` (la analítica de posición de la Fase 5
// dejaría de ser comparable) y obligaría a marcar la copia como
// `aria-hidden`, duplicando el DOM para nada. Ir y volver no tiene ninguno de
// esos costos y, para una repisa, recorrerla en los dos sentidos es el gesto
// natural.
//
// --- Rendimiento ---
//
// Ni un solo frame pasa por estado de React. El bucle de `requestAnimationFrame`
// escribe `scrollLeft` y los `transform` DIRECTO al DOM. Lo único que provoca
// re-render es pulsar el botón de pausa.

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

// Píxeles por segundo. Deliberadamente lento: esto es una repisa a la que le
// pasas la vista por encima, no un pase de diapositivas que te apura.
const SPEED_PX_S = 16;

// Cuánto gira una pieza cuando está pegada a la orilla del encuadre. Más de
// ~26° y el rectángulo de la foto empieza a leerse como un error de
// perspectiva en vez de como una pieza en la pared.
const MAX_ROTATE_DEG = 24;

// Cuánto se hunde hacia el fondo en la orilla.
const MAX_DEPTH_PX = 190;

// Cuánto se oscurece al fondo (1 = sin cambio). La luz de la sala cae con la
// distancia; sin esto, la profundidad se ve pero no se siente.
const MIN_BRIGHTNESS = 0.62;

interface DepthStripProps {
  children: React.ReactNode;
  className?: string;
  /** Etiqueta del control de pausa, para lectores de pantalla. */
  label: string;
}

export function DepthStrip({ children, className = '', label }: DepthStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(true);
  useEffect(() => setMounted(true), []);

  // El JSX nunca lee la media query cruda (patrón obligatorio del repo): en el
  // primer render del cliente esto vale false, igual que en el servidor.
  const reducedUI = mounted && prefersReducedMotion;

  // Con movimiento reducido la tira arranca quieta, pero se puede encender a
  // mano. La preferencia del sistema manda por defecto; no cancela la opción.
  // (La ronda anterior enseñó que un fallback silencioso se lee como "está
  // roto" — ver la nota de movimiento reducido en CLAUDE.md.)
  const autoplay = playing && !reducedUI;

  // Pausas temporales que NO son la decisión del usuario: el puntero encima,
  // el foco dentro, o alguien arrastrando la tira. Van en un ref porque las
  // lee el bucle de animación en cada frame y no deben provocar re-render.
  const heldRef = useRef(false);
  const directionRef = useRef(1);

  // La posición en flotante, aparte de `scrollLeft`.
  //
  // Esto NO es un lujo: a 16 px/s cada frame avanza ~0.26 px, y el navegador
  // REDONDEA `scrollLeft` al leerlo de vuelta. Leer-sumar-escribir contra la
  // propiedad se queda atrapado en el mismo entero para siempre y la tira
  // parece congelada — se ve en pantalla como que el autoplay "no funciona",
  // sin ningún error en consola. La posición real vive aquí y `scrollLeft` es
  // solo el destino donde se escribe.
  const positionRef = useRef(0);

  // `offsetLeft` se mide contra el ancestro POSICIONADO más cercano, no
  // contra el contenedor de scroll. Por eso el scroller lleva `relative` y por
  // eso este componente envuelve él mismo a cada hijo: así el elemento medido
  // siempre es hijo directo del scroller y `offsetLeft` significa lo que la
  // fórmula cree que significa. Confiar en que cada consumidor ponga el
  // atributo en el sitio correcto es pedir un bug silencioso — la tira se
  // vería casi bien, con la profundidad calculada contra el origen equivocado.
  const applyDepth = useCallback((scroller: HTMLDivElement) => {
    const viewportCenter = scroller.scrollLeft + scroller.clientWidth / 2;
    const half = scroller.clientWidth / 2 || 1;

    const items = scroller.querySelectorAll<HTMLElement>('[data-depth-item]');
    items.forEach((el) => {
      const itemCenter = el.offsetLeft + el.offsetWidth / 2;
      // -1 en la orilla izquierda, 0 en el centro, 1 en la derecha.
      const norm = Math.max(-1, Math.min(1, (itemCenter - viewportCenter) / half));
      const away = Math.abs(norm);

      el.style.transform =
        `perspective(1200px) rotateY(${-norm * MAX_ROTATE_DEG}deg) translateZ(${-away * MAX_DEPTH_PX}px)`;
      el.style.filter = `brightness(${1 - away * (1 - MIN_BRIGHTNESS)})`;
      // La pieza del centro va encima de sus vecinas, como en una repisa real.
      el.style.zIndex = String(100 - Math.round(away * 100));
    });
  }, []);

  // Profundidad. Corre siempre que haya movimiento (autoplay o scroll del
  // usuario), pero NO con movimiento reducido apagado: ahí la tira se queda
  // plana, sin transformaciones de ningún tipo.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    if (reducedUI && !playing) {
      scroller.querySelectorAll<HTMLElement>('[data-depth-item]').forEach((el) => {
        el.style.transform = '';
        el.style.filter = '';
        el.style.zIndex = '';
      });
      return;
    }

    positionRef.current = scroller.scrollLeft;
    applyDepth(scroller);
    const onScroll = () => applyDepth(scroller);
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [applyDepth, reducedUI, playing]);

  // Deriva automática.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !autoplay) return;

    let raf = 0;
    let last = 0;

    const tick = (now: number) => {
      // El primer frame no mueve nada: sin un `last` previo, el delta sería el
      // tiempo desde que arrancó la página y la tira daría un salto.
      if (last === 0) last = now;
      const deltaS = Math.min(0.05, (now - last) / 1000); // el tope evita el salto al volver de otra pestaña
      last = now;

      if (!heldRef.current) {
        const max = scroller.scrollWidth - scroller.clientWidth;
        if (max > 0) {
          let next = positionRef.current + directionRef.current * SPEED_PX_S * deltaS;
          if (next >= max) {
            next = max;
            directionRef.current = -1;
          } else if (next <= 0) {
            next = 0;
            directionRef.current = 1;
          }
          positionRef.current = next;
          scroller.scrollLeft = next;
          applyDepth(scroller);
        }
      } else {
        // Mientras la persona arrastra o hace scroll, ella manda: la posición
        // propia se re-sincroniza para que al soltar la deriva siga desde
        // donde la dejó y no dé un salto de vuelta.
        positionRef.current = scroller.scrollLeft;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoplay, applyDepth]);

  const hold = () => {
    heldRef.current = true;
  };
  const release = () => {
    heldRef.current = false;
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={scrollerRef}
        // `overflow-x-auto` y no un carrusel con botones: se puede arrastrar,
        // hacer scroll con la rueda y recorrer con el teclado, gratis y nativo.
        className="relative flex gap-6 overflow-x-auto px-[6vw] pb-6 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
        onMouseEnter={hold}
        onMouseLeave={release}
        onFocusCapture={hold}
        onBlurCapture={release}
        onPointerDown={hold}
        onPointerUp={release}
        onTouchStart={hold}
        onTouchEnd={release}
      >
        {React.Children.map(children, (child) =>
          child == null ? null : (
            <div data-depth-item className="flex-none will-change-transform">
              {child}
            </div>
          )
        )}
      </div>

      {/* La tira se mueve sola: este botón es lo único que lo anuncia y la
          única forma de detenerla. Regla del repo: un carrusel con avance
          automático necesita pausa VISIBLE, no solo pausa por hover. */}
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing && !reducedUI ? `Pausar ${label}` : `Reproducir ${label}`}
        className="absolute right-0 -top-1 flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground transition hover:text-foreground hover:border-zinc-500"
      >
        {playing && !reducedUI ? (
          <>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="5" y="4" width="5" height="16" rx="1" />
              <rect x="14" y="4" width="5" height="16" rx="1" />
            </svg>
            Pausar
          </>
        ) : (
          <>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M6 4l14 8-14 8z" />
            </svg>
            Reproducir
          </>
        )}
      </button>
    </div>
  );
}
