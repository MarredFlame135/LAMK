// src/lib/session.ts
//
// Firma y verifica cookies de sesión con HMAC-SHA256 usando Web Crypto (no
// Node `crypto`/`Buffer`) para que funcione tanto en API routes (Node) como
// en middleware.ts (runtime Edge). Sin dependencias externas ni base de datos:
// el "token" es `payload_base64url.firma_base64url`; se valida recalculando
// la firma con el secreto del servidor — si no coincide, la sesión es inválida.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url + '='.repeat((4 - (b64url.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret) return secret;

  // Fix (hallazgo #1 de la auditoría de Fase 1): antes, si faltaba la
  // variable, el servidor seguía funcionando con un secreto de desarrollo
  // hardcodeado aquí mismo — visible en el repo. En producción eso es fail
  // -open: cualquiera que leyera el código podía firmar su propia cookie
  // `lamk_admin_session` válida para cualquier correo, sin credenciales.
  // Ahora es fail-closed: en producción, sin el secreto, la request truena
  // en vez de aceptar sesiones falsificables. En desarrollo se mantiene el
  // fallback (con advertencia) para no bloquear `npm run dev` en un clon
  // nuevo del repo sin `.env.local` configurado todavía.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SEGURIDAD] ADMIN_SESSION_SECRET no está configurada en producción. No se puede firmar/verificar la sesión de admin de forma segura — configúrala en Vercel antes de aceptar tráfico.'
    );
  }
  console.warn(
    '[SEGURIDAD] ADMIN_SESSION_SECRET no está configurado en .env.local. Usando un secreto de desarrollo inseguro — configúralo antes de producción.'
  );
  return 'lamk-dev-only-insecure-secret-change-me';
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(getSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return bytesToBase64Url(new Uint8Array(signature));
}

export interface AdminSessionPayload {
  email: string;
  issuedAt: number;
  // Fase D.7 — opcional para no romper la verificación de sesiones ya
  // emitidas antes de este cambio (duran hasta 12h, se vencen solas). Sin
  // rol en el payload, se trata como 'admin' (comportamiento de siempre,
  // ver getEffectiveRole abajo) — nunca al revés: una sesión sin rol
  // JAMÁS debe interpretarse como 'staff' (eso degradaría acceso de
  // alguien que ya lo tenía, no elevaría a alguien sin derecho).
  role?: 'admin' | 'staff';
}

export function getEffectiveRole(payload: AdminSessionPayload): 'admin' | 'staff' {
  return payload.role ?? 'admin';
}

export async function signAdminSession(payload: AdminSessionPayload): Promise<string> {
  const payloadB64 = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await hmac(payloadB64);
  return `${payloadB64}.${signature}`;
}

export async function verifyAdminSession(token: string | undefined | null): Promise<AdminSessionPayload | null> {
  if (!token) return null;
  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;

  const expectedSignature = await hmac(payloadB64);
  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(decoder.decode(base64UrlToBytes(payloadB64))) as AdminSessionPayload;
    // Sesión válida por 12 horas
    if (Date.now() - payload.issuedAt > 12 * 60 * 60 * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

// Nombre y opciones de la cookie, en UN solo lugar. Antes vivían copiadas en
// api/admin/login (set) y api/admin/logout (clear); dos copias de los mismos
// atributos son justo la forma en que una sesión "se pierde" sin que nadie
// entienda por qué (basta que una copia cambie `path` y la otra no para que
// el logout deje viva una cookie que el middleware ya no encuentra, o al
// revés). El middleware también las necesita ahora para el refresco de abajo.
export const ADMIN_SESSION_COOKIE = 'lamk_admin_session';

const ADMIN_SESSION_MAX_AGE_S = 60 * 60 * 12; // 12h — mismo tope que verifyAdminSession

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE_S,
  };
}

// Sliding window. La sesión dura 12h desde que se EMITIÓ, no desde el último
// uso: alguien que abre el panel a las 9am y sigue trabajando a las 9pm es
// expulsado a media tarea, y desde fuera eso se lee como "se perdió la
// sesión al navegar". Con esto, cada request de admin que ya rebasó la hora
// re-firma el token con `issuedAt` nuevo y reescribe la cookie.
//
// Por qué una hora y no en cada request: esto corre en TODAS las rutas de
// /admin y /api/admin, y reescribir Set-Cookie en cada una hace que ninguna
// respuesta del panel se pueda cachear. Una hora mantiene la sesión viva sin
// ese costo.
const REFRESH_AFTER_MS = 60 * 60 * 1000;

export function shouldRefreshAdminSession(payload: AdminSessionPayload): boolean {
  return Date.now() - payload.issuedAt > REFRESH_AFTER_MS;
}
