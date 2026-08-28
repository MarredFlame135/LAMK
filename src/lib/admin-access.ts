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

// Combina admin raíz + allowlist — para responder "¿esta persona es admin?"
// en un solo lugar (usado por /api/auth/me para mostrar el link de Admin
// solo a quien de verdad tiene acceso, ver Navbar.tsx).
export function isAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const rootAdmin = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  return normalized === rootAdmin || isAllowlistedAdminEmail(normalized);
}
