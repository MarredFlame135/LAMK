// src/lib/otp.ts
//
// Verificación de OTP de WhatsApp — ahora real, del lado del servidor.
//
// Hallazgo #4 de la auditoría de Fase 1: antes el código de 4 dígitos se
// generaba en el navegador (CartContext.tsx, `Math.random()`), se guardaba
// en estado de React, y la comparación contra lo que el usuario tecleaba
// TAMBIÉN corría 100% en el cliente (`enteredCode === otpCode`) — cualquiera
// con React DevTools podía leer el código sin haber recibido nada por
// WhatsApp, y esa verificación sí bloqueaba el paso a Shopify Checkout en
// SpecialCartDrawer.tsx (no era código muerto, corrección al reporte
// original).
//
// Ahora: el código se genera aquí (servidor), y la comparación también pasa
// por aquí (api/otp/verify). Lo que viaja al cliente no es el código sino
// un "ticket" opaco: HMAC-firmado, con el HASH del código (no el código en
// claro) + el teléfono + una expiración de 5 minutos. El cliente guarda el
// ticket y lo manda de vuelta junto con lo que el usuario tecleó;
// verifyOtpTicket recalcula el hash y lo compara — sin necesitar una base
// de datos ni un store compartido entre instancias serverless (mismo
// patrón "firmado, sin estado" que ya usa src/lib/session.ts para la
// sesión de admin).
//
// Nota aparte, no de seguridad sino de disponibilidad: hoy en producción
// WHATSAPP_API_TOKEN/WHATSAPP_PHONE_NUMBER_ID no están configurados (ver
// CLAUDE.md), así que api/otp/route.ts sigue revelando el código en la
// respuesta cuando no hay credenciales — igual que antes. Quitar eso
// dejaría a todo mundo sin forma de completar el checkout hasta que se
// configuren credenciales reales de WhatsApp. Lo que este archivo cierra es
// el bypass real (comparación falsificable en el cliente), no ese
// fallback — que se queda hasta que decidan activar WhatsApp de verdad.

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

function getOtpSecret(): string {
  // Reusa ADMIN_SESSION_SECRET si OTP_SESSION_SECRET no existe todavía —
  // así este fix no depende de agregar una variable de entorno nueva en
  // Vercel antes de funcionar. Namespaced con el prefijo 'otp:' al firmar
  // (ver sha256Hex más abajo) para que un ticket de OTP nunca sea
  // intercambiable con una cookie de sesión de admin aunque compartan
  // secreto.
  const secret = process.env.OTP_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SEGURIDAD] Falta OTP_SESSION_SECRET (o ADMIN_SESSION_SECRET como respaldo) en producción — no se puede firmar el ticket de OTP.'
    );
  }
  console.warn('[SEGURIDAD] OTP_SESSION_SECRET no configurado. Usando secreto de desarrollo inseguro.');
  return 'lamk-dev-only-insecure-otp-secret-change-me';
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(getOtpSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutos

interface OtpTicketPayload {
  phone: string;
  codeHash: string;
  expiresAt: number;
}

export function generateOtpCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Genera el ticket firmado a partir de un código YA generado en el
// servidor (nunca al revés) — ver api/otp/route.ts.
export async function signOtpTicket(phone: string, code: string): Promise<string> {
  const codeHash = await sha256Hex(`otp:${phone}:${code}`);
  const payload: OtpTicketPayload = { phone, codeHash, expiresAt: Date.now() + OTP_TTL_MS };
  const payloadB64 = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await hmac(payloadB64);
  return `${payloadB64}.${signature}`;
}

export async function verifyOtpTicket(ticket: string | undefined | null, phone: string, enteredCode: string): Promise<boolean> {
  if (!ticket) return false;
  const [payloadB64, signature] = ticket.split('.');
  if (!payloadB64 || !signature) return false;

  const expectedSignature = await hmac(payloadB64);
  if (signature !== expectedSignature) return false;

  let payload: OtpTicketPayload;
  try {
    payload = JSON.parse(decoder.decode(base64UrlToBytes(payloadB64))) as OtpTicketPayload;
  } catch {
    return false;
  }

  if (Date.now() > payload.expiresAt) return false;
  if (payload.phone !== phone) return false;

  const enteredHash = await sha256Hex(`otp:${phone}:${enteredCode}`);
  return enteredHash === payload.codeHash;
}
