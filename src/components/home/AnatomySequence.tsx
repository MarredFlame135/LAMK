// src/components/home/AnatomySequence.tsx
//
// "Anatomía de un par verificado" — secuencia de despiece atada al scroll.
//
// Qué comunica (regla de CLAUDE.md: una animación nueva tiene que justificarse
// por lo que dice, no por verse bien): la promesa de autenticidad que ya está
// escrita en la ficha de producto (`t.product.authenticGuarantee`, "producto
// 100% verificado") nunca tuvo una imagen detrás. Aquí el tenis se abre capa
// por capa mientras bajas — suela, entresuela, plantilla, corte, agujetas —
// que es literalmente cómo se autentica un par. El scroll no decora: es el
// gesto de desarmar.
//
// Cómo está hecho: NO es un video ni un GIF. Es una secuencia de fotogramas
// (WebP) dibujados en un <canvas>, donde el índice del cuadro lo manda el
// progreso del scroll. Es el mismo patrón que usan las páginas de producto de
// Apple. Motivo de no usar <video> + `currentTime`: el seek de video en scroll
// se atora feo en Safari/iOS; una secuencia de imágenes ya decodificadas se
// dibuja en microsegundos y responde 1:1 al dedo.
//
// Los fotogramas se generaron con Higgsfield (imagen de despiece + video
// interpolado armado→despiezado) y se extrajeron/comprimieron con ffmpeg —
// ver `scripts/anatomy-frames.sh` y la regla de la Fase 3 sobre comprimir
// cualquier imagen de Higgsfield antes de que entre a `public/`.
//
// Presupuesto de peso: se sirven dos juegos de cuadros (escritorio y móvil) y
// solo se descarga uno, y solo cuando la sección ya viene entrando al
// viewport (IntersectionObserver con margen) — no en la carga inicial de la
// home, para no tocar el LCP.

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useReducedMotion } from 'framer-motion';
import { ANATOMY_SEQUENCE } from '@/lib/anatomy-sequence';
import { useApp } from '@/context/AppContext';

// Cuánto scroll dura el despiece. 300vh = la sección ocupa 3 pantallas de
// scroll con el lienzo fijo; menos que eso y el despiece pasa demasiado
// rápido para leerse, más y se siente que la página se atoró.
const SCROLL_LENGTH_VH = 320;

// El índice de cuadro persigue al scroll con un suavizado EXPONENCIAL en vez
// de saltar al valor exacto: cada frame avanza una fracción fija de lo que
// falta (`restante * CATCH_UP`), así que la aproximación es rápida al
// principio y se va frenando sola al llegar — sin duración fija ni curva que
// calcular. Con trackpad/rueda el progreso del scroll llega a brincos, y sin
// esto el despiece se ve escalonado.
//
// 0.16: se alcanza prácticamente en ~6 cuadros a 60 FPS. Se bajó de 0.18 para
// unificar el criterio de suavizado del sitio en un solo valor.
//
// El resultado se pinta DIRECTO al <canvas> dentro del propio
// requestAnimationFrame — nunca pasa por estado de React, así que ni un solo
// frame provoca un re-render.
const CATCH_UP = 0.16;

type Beat = { from: number; index: string; title: string; body: string };

