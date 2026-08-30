// src/lib/admin-access.ts
//
// Lista de correos con acceso de admin ADEMÁS del admin raíz (ADMIN_EMAIL/
// ADMIN_PASSWORD). Deliberadamente NO se guarda en un archivo JSON local
// como inventory-store.ts/leads-store.ts — en Vercel el sistema de archivos
// del deploy es de solo lectura en producción, así que un `fs.writeFileSync`
// ahí puede "funcionar" en el servidor de desarrollo local y fallar (o no
// persistir) en producción. En su lugar, esta lista vive en la variable de
// entorno ADMIN_EMAILS (separada por comas) — la misma fuente de verdad
// confiable que ya usa el admin raíz.
//
// Un correo en esta lista NO tiene una contraseña de admin aparte: inicia
// sesión con SU cuenta de cliente normal (la misma de /auth/login) — ver
// api/admin/login/route.ts. Así "dar permisos de admin a un correo" es
// literalmente agregarlo aquí, sin inventar un segundo sistema de contraseñas.

export function getAllowlistedAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowlistedAdminEmail(email: string): boolean {
  return getAllowlistedAdminEmails().includes(email.trim().toLowerCase());
}

// Fase D.7: rol 'staff' — mismo patrón que ADMIN_EMAILS (variable de
// entorno, sin archivo JSON local, ver comentario de arriba), pero con
// acceso limitado: pedidos e inventario, SIN finanzas ni datos de
// clientes (ver middleware.ts, ADMIN_ONLY_PATHS). Un correo en esta
// lista tampoco tiene contraseña propia — entra con su cuenta de
// cliente normal, igual que ADMIN_EMAILS.
export function getStaffEmails(): string[] {
  return (process.env.ADMIN_STAFF_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isStaffEmail(email: string): boolean {
  return getStaffEmails().includes(email.trim().toLowerCase());
}

export type AdminRole = 'admin' | 'staff';

// El rol real de una sesión — admin raíz y ADMIN_EMAILS siguen siendo
// acceso completo (comportamiento de siempre, sin cambios); ADMIN_STAFF_EMAILS
// es el único caso nuevo con acceso limitado. null = no tiene ningún acceso.
export function getAdminRole(email: string): AdminRole | null {
  const normalized = email.trim().toLowerCase();
  const rootAdmin = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (normalized === rootAdmin || isAllowlistedAdminEmail(normalized)) return 'admin';
  if (isStaffEmail(normalized)) return 'staff';
  return null;
}

// Combina admin raíz + allowlist + staff — para responder "¿esta persona
// tiene ALGÚN acceso al panel?" en un solo lugar (usado por /api/auth/me
// para mostrar el link de Admin a quien tenga acceso, sea cual sea su
// rol — ver Navbar.tsx). Para decisiones de QUÉ puede ver, usar
// getAdminRole(), no esto.
export function isAdminEmail(email: string): boolean {
  return getAdminRole(email) !== null;
}
