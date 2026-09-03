// src/lib/anatomy-sequence.ts
//
// Fuente única de verdad de la secuencia de despiece (ver
// `components/home/AnatomySequence.tsx`). Vive aparte del componente porque
// estos números tienen que coincidir exactamente con lo que dejó
// `scripts/anatomy-frames.sh` en `public/assets/anatomy/` — si algún día se
// regenera el video con otra duración, se cambia `frameCount` aquí y en
// ningún otro lado.

export const ANATOMY_SEQUENCE = {
  /** Cuántos archivos hay en cada carpeta. Tiene que coincidir con FRAMES del script. */
  frameCount: 96,

  /** `f-0001.webp` … `f-0096.webp` — patrón `%04d` de ffmpeg, ya convertido a WebP. */
  name: (i: number) => `f-${String(i + 1).padStart(4, '0')}.webp`,

  desktop: { path: '/assets/anatomy/desktop', width: 1280, height: 720 },
  // Móvil no es el mismo 16:9 en chiquito: es un recorte cerrado sobre el
  // tenis (ver el paso de ffmpeg en scripts/anatomy-frames.sh).
  mobile: { path: '/assets/anatomy/mobile', width: 640, height: 576 },

  /** Cuadro final suelto: lo único que se carga con prefers-reduced-motion. */
  staticFallback: '/assets/anatomy/exploded-still.webp',
} as const;
