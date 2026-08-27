// src/lib/motion.ts
//
// Vocabulario de movimiento compartido. Antes cada sección definía su propio
// `fadeUp`/easing suelto (Hero, VolumetricShowcase, etc.) — funcionaba, pero
// cada una se sentía un poco distinta. Una sola curva de easing repetida en
// todo el sitio es la firma invisible de una interfaz bien pulida: el usuario
// no la nombra, pero la siente como coherencia.

// Deceleración "premium": arranca rápido y se asienta suave, sin rebote.
// Se siente sólido/pesado (como una pieza física), no elástico ni juguetón.
export const EASE_LUXURY = [0.16, 1, 0.3, 1] as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_LUXURY } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: EASE_LUXURY } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE_LUXURY } },
};

// Uso: <motion.div variants={staggerContainer(0.12)} initial="hidden" animate="show">
export function staggerContainer(staggerChildren = 0.12, delayChildren = 0) {
  return { hidden: {}, show: { transition: { staggerChildren, delayChildren } } };
}

// Excepción deliberada a EASE_LUXURY (que es a propósito "sin rebote"): un
// resorte corto SOLO para micro-interacciones táctiles puntuales (tap de
// "+ CARRITO", contador de cantidad) donde sí se busca sentir un "click"
// físico — no para animaciones de entrada, esas siguen usando fadeUp/EASE_LUXURY.
export const BOUNCE_TAP = { type: 'spring', stiffness: 500, damping: 15 } as const;
