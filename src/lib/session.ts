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
