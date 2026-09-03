// src/components/ui/DepthStrip.tsx
//
// Una tira horizontal de producto con **profundidad 3D real** (no una
// imitación con escala). Se recorre a mano: no avanza sola.
//
// --- La idea ---
//
// Un coverflow es el efecto de iTunes 2005: tarjetas abanicadas alrededor de
// una central. No dice nada sobre este negocio. Lo que sí existe en el mundo
// de LAMK es **el muro de una sneaker store**: una repisa larga vista de lado,
// donde las piezas del centro te miran de frente y las de las orillas se van
// girando hacia la pared y hundiéndose hacia el fondo.
//
// Eso es lo que hace este componente: `perspective` en el contenedor, y por
// cada pieza `rotateY` (se gira) + `translateZ` (se aleja) + una caída de
// brillo, en función de qué tan lejos está del centro del encuadre. La cámara
// está quieta; la repisa se desliza cuando TÚ la deslizas.
//
// Y hay una razón práctica para que esto funcione aquí: las fotos del catálogo
// son rectángulos opacos sobre gris de estudio, sin canal alfa. Un rectángulo
// girado en Y con perspectiva se lee como un panel de una pared curva — el
// efecto trabaja CON la restricción en vez de pelearse con ella.
//
// --- Se recorre a mano, a propósito (2026-09-02, decisión del cliente) ---
//
// La primera versión derivaba sola, de ida y vuelta. Se retiró: el cliente
// prefiere control manual. Quitarlo se llevó por delante todo el andamiaje que
// hacía falta para que un carrusel automático no fuera hostil — el bucle de
// `requestAnimationFrame`, el botón de pausa, las pausas por hover/foco/
// arrastre, y el interruptor de `prefers-reduced-motion`. El componente pasó de
// 264 líneas a poco más de 130 sin perder nada de lo que se veía.
//
// Lo que queda es scroll nativo con enganche (`scroll-snap`) MÁS dos flechas.
//
// Las flechas no son decoración: sin ellas, en una computadora con ratón la
// tira era IMPOSIBLE de mover. En móvil se arrastra con el dedo, y por eso ahí
// siempre funcionó; pero en escritorio la barra de scroll está oculta por
// estética, la rueda vertical hace scroll de la PÁGINA (no de la tira), y solo
// quedaban dos gestos que casi nadie conoce: shift+rueda, o el deslizamiento
// horizontal de un trackpad. Quien usa ratón se quedaba sin nada.
//
// Es el costo escondido de ocultar una barra de scroll: la barra no solo se ve,
// también es el control. Al quitarla hay que reponer el control por otro lado.
//
// Las flechas avanzan de pieza en pieza (no de página en página) porque el
// enganche es `snap-center`: así cada pulsación deja exactamente una pieza
// centrada, de frente y a plena luz.
//
// --- Rendimiento ---
//
// Ni un solo frame pasa por estado de React: el manejador de scroll escribe los
// `transform` DIRECTO al DOM. Este componente no tiene más estado propio que
// `mounted`.

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

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
}

