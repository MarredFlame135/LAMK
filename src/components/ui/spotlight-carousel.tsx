// src/components/ui/spotlight-carousel.tsx
//
// Vitrina "una pieza a la vez": el producto activo flota ENCIMA de su propio
// nombre en tipografía gigante, y los vecinos se asoman recortados por los
// bordes de la pantalla. Reemplaza al coverflow 3D en el carrusel insignia
// del home (ver DropsCoverflow.tsx).
//
// Por qué cambia el enfoque: el coverflow mostraba 5 tarjetas chiquitas a la
// vez, todas del mismo tamaño de miniatura — el producto nunca llegaba a ser
// el protagonista. Aquí solo hay UNA pieza grande y el resto es contexto
// periférico. Es la diferencia entre un estante y un aparador.
//
// LA BANDA ES CLARA A PROPÓSITO, en un sitio que es negro. Dos razones, y la
// primera es técnica, no estética:
//
// 1. Las fotos reales de Shopify vienen del mismo pipeline de estudio: el
//    producto flotando con sombra sobre un fondo gris de estudio, SIN canal
//    alfa. Sobre fondo negro eso se vería como un recuadro gris flotando.
//    Con la banda clara el fondo de la foto y el de la sección quedan en el
//    mismo rango tonal, y el difuminado de `PHOTO_MASK` se come la diferencia
//    que quede. No hace falta recortar fondos — algo que de todos modos no se
//    podría prehornear con un catálogo vivo de 265 piezas que además cambia
//    según el Hype.
// 2. Una interrupción clara a media página oscura es un recurso editorial
//    real (SSENSE, KITH): el ojo la lee como "otra sala", no como un bloque
//    más del mismo scroll.
//
// Consecuencia a no olvidar: dentro de esta banda los colores van
// HARDCODEADOS, no con tokens de tema. Si usara `text-foreground`, en modo
// claro el texto seguiría siendo oscuro (bien) pero en modo oscuro saldría
// crema sobre crema. La banda no cambia con el tema porque las fotos que
// contiene tampoco cambian.

'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { EASE_LUXURY } from '@/lib/motion';

export interface SpotlightItem {
  id: string;
  image: string;
  /** Nombre para la tipografía gigante — ya viene limpio desde el consumidor. */
  name: string;
  /** Línea de datos reales bajo la pieza (precio, HEAT, estado de stock). */
  meta: string[];
  href: string;
}

// Paleta local de la banda. Fuera de esta sección NO se usan estos valores.
//
// `BAND_BG` se eligió MIDIENDO el fondo de estudio de las fotos que salen hoy
// en la vitrina (#E2E2E3, #D6D6D6, #CFCFD0, #ADADAD, varias con degradado). Un
// crema más claro que todas ellas hacía que TODAS dejaran un halo oscuro
// alrededor; este valor cae dentro del rango, así que la diferencia se reparte
// y lo que queda se lee como viñeta de reflector, no como recuadro pegado.
const BAND_BG = '#DFDCD4';
const INK = '#14110E';
const INK_SOFT = '#6E6A61';
const CRIMSON = '#FF1E42';

// Cómo se esconde el recuadro gris de las fotos.
//
// El problema de fondo: las fotos de Shopify son cuadradas (3000×3000) con el
// producto al centro, sobre un fondo de estudio gris SIN canal alfa. Medido en
// las piezas que hoy salen en la vitrina, ese gris va de #E2E2E3 a #ADADAD y
// varias traen degradado — o sea que NO se puede igualar con un color de fondo
// fijo. Hay que desvanecer la orilla, no empatar el tono.
//
// `PHOTO_MASK` desvanece el 10% exterior del cuadro, que es puro fondo de
// estudio en todos los productos. Con el tono de banda ya dentro del rango
// (ver BAND_BG), lo que queda se lee como viñeta de reflector.
const PHOTO_MASK =
  'radial-gradient(ellipse 50% 50% at 50% 48%, #000 90%, transparent 100%)';

// La foto se ajusta COMPLETA al escenario (100%), sin ampliar.
//
// El primer intento la ampliaba al 140% para que el tenis se viera más grande,
// y para tapar el corte de arriba y abajo hacía falta un segundo difuminado
// pegado al escenario. Funcionaba con tenis —anchos y bajos, con fondo de
// sobra arriba y abajo— y se rompía con el resto del catálogo: al hoodie le
// borraba la capucha y el ruedo, porque la ropa sí llena el cuadro a lo alto.
//
// El catálogo tiene sneakers, ropa, gorras y joyería. Sin saber la forma del
// producto (y no se puede saber sin analizar los píxeles de cada foto), la
// única regla que funciona para todas es no recortar nada. El tamaño se
// recupera con un escenario más alto, no ampliando la foto.
const ITEM_SCALE_H = '100%';

