// src/lib/admin-access.test.ts
//
// Camino crítico #2 del brief (autorización): quién es admin y quién no.
// isAdminEmail() es lo único que decide si el link de Admin se muestra en
// Navbar.tsx y si el login por allowlist (api/admin/login) deja pasar.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAdminEmail, isAllowlistedAdminEmail, getAllowlistedAdminEmails } from './admin-access';

const ORIGINAL_ROOT = process.env.ADMIN_EMAIL;
const ORIGINAL_ALLOWLIST = process.env.ADMIN_EMAILS;

describe('admin-access', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAIL = 'root@lamk.mx';
    process.env.ADMIN_EMAILS = 'segundo@lamk.mx, Tercero@LAMK.mx ,';
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = ORIGINAL_ROOT;
    process.env.ADMIN_EMAILS = ORIGINAL_ALLOWLIST;
  });

  it('el admin raíz es admin', () => {
    expect(isAdminEmail('root@lamk.mx')).toBe(true);
  });

  it('el admin raíz es admin sin importar mayúsculas/espacios', () => {
    expect(isAdminEmail('  ROOT@LAMK.MX  ')).toBe(true);
  });

  it('un correo en ADMIN_EMAILS es admin', () => {
    expect(isAdminEmail('segundo@lamk.mx')).toBe(true);
    expect(isAllowlistedAdminEmail('tercero@lamk.mx')).toBe(true); // normalizado a minúsculas
  });

  it('un correo cualquiera NO es admin', () => {
    expect(isAdminEmail('cliente-normal@gmail.com')).toBe(false);
  });

  it('entradas vacías en ADMIN_EMAILS (coma final) no producen un admin fantasma', () => {
    const list = getAllowlistedAdminEmails();
    expect(list).not.toContain('');
    expect(list).toHaveLength(2);
  });

  it('sin ADMIN_EMAILS configurado, la allowlist queda vacía sin romper isAdminEmail', () => {
    delete process.env.ADMIN_EMAILS;
    expect(getAllowlistedAdminEmails()).toEqual([]);
    expect(isAdminEmail('root@lamk.mx')).toBe(true); // el raíz sigue funcionando
    expect(isAdminEmail('cualquiera@gmail.com')).toBe(false);
  });
});
