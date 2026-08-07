// src/lib/haptics.ts
//
// Wrapper de la API de Vibración del navegador (solo Android/Chrome — iOS
// Safari no la soporta, por eso todo pasa por un try/catch silencioso).

export function vibrate(pattern: number | number[] = 12): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silencioso: la vibración es un extra, nunca debe romper la interacción.
  }
}

export const haptics = {
  tap: () => vibrate(10),
  success: () => vibrate([12, 40, 12]),
  levelUp: () => vibrate([15, 60, 15, 60, 30]),
};
