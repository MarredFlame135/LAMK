// src/lib/session.test.ts
//
// Camino crítico #2 del brief de Fase 7: autorización. Cubre la sesión de
// admin (src/lib/session.ts) — la única barrera real entre cualquiera y
// /admin/* + /api/admin/* (ver middleware.ts). Incluye un test de
// regresión explícito para el hallazgo #1 de la Fase 1 (fail-closed en
// producción sin ADMIN_SESSION_SECRET) — para que si alguien alguna vez
// revierte ese fix sin querer, la suite lo atrape.
//
// getSecret() lee `process.env` en cada llamada (no al importar el
// módulo), así que un import estático normal basta — no hace falta
// reimportar el módulo entre tests para que recoja cambios de env.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signAdminSession, verifyAdminSession } from './session';

const ORIGINAL_SECRET = process.env.ADMIN_SESSION_SECRET;

describe('signAdminSession / verifyAdminSession', () => {
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = 'test-secret-para-la-suite-no-usar-en-prod';
  });

  afterEach(() => {
    process.env.ADMIN_SESSION_SECRET = ORIGINAL_SECRET;
    vi.unstubAllEnvs();
  });

  it('un token firmado se verifica correctamente y devuelve el email correcto', async () => {
    const token = await signAdminSession({ email: 'admin@lamk.mx', issuedAt: Date.now() });
    const payload = await verifyAdminSession(token);
    expect(payload?.email).toBe('admin@lamk.mx');
  });

  it('un token sin firmar (undefined/vacío) no verifica', async () => {
    expect(await verifyAdminSession(undefined)).toBeNull();
    expect(await verifyAdminSession('')).toBeNull();
  });

  it('un token manipulado (payload alterado, firma original) NO verifica', async () => {
    const token = await signAdminSession({ email: 'admin@lamk.mx', issuedAt: Date.now() });
    const [, signature] = token.split('.');
    // Alguien intenta colarse cambiando el email en el payload sin poder
    // recalcular la firma (no conoce el secreto del servidor).
    const forgedPayload = Buffer.from(JSON.stringify({ email: 'atacante@evil.com', issuedAt: Date.now() }))
      .toString('base64url');
    const forgedToken = `${forgedPayload}.${signature}`;
    expect(await verifyAdminSession(forgedToken)).toBeNull();
    // Control: el token original, sin tocar, sigue siendo válido.
    expect((await verifyAdminSession(token))?.email).toBe('admin@lamk.mx');
  });

  it('un token firmado con OTRO secreto no verifica contra el secreto actual', async () => {
    const token = await signAdminSession({ email: 'admin@lamk.mx', issuedAt: Date.now() });
    process.env.ADMIN_SESSION_SECRET = 'un-secreto-completamente-distinto';
    expect(await verifyAdminSession(token)).toBeNull();
  });

  it('un token con más de 12 horas de emitido expira', async () => {
    const thirteenHoursAgo = Date.now() - 13 * 60 * 60 * 1000;
    const token = await signAdminSession({ email: 'admin@lamk.mx', issuedAt: thirteenHoursAgo });
    expect(await verifyAdminSession(token)).toBeNull();
  });

  it('un token de hace 11 horas (dentro de la ventana de 12h) sigue siendo válido', async () => {
    const elevenHoursAgo = Date.now() - 11 * 60 * 60 * 1000;
    const token = await signAdminSession({ email: 'admin@lamk.mx', issuedAt: elevenHoursAgo });
    expect((await verifyAdminSession(token))?.email).toBe('admin@lamk.mx');
  });

  it('REGRESIÓN (hallazgo #1, Fase 1): en producción, sin ADMIN_SESSION_SECRET configurado, firmar debe fallar-cerrado (lanzar), nunca caer a un secreto por defecto', async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    vi.stubEnv('NODE_ENV', 'production');
    await expect(signAdminSession({ email: 'admin@lamk.mx', issuedAt: Date.now() })).rejects.toThrow();
  });
});
