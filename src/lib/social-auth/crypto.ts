// src/lib/social-auth/crypto.ts
//
// Cifra/descifra la contraseña puente que guarda linked_accounts (ver
// comentario en db/schema.ts sobre por qué existe). AES-256-GCM: cifrado
// autenticado — si alguien manipula el texto cifrado en la base de datos,
// descifrar falla ruidosamente en vez de devolver basura silenciosa.
//
// Fail-closed en producción, mismo principio que ADMIN_SESSION_SECRET
// (ver src/lib/session.ts, hallazgo #1 de la Fase 1 de la auditoría
// original): sin LINKED_ACCOUNT_ENCRYPTION_KEY configurada, el login
// social debe fallar explícitamente, nunca caer a una clave insegura por
// defecto que dejaría contraseñas puente cifradas con algo predecible.

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recomendado para GCM

function getKey(): Buffer {
  const raw = process.env.LINKED_ACCOUNT_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'LINKED_ACCOUNT_ENCRYPTION_KEY no está configurada. El login social no puede operar sin ella en producción — ver .env.example.'
      );
    }
    // Solo en desarrollo, para no bloquear `npm run dev` sin configurar
    // nada — nunca se usa este valor si la variable real está presente.
    console.warn('⚠️  LINKED_ACCOUNT_ENCRYPTION_KEY no configurada — usando una clave de desarrollo insegura. NO usar en producción.');
    return Buffer.from('dev-only-insecure-key-do-not-ship!!', 'utf-8').subarray(0, 32);
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('LINKED_ACCOUNT_ENCRYPTION_KEY debe ser 32 bytes en base64 (ej. `openssl rand -base64 32`).');
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(payload: string): string {
  const [ivB64, authTagB64, dataB64] = payload.split(':');
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error('Formato de secreto cifrado inválido — no tiene las 3 partes esperadas (iv:authTag:data).');
  }
  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return decrypted.toString('utf-8');
}
