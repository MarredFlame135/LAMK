// src/lib/social/age.test.ts

import { describe, it, expect } from 'vitest';
import { isMinor } from './age';

// Construye una fecha YYYY-MM-DD a partir de hoy (en términos UTC, igual
// que isMinor()) — sin pasar por el parseo de Date() para no reintroducir
// el mismo problema de huso horario que se corrigió en age.ts.
function isoDateYearsAgo(years: number, extraDays = 0): string {
  const now = new Date();
  const utcMs = Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate() + extraDays);
  return new Date(utcMs).toISOString().slice(0, 10);
}

describe('isMinor', () => {
  it('sin fecha declarada: se trata como menor (default más restrictivo)', () => {
    expect(isMinor(null)).toBe(true);
  });

  it('fecha inválida: se trata como menor', () => {
    expect(isMinor('no-es-una-fecha')).toBe(true);
  });

  it('17 años: es menor', () => {
    expect(isMinor(isoDateYearsAgo(17))).toBe(true);
  });

  it('18 años cumplidos exactos: ya NO es menor', () => {
    expect(isMinor(isoDateYearsAgo(18))).toBe(false);
  });

  it('un día antes de cumplir 18: sigue siendo menor', () => {
    // Nació hace "18 años - 1 día" en fecha de calendario → el cumpleaños
    // 18 cae mañana, no hoy.
    expect(isMinor(isoDateYearsAgo(18, 1))).toBe(true);
  });

  it('30 años: no es menor', () => {
    expect(isMinor(isoDateYearsAgo(30))).toBe(false);
  });
});