// Cada cuánto avanza solo. Largo a propósito: la pieza es grande y hay que
// darle tiempo a que se lea el nombre completo antes de cambiarla.
const AUTOPLAY_MS = 6500;

/** Tamaño de la tipografía gigante en función de qué tan largo es el nombre. */
function displayFontSize(name: string): string {
  // ~0.62em de ancho por carácter en Space Grotesk black en mayúsculas. Se
  // despeja el tamaño que hace que el nombre ocupe ~92vw y se acota para que
  // un nombre de 3 letras no se coma la pantalla ni uno de 40 desaparezca.
  const vw = Math.max(3.2, Math.min(13, 92 / (0.62 * Math.max(name.length, 1))));
  return `clamp(1.75rem, ${vw.toFixed(2)}vw, 11rem)`;
}

interface SpotlightCarouselProps {
  items: SpotlightItem[];
  onActiveChange?: (item: SpotlightItem, position: number) => void;
  onItemClick?: (item: SpotlightItem, position: number) => void;
}

export function SpotlightCarousel({ items, onActiveChange, onItemClick }: SpotlightCarouselProps) {
  const [active, setActive] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const headingId = useId();

  // Hacia dónde va el cambio: +1 avanza, -1 retrocede. La transición es
  // direccional (la pieza entra por el lado del que viene y el nombre gigante
  // se mueve al revés, en paralaje), y sin esto todo entraría siempre por la
  // derecha, incluso al retroceder — que es justo lo que hace que un carrusel
  // se sienta barato.
  const [direction, setDirection] = useState(1);

  // Escape para quien tiene "reducir movimiento" prendido en el sistema pero
  // sí quiere que la vitrina avance sola. Misma decisión que en
  // AnatomySequence: la preferencia manda por defecto, pero no es una puerta
  // cerrada — el botón de abajo es el interruptor.
  const [motionOptIn, setMotionOptIn] = useState(false);
  const reduced = Boolean(prefersReducedMotion) && !motionOptIn;

  // `reduced` NO puede tocar lo que se RENDERIZA sin pasar por aquí.
  //
  // El servidor no conoce la media query, así que da false; el cliente con
  // "reducir movimiento" da true. Si el texto del botón (o cualquier otra
  // cosa del HTML) dependiera directo de `reduced`, el servidor mandaría
  // "Pausar" y el cliente montaría "Reproducir" — y React tira la hidratación
  // de TODA la página. Se reprodujo exactamente así al agregar este botón.
  //
  // Regla para este archivo: los EFECTOS usan `reduced`; el JSX usa
  // `reducedUI`, que se queda en false hasta después de montar.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const reducedUI = mounted && reduced;

  // Los callbacks van por ref para que cambiar de identidad en el consumidor
  // no reinicie el temporizador de autoplay en cada render.
  const onActiveChangeRef = useRef(onActiveChange);
  const onItemClickRef = useRef(onItemClick);
  useEffect(() => { onActiveChangeRef.current = onActiveChange; }, [onActiveChange]);
  useEffect(() => { onItemClickRef.current = onItemClick; }, [onItemClick]);

  const count = items.length;

  // `active` espejeado en una ref para poder calcular la dirección sin meter
  // un efecto secundario dentro del updater de `setActive` (los updaters de
  // React tienen que ser puros; en modo estricto se ejecutan dos veces).
  const activeRef = useRef(0);
  useEffect(() => { activeRef.current = active; }, [active]);

  const goTo = useCallback((i: number) => {
    const next = ((i % count) + count) % count;
    const prev = activeRef.current;
    if (next === prev) return;
    // Distancia más corta por el círculo: ir de la última pieza a la primera
    // es "adelante", no un salto de 5 piezas hacia atrás.
    let delta = next - prev;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    setDirection(delta >= 0 ? 1 : -1);
    activeRef.current = next;
    setActive(next);
  }, [count]);

  useEffect(() => {
    const item = items[active];
    if (item) onActiveChangeRef.current?.(item, active);
  }, [active, items]);

  // Autoplay. NO se renderiza nada distinto según la media query de
  // movimiento — solo se apaga el temporizador. Renderizar otro árbol según
  // una media query que el servidor no conoce rompe la hidratación de toda la
  // página (pasó en AnatomySequence y sigue pasando en coverflow-carousel.tsx).
  const autoplayOn = !reduced && !userPaused && !isHovering && count > 1;
  useEffect(() => {
    if (!autoplayOn) return;
    // `activeRef` no se toca aquí: el efecto de sincronización de arriba lo
    // pone al día después del render. Meterlo dentro del updater volvería a
    // hacer impuro el updater.
    const id = setInterval(() => {
      setDirection(1);
      setActive((a) => (a + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [autoplayOn, count]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setUserPaused(true); goTo(active + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setUserPaused(true); goTo(active - 1); }
  };

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 60) return;
    setUserPaused(true);
    goTo(active + (info.offset.x < 0 ? 1 : -1));
  };

  if (count === 0) return null;
  const current = items[active];

  return (
    <section
      aria-labelledby={headingId}
      className="relative isolate overflow-hidden"
      style={{ backgroundColor: BAND_BG }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Retícula de puntos: le da textura de papel técnico a la banda y, de
          paso, una referencia visual de que el producto flota sobre algo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(${INK}22 1px, transparent 1px)`,
          backgroundSize: '22px 22px',
        }}
      />

      <div className="relative mx-auto flex max-w-7xl items-end justify-between gap-4 px-4 pt-12 sm:pt-16">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: INK_SOFT }}>
            // CURADURÍA LAMK
          </p>
          <h2
            id={headingId}
            className="mt-1 font-display text-2xl font-black uppercase tracking-tight sm:text-3xl"
            style={{ color: INK }}
          >
            DROPS PRINCIPALES
          </h2>
        </div>

        {/* Control de pausa visible: la vitrina avanza sola, y la Fase 6 dejó
            establecido que eso necesita una forma explícita de detenerlo, no
            solo "quítale el mouse de encima".
            Va aquí arriba y no al final de las pastillas porque ahí lo tapaba
            el widget flotante de TENISIN, que vive fijo en la esquina inferior
            derecha de la pantalla. */}
        {count > 1 && (
          <button
            type="button"
            onClick={() => {
              // Un mismo botón para dos situaciones distintas: si la vitrina
              // está detenida porque el SISTEMA pide menos movimiento, el clic
              // es el permiso explícito para que avance sola; si no, es la
              // pausa de toda la vida.
              if (reduced) { setMotionOptIn(true); setUserPaused(false); return; }
              setUserPaused((p) => !p);
            }}
            aria-pressed={reducedUI || userPaused}
            className="shrink-0 rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors"
            style={{ color: reducedUI || userPaused ? CRIMSON : INK_SOFT, borderColor: `${INK}22` }}
          >
            {reducedUI || userPaused ? 'Reproducir' : 'Pausar'}
          </button>
        )}
      </div>

      {/* Cuánto falta para que cambie sola. No es cromo: la vitrina se mueve
          sin que nadie la toque y esto es lo único que lo explica antes de que
          pase. Se remonta con `key` en cada pieza, que es lo que reinicia la
          barra desde cero. Solo aparece cuando de verdad está corriendo. */}
      {mounted && autoplayOn && (
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="h-px w-full" style={{ backgroundColor: `${INK}1A` }}>
            <motion.div
              key={`${current.id}-progress`}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: AUTOPLAY_MS / 1000, ease: 'linear' }}
              className="h-px"
              style={{ backgroundColor: CRIMSON }}
            />
          </div>
        </div>
      )}

      {/* Escenario a todo lo ancho (fuera del max-w-7xl) para que a los vecinos
          los recorte la ORILLA DE LA PANTALLA y no un contenedor invisible —
          es lo que hace que se lean como "hay más piezas allá afuera". */}
      <div
        role="group"
        aria-roledescription="carrusel"
        aria-label="Drops principales"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative mt-4 h-[24rem] w-full outline-none focus-visible:ring-2 focus-visible:ring-[#FF1E42] sm:mt-2 sm:h-[40rem]"
      >
        {/* Nombre gigante DETRÁS de la pieza. aria-hidden porque el nombre ya
            se anuncia en el enlace de la pieza activa — leerlo dos veces solo
            estorba.
            SOLO en pantallas anchas (`hidden sm:flex`). En celular el producto
            ocupa el ancho completo y del nombre solo asomaban una o dos letras
            sueltas en las orillas: se leía como basura, no como diseño. Se
            probó subirlo para que el producto le pisara la parte de abajo y
            seguía sin haber espacio. Ahí el nombre lo carga la pastilla activa
            de abajo, que ya lo muestra completo y legible. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden items-center justify-center overflow-hidden sm:flex"
        >
          {/* Paralaje: el nombre entra desde el lado CONTRARIO al que entra la
              pieza, y recorre menos distancia. Es el truco más barato que hay
              para que dos planos se lean como si estuvieran a distinta
              profundidad — sin él, texto y producto viajan pegados y la
              transición se siente plana. */}
          <motion.span
            key={current.id}
            initial={{ opacity: 0, x: -direction * 90 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduced ? 0 : 0.7, ease: EASE_LUXURY }}
            className="whitespace-nowrap font-display font-black uppercase leading-none tracking-tighter"
            style={{ color: INK, fontSize: displayFontSize(current.name) }}
          >
            {current.name}
          </motion.span>
        </div>

        {/* Piezas. Solo se montan la activa y sus dos vecinas inmediatas: con 5
            productos, montar los 5 significaría pedir 5 fotos de Shopify de
            3000×3000 de golpe. */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragStart={() => setUserPaused(true)}
          onDragEnd={onDragEnd}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
          {items.map((item, i) => {
            let offset = i - active;
            // Envolvente: con 5 piezas, la #4 vista desde la #0 es "-1", no "+4".
            if (offset > count / 2) offset -= count;
            if (offset < -count / 2) offset += count;
            if (Math.abs(offset) > 1) return null;

            const isActive = offset === 0;
            return (
              <motion.a
                key={item.id}
                href={item.href}
                aria-hidden={!isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={(e) => {
                  if (!isActive) {
                    e.preventDefault();
                    setUserPaused(true);
                    goTo(i);
                  } else {
                    onItemClickRef.current?.(item, i);
                  }
                }}
                // De dónde sale una pieza que acaba de aparecer. Sin esto,
                // la pieza que entra al escenario se materializaba en su sitio
                // (solo se montan la activa y sus dos vecinas, así que la
                // tercera aparece de la nada). Ahora entra volando desde fuera
                // de cuadro, girada, y se endereza.
                initial={{
                  x: `${direction * 120}%`,
                  scale: 0.45,
                  opacity: 0,
                  rotate: direction * 8,
                }}
                animate={{
                  // 55% y no más: a 64% el vecino, ya reducido al 60%, quedaba
                  // justo fuera de la pantalla y no se asomaba nada.
                  x: `${offset * 55}%`,
                  scale: isActive ? 1 : 0.6,
                  opacity: isActive ? 1 : 0.85,
                  // Las vecinas quedan ligeramente giradas hacia afuera: es lo
                  // que da la sensación de estar viendo un carrusel físico
                  // desde el centro y no tres fotos alineadas.
                  rotate: offset * 5,
                  // Profundidad de campo real, como en la foto macro: solo la
                  // pieza activa está enfocada. Es un valor fijo por estado, no
                  // un filtro animándose cada cuadro — el navegador lo resuelve
                  // en la GPU al hacer la transición y no cuesta.
                  filter: isActive ? 'blur(0px)' : 'blur(3px)',
                }}
                transition={{ duration: reduced ? 0 : 0.75, ease: EASE_LUXURY }}
                style={{ zIndex: isActive ? 20 : 10 }}
                // Los vecinos se ocultan en celular: en 390 px de ancho no "se
                // asoman", se encaraman sobre la pieza activa. Es CSS y no una
                // condición en JS para no arriesgar otro desajuste de
                // hidratación (ver el comentario del autoplay).
                className={
                  isActive
                    ? 'absolute inset-0 flex items-center justify-center'
                    : 'absolute inset-0 hidden items-center justify-center sm:flex'
                }
              >
                <div
                  className="relative aspect-square"
                  style={{ height: ITEM_SCALE_H, WebkitMaskImage: PHOTO_MASK, maskImage: PHOTO_MASK }}
                >
                  <Image
                    src={item.image}
                    alt={isActive ? item.name : ''}
                    fill
                    // Las fotos originales son PNG de 3000×3000 (~3.5 MB). Sin
                    // un `sizes` correcto, next/image serviría una variante
                    // mucho más grande de la que realmente se ve.
                    sizes="(max-width: 640px) 90vw, 60vw"
                    priority={isActive && active === 0}
                    className="object-contain"
                    draggable={false}
                  />
                </div>
              </motion.a>
            );
          })}
        </motion.div>
      </div>

      {/* Datos REALES de la pieza activa. No hay copy descriptivo aquí a
          propósito: solo 8 de los 265 productos de Shopify traen descripción y
          `storytelling.storySummary` es la misma frase genérica para todos —
          ponerla debajo de cada pieza diría lo mismo 5 veces y se leería como
          relleno. Precio, HEAT y estado de stock sí cambian por pieza. */}
      <div className="relative mx-auto max-w-7xl px-4">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.4, ease: EASE_LUXURY }}
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.15em]"
          style={{ color: INK_SOFT }}
        >
          {current.meta.map((m, i) => (
            <React.Fragment key={m}>
              {i > 0 && <span aria-hidden style={{ color: `${INK_SOFT}66` }}>·</span>}
              <span>{m}</span>
            </React.Fragment>
          ))}
        </motion.div>
      </div>

      {/* Selector por nombre. Reemplaza a los puntos anónimos del coverflow:
          aquí la navegación también te dice qué más hay en la vitrina. */}
      <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 px-4 pb-10 pt-6">
        {items.map((item, i) => {
          const isActive = i === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { setUserPaused(true); goTo(i); }}
              aria-current={isActive}
              className="rounded-full border px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors"
              style={{
                backgroundColor: isActive ? INK : 'transparent',
                color: isActive ? BAND_BG : INK_SOFT,
                borderColor: isActive ? INK : `${INK}22`,
              }}
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
