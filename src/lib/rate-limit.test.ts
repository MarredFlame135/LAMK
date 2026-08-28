// src/lib/rate-limit.test.ts
//
// Camino crítico #2 del brief (autorización/abuso): el límite de intentos
// que protege /api/auth/login, /api/admin/login y /api/otp (hallazgo #2 de
// la Fase 1 — antes aceptaban intentos ilimitados).

import { describe, it, expect } from 'vitest';
import { checkRateLimit } from './rate-limit';

describe('checkRateLimit', () => {
  it('permite hasta el límite exacto de intentos', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000).allowed).toBe(true);
    }
  });

  it('bloquea el intento que excede el límite', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 60_000);
    const sixth = checkRateLimit(key, 5, 60_000);
    expect(sixth.allowed).toBe(false);
    expect(sixth.retryAfterMs).toBeGreaterThan(0);
  });

  it('claves distintas (ej. IPs distintas) no se pisan entre sí', () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(keyA, 5, 60_000);
    // keyA ya está al límite — keyB debe seguir permitida.
    expect(checkRateLimit(keyA, 5, 60_000).allowed).toBe(false);
    expect(checkRateLimit(keyB, 5, 60_000).allowed).toBe(true);
  });
});