export function AnatomySequence() {
  const { t } = useApp();
  const prefersReducedMotion = useReducedMotion();

  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const framesRef = useRef<HTMLImageElement[]>([]);
  const targetRef = useRef(0); // cuadro que pide el scroll
  const currentRef = useRef(0); // cuadro que se está dibujando (persigue al anterior)
  const rafRef = useRef<number | null>(null);
  const lastDrawnRef = useRef(-1);

  const inViewRef = useRef(false); // ¿vale la pena tener un rAF corriendo?

  const [ready, setReady] = useState(false); // ya hay suficiente para empezar
  const [beatIndex, setBeatIndex] = useState(0);

  // `useReducedMotion` lee la media query en el primer render del cliente, y
  // el servidor no puede saberla — si el JSX dependiera de ella directamente,
  // el servidor mandaría el <canvas> y el cliente montaría un <img>, y React
  // tira toda la hidratación de la página ("Hydration failed... the entire
  // root will switch to client rendering"). Se reprodujo con la media query
  // emulada en el navegador.
  //
  // Por eso hay dos valores: los EFECTOS usan `reduced` (media query + opt-in)
  // (así nunca se descargan los 96 cuadros ni arranca el rAF para alguien que
  // pidió menos movimiento), y el JSX usa `reducedUI`, que se queda en false
  // hasta después de montar. El servidor y el primer render del cliente
  // coinciden; el cambio a la versión fija pasa un frame después, sin que se
  // alcance a ver (el lienzo todavía está en negro).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Escape explícito para quien tiene "reducir movimiento" prendido en el
  // sistema pero SÍ quiere ver el despiece.
  //
  // El caso real que lo motivó: en Windows 11 el interruptor de Accesibilidad
  // › Efectos visuales › Efectos de animación afecta a TODO el sistema, y
  // mucha gente lo trae apagado sin saberlo (o para que el sistema se sienta
  // más rápido). Para esa persona la sección se veía como una foto fija y
  // parecía rota, no accesible.
  //
  // La preferencia se sigue respetando POR DEFECTO —no se descarga ni un
  // cuadro ni arranca ningún rAF hasta que la persona lo pide— pero deja de
  // ser una puerta cerrada. Es opt-in por sesión: no se guarda nada.
  const [motionOptIn, setMotionOptIn] = useState(false);
  const reduced = Boolean(prefersReducedMotion) && !motionOptIn;
  const reducedUI = mounted && reduced;

  const beats: Beat[] = [
    { from: 0.0, index: '01', title: t.anatomy.beat1Title, body: t.anatomy.beat1Body },
    { from: 0.38, index: '02', title: t.anatomy.beat2Title, body: t.anatomy.beat2Body },
    { from: 0.74, index: '03', title: t.anatomy.beat3Title, body: t.anatomy.beat3Body },
  ];

  // --- Dibujo -------------------------------------------------------------
  // `object-fit` a mano, porque el ajuste correcto depende de la forma de la
  // pantalla y no siempre es el mismo:
  //
  // - Pantalla apaisada (escritorio, tablet horizontal): `cover`. El cuadro
  //   es 16:9 y la pantalla también, más o menos — recorta poquito y llena
  //   todo, que es lo que le da el efecto de "sala oscura".
  // - Pantalla vertical (celular): `contain`. Con `cover` habría que recortar
  //   tantísimo a los lados que el despiece se ve como una tira: se pierden
  //   las agujetas de arriba y la suela de abajo, justo lo que se quería
  //   enseñar. `contain` no cuesta nada aquí porque el fondo del cuadro ya es
  //   negro puro igual que el lienzo — el "letterbox" es invisible.
  //
  // El umbral 1.2 (y no 1.0) deja del lado de `contain` también a las
  // pantallas casi cuadradas, donde `cover` ya recorta de más.
  const draw = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Si el cuadro que pide el scroll todavía no termina de bajar, se dibuja
    // el más cercano que SÍ esté listo en vez de no dibujar nada. Sin esto, en
    // una conexión lenta el lienzo se quedaba en negro mientras la persona ya
    // estaba scrolleando dentro de la sección — se leía como roto, no como
    // "cargando". Los cuadros bajan en cascada desde el 0, así que el vecino
    // ya cargado casi siempre está unos pocos cuadros atrás.
    const frames = framesRef.current;
    const isReady = (i: number) => {
      const im = frames[i];
      return Boolean(im && im.complete && im.naturalWidth > 0);
    };
    let index = frameIndex;
    if (!isReady(index)) {
      let found = -1;
      for (let d = 1; d < frames.length; d += 1) {
        if (isReady(index - d)) { found = index - d; break; }
        if (isReady(index + d)) { found = index + d; break; }
      }
      if (found < 0) return; // todavía no hay ni un cuadro: negro y ya
      index = found;
    }

    const img = frames[index];
    if (!img) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const { width: cw, height: ch } = canvas;
    const fitToWidth = cw / ch >= 1.2;
    const scale = fitToWidth
      ? Math.max(cw / img.naturalWidth, ch / img.naturalHeight)
      : Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    // Se registra el cuadro REALMENTE dibujado, no el pedido. Así, si se
    // dibujó un sustituto, el bucle sigue viendo una diferencia contra el
    // objetivo y vuelve a intentarlo hasta que el bueno termine de cargar.
    lastDrawnRef.current = index;
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Se limita el DPR a 2: en pantallas 3x el lienzo pesaría el doble de
    // píxeles para una diferencia que nadie ve en una foto con desenfoque.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    draw(Math.max(0, lastDrawnRef.current));
  }, [draw]);

  // --- Carga de los cuadros ----------------------------------------------
  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    if (!section) return;

    let cancelled = false;
    let started = false;

    const start = () => {
      if (started) return;
      started = true;

      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      const variant = isMobile ? ANATOMY_SEQUENCE.mobile : ANATOMY_SEQUENCE.desktop;
      const total = ANATOMY_SEQUENCE.frameCount;

      framesRef.current = new Array(total);
      let loaded = 0;

      // Se cargan en cascada de 8 en 8 en vez de disparar 96 peticiones de
      // golpe: así el primer cuadro (el que decide cuándo se ve algo) no
      // compite con los últimos, que no se necesitan hasta el final del
      // scroll. El navegador tampoco encola 96 conexiones.
      const CHUNK = 8;
      const loadFrom = (start: number) => {
        if (cancelled || start >= total) return;
        const end = Math.min(start + CHUNK, total);
        let pending = end - start;
        for (let i = start; i < end; i += 1) {
          const img = new window.Image();
          img.decoding = 'async';
          img.src = `${variant.path}/${ANATOMY_SEQUENCE.name(i)}`;
          framesRef.current[i] = img;
          const done = () => {
            loaded += 1;
            if (loaded === 1 && !cancelled) { setReady(true); draw(0); }
            pending -= 1;
            if (pending === 0) loadFrom(end);
          };
          img.onload = done;
          img.onerror = done; // un cuadro que falle no debe congelar la cascada
        }
      };
      loadFrom(0);
    };

    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { start(); io.disconnect(); } },
      { rootMargin: '150% 0px' }, // empieza a bajar cuadros ~1.5 pantallas antes
    );
    io.observe(section);

    return () => { cancelled = true; io.disconnect(); };
  }, [reduced, draw]);

  // --- Scroll → cuadro ----------------------------------------------------
  //
  // El progreso se mide leyendo la posición real de la sección en cada cuadro
  // de animación, no con `useScroll` de framer-motion. Motivo concreto, no
  // preferencia: `useScroll` cachea la medición del elemento y solo la
  // recalcula en ciertos eventos, así que si algo ARRIBA de esta sección
  // cambia de alto después (las fotos de producto de las secciones previas
  // cargan tarde y recorren la página), el progreso queda desfasado hasta que
  // el usuario vuelve a mover el scroll. Se reprodujo: parado a mitad de la
  // sección, el lienzo seguía mostrando el primer cuadro.
  //
  // Leer `getBoundingClientRect()` una vez por cuadro es barato — es una sola
  // lectura al principio del frame, antes de dibujar, y el canvas no invalida
  // el layout. Además el rAF solo corre mientras la sección está en pantalla.
  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    if (!section) return;

    const total = ANATOMY_SEQUENCE.frameCount;
    const thresholds = beats.map((b) => b.from);

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (!inViewRef.current) return;

      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const progress = travel <= 0 ? 0 : Math.min(Math.max(-rect.top / travel, 0), 1);

      targetRef.current = progress * (total - 1);

      // El texto sí es estado de React, pero solo cambia 3 veces en toda la
      // sección — no una vez por cuadro.
      let next = 0;
      for (let i = 0; i < thresholds.length; i += 1) if (progress >= thresholds[i]) next = i;
      setBeatIndex((prev) => (prev === next ? prev : next));

      const diff = targetRef.current - currentRef.current;
      currentRef.current += Math.abs(diff) < 0.01 ? diff : diff * CATCH_UP;
      const frame = Math.round(currentRef.current);
      if (frame !== lastDrawnRef.current) draw(frame);
    };
    rafRef.current = requestAnimationFrame(tick);

    // Fuera de pantalla el bucle no hace nada: sin esto, la home dejaría un
    // rAF leyendo layout 60 veces por segundo hasta el pie de página.
    const io = new IntersectionObserver(
      (entries) => { inViewRef.current = entries.some((e) => e.isIntersecting); },
      { rootMargin: '10% 0px' },
    );
    io.observe(section);

    return () => {
      io.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // `beats` se reconstruye en cada render por el idioma, pero solo se leen
    // los umbrales `from`, que son constantes — no hace falta re-montar esto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, draw]);

  useEffect(() => {
    if (reduced) return;
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [reduced, resize]);

  // --- prefers-reduced-motion --------------------------------------------
  // Nada de lienzo, nada de scroll secuestrado: se enseña el despiece ya
  // terminado como una sola foto. La sección sigue diciendo lo mismo.
  if (reducedUI) {
    return (
      <section className="relative bg-black">
        <div className="relative aspect-[16/9] w-full">
          <Image
            src={ANATOMY_SEQUENCE.staticFallback}
            alt={t.anatomy.imageAlt}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5A059]">{t.anatomy.eyebrow}</p>
          <h2 className="font-display text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">{t.anatomy.title}</h2>
          <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">{t.anatomy.beat3Body}</p>

          {/* Sin este botón, alguien con "reducir movimiento" prendido en el
              sistema veía una foto fija y concluía que la sección estaba rota.
              Se respeta la preferencia por defecto y se ofrece la salida, en
              vez de decidir por la persona en los dos sentidos. */}
          <button
            type="button"
            onClick={() => setMotionOptIn(true)}
            className="mt-4 rounded-full border border-zinc-700 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-300 transition-colors hover:border-[#FF1E42] hover:text-white"
          >
            {t.anatomy.playCta}
          </button>
          <p className="pt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
            {t.anatomy.reducedMotionNote}
          </p>
        </div>
      </section>
    );
  }

  const beat = beats[beatIndex];

  return (
    <section
      ref={sectionRef}
      aria-label={t.anatomy.title}
      className="relative bg-black"
      style={{ height: `${SCROLL_LENGTH_VH}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />

        {/* Alternativa accesible al lienzo, que para un lector de pantalla es
            un cuadro vacío. */}
        <span className="sr-only">{t.anatomy.imageAlt}</span>

        {/* Mientras bajan los primeros cuadros: negro liso, no un spinner.
            La sección entra desde una home que ya es negra, así que el vacío
            no se lee como "roto", se lee como corte a negro. */}
        {!ready && <div className="absolute inset-0 bg-black" aria-hidden />}

        {/* Viñeta: el despiece deja los bordes del cuadro casi vacíos, y el
            texto se apoya ahí. Esto le da piso sin taparlo. */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60"
          aria-hidden
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 px-4 pt-24 sm:pt-28">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059]">
              {t.anatomy.eyebrow}
            </p>
            <h2 className="font-display text-4xl font-black uppercase leading-none tracking-tight text-white sm:text-6xl">
              {t.anatomy.title}
            </h2>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-16">
          <div className="mx-auto flex max-w-7xl items-start gap-5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF1E42] pt-1">
              {beat.index}
            </span>
            {/* `key` fuerza el re-montaje en cada beat, que es lo que dispara
                la animación de entrada del texto (CSS, no framer-motion: son
                3 cambios en toda la sección, no vale una máquina de estados). */}
            <div key={beat.index} className="anatomy-beat max-w-md space-y-1.5">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-zinc-100">
                {beat.title}
              </p>
              <p className="text-sm leading-relaxed text-zinc-400">{beat.body}</p>
            </div>
          </div>
        </div>

        {/* Barra de progreso del despiece. No es cromo: es la única señal de
            cuánto falta, porque la sección se queda fija mientras dura. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" aria-hidden>
          <div
            className="h-px bg-[#FF1E42] transition-[width] duration-150 ease-out"
            style={{ width: `${((beatIndex + 1) / beats.length) * 100}%` }}
          />
        </div>
      </div>
    </section>
  );
}