export function DepthStrip({ children, className = '' }: DepthStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Si se puede avanzar hacia cada lado. Manda deshabilitar la flecha del
  // extremo en vez de esconderla: un botón que desaparece mueve el resto de la
  // fila y deja al dedo o al cursor apuntando a otra cosa.
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const syncEdges = useCallback((scroller: HTMLDivElement) => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    // 2px de margen: los navegadores no siempre llegan al entero exacto al
    // final de un scroll suave, y sin holgura la flecha derecha se quedaba
    // habilitada para siempre en el extremo.
    setAtStart(scroller.scrollLeft <= 2);
    setAtEnd(scroller.scrollLeft >= max - 2);
  }, []);

  // Avanza UNA pieza: el ancho del primer elemento más el hueco entre piezas.
  const step = useCallback((dir: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const first = scroller.querySelector<HTMLElement>('[data-depth-item]');
    const gap = parseFloat(getComputedStyle(scroller).columnGap || '0') || 24;
    const amount = (first?.offsetWidth ?? scroller.clientWidth * 0.8) + gap;
    scroller.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }, []);

  // El JSX nunca lee la media query cruda (patrón obligatorio del repo): en el
  // primer render del cliente esto vale false, igual que en el servidor.
  //
  // Con movimiento reducido la tira se queda PLANA. Ya no hace falta ofrecer un
  // interruptor para encenderla —como sí hacía la versión automática, donde un
  // fallback silencioso se leía como "está roto"— porque una tira sin inclinar
  // no parece rota: parece una tira.
  const reducedUI = mounted && prefersReducedMotion;

  // `offsetLeft` se mide contra el ancestro POSICIONADO más cercano, no contra
  // el contenedor de scroll. Por eso el scroller lleva `relative` y por eso
  // este componente envuelve él mismo a cada hijo: así el elemento medido
  // siempre es hijo directo del scroller y `offsetLeft` significa lo que la
  // fórmula cree que significa. Confiar en que cada consumidor ponga el
  // atributo en el sitio correcto es pedir un bug silencioso — la tira se
  // vería casi bien, con la profundidad calculada contra el origen equivocado.
  const applyDepth = useCallback((scroller: HTMLDivElement) => {
    const viewportCenter = scroller.scrollLeft + scroller.clientWidth / 2;
    const half = scroller.clientWidth / 2 || 1;

    scroller.querySelectorAll<HTMLElement>('[data-depth-item]').forEach((el) => {
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

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    if (reducedUI) {
      scroller.querySelectorAll<HTMLElement>('[data-depth-item]').forEach((el) => {
        el.style.transform = '';
        el.style.filter = '';
        el.style.zIndex = '';
      });
      // Sin profundidad, pero las flechas siguen haciendo falta: con
      // movimiento reducido la tira es más plana, no menos navegable.
      syncEdges(scroller);
      const onEdges = () => syncEdges(scroller);
      scroller.addEventListener('scroll', onEdges, { passive: true });
      window.addEventListener('resize', onEdges);
      return () => {
        scroller.removeEventListener('scroll', onEdges);
        window.removeEventListener('resize', onEdges);
      };
    }

    applyDepth(scroller);
    syncEdges(scroller);
    const onScroll = () => {
      applyDepth(scroller);
      syncEdges(scroller);
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [applyDepth, syncEdges, reducedUI]);

  const arrow =
    'absolute top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full ' +
    'border border-border bg-background/85 text-foreground shadow-lg backdrop-blur transition ' +
    'hover:border-[#C5A059]/60 disabled:pointer-events-none disabled:opacity-0 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1E42] sm:flex';

  return (
    <div className="relative">
      {/* Solo desde `sm`: en un teléfono se arrastra con el dedo y dos botones
          encima de las piezas estorbarían más de lo que ayudan. */}
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={atStart}
        aria-label="Ver piezas anteriores"
        className={`${arrow} left-1`}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => step(1)}
        disabled={atEnd}
        aria-label="Ver más piezas"
        className={`${arrow} right-1`}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

    <div
      ref={scrollerRef}
      // Scroll nativo: se arrastra con el dedo, se recorre con el teclado y
      // acepta shift+rueda o el gesto horizontal del trackpad. Las flechas de
      // arriba son el control para quien usa ratón — ver la cabecera.
      //
      // El enganche (`snap`) vuelve aquí: se había quitado porque peleaba con la
      // deriva automática —el navegador corregía hacia el punto de anclaje
      // mientras el bucle movía, y salía un tirón por frame— y sin deriva ya no
      // hay con qué pelearse. Es `snap-center` y no `snap-start` porque en una
      // tira con profundidad la pieza importante es la del CENTRO: es la única
      // que queda de frente y a plena luz.
      className={`relative flex gap-6 overflow-x-auto px-[6vw] pb-6 pt-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
    >
      {React.Children.map(children, (child) =>
        child == null ? null : (
          <div data-depth-item className="flex-none snap-center will-change-transform">
            {child}
          </div>
        )
      )}
    </div>
    </div>
  );
}
