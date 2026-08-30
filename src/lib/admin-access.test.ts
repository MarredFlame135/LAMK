// src/lib/admin-access.test.ts
//
// Camino crítico #2 del brief (autorización): quién es admin y quién no.
// isAdminEmail() es lo único que decide si el link de Admin se muestra en
// Navbar.tsx y si el login por allowlist (api/admin/login) deja pasar.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAdminEmail, isAllowlistedAdminEmail, getAllowlistedAdminEmails, getAdminRole, isStaffEmail } from './admin-access';

const ORIGINAL_ROOT = process.env.ADMIN_EMAIL;
const ORIGINAL_ALLOWLIST = process.env.ADMIN_EMAILS;
const ORIGINAL_STAFF = process.env.ADMIN_STAFF_EMAILS;

describe('admin-access', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAIL = 'root@lamk.mx';
    process.env.ADMIN_EMAILS = 'segundo@lamk.mx, Tercero@LAMK.mx ,';
    process.env.ADMIN_STAFF_EMAILS = 'staff@lamk.mx';
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = ORIGINAL_ROOT;
    process.env.ADMIN_EMAILS = ORIGINAL_ALLOWLIST;
    process.env.ADMIN_STAFF_EMAILS = ORIGINAL_STAFF;
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

  // Fase D.7 — rol staff, acceso limitado (ver middleware.ts).
  describe('getAdminRole (Fase D.7)', () => {
    it('admin raíz: rol admin', () => {
      expect(getAdminRole('root@lamk.mx')).toBe('admin');
    });

    it('en ADMIN_EMAILS: rol admin (acceso completo, comportamiento de siempre)', () => {
      expect(getAdminRole('segundo@lamk.mx')).toBe('admin');
    });

    it('en ADMIN_STAFF_EMAILS: rol staff', () => {
      expect(getAdminRole('staff@lamk.mx')).toBe('staff');
      expect(isStaffEmail('STAFF@LAMK.MX')).toBe(true); // normalizado
    });

    it('correo sin ningún acceso: null, nunca un rol por default', () => {
      expect(getAdminRole('nadie@gmail.com')).toBeNull();
    });

    it('ADMIN_EMAILS gana sobre ADMIN_STAFF_EMAILS si un correo estuviera en ambas listas por error de config', () => {
      process.env.ADMIN_EMAILS = 'ambiguo@lamk.mx';
      process.env.ADMIN_STAFF_EMAILS = 'ambiguo@lamk.mx';
      expect(getAdminRole('ambiguo@lamk.mx')).toBe('admin'); // nunca degradar por accidente a alguien que sí tenía acceso completo
    });
  });
});
