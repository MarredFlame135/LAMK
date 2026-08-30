// src/lib/social-auth/crypto.test.ts
//
// Mismo patrón que session.test.ts/otp.test.ts: roundtrip + detección de
// manipulación. Corre con la clave insegura de desarrollo (no hay
// LINKED_ACCOUNT_ENCRYPTION_KEY en el entorno de pruebas) — suficiente
// para probar la lógica de cifrado en sí, no la política de fail-closed
// (esa depende de NODE_ENV=production, fuera del alcance de esta prueba).

import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret } from './crypto';

describe('encryptSecret / decryptSecret', () => {
  it('roundtrip: lo que se cifra se descifra igual', () => {
    const plaintext = 'una-contraseña-puente-aleatoria-123!';
    const encrypted = encryptSecret(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it('el texto cifrado nunca contiene el texto plano', () => {
    const plaintext = 'super-secreto-no-debe-aparecer-aqui';
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toContain(plaintext);
  });

  it('cada cifrado usa un IV distinto — dos cifrados del mismo texto no son iguales', () => {
    const plaintext = 'misma-contraseña';
    expect(encryptSecret(plaintext)).not.toBe(encryptSecret(plaintext));
  });

  it('texto cifrado manipulado falla al descifrar en vez de devolver basura silenciosa', () => {
    const encrypted = encryptSecret('valor-original');
    const [iv, authTag, data] = encrypted.split(':');
    const tampered = [iv, authTag, data.slice(0, -4) + 'AAAA'].join(':');
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('formato inválido (sin las 3 partes) falla explícitamente', () => {
    expect(() => decryptSecret('no-tiene-el-formato-correcto')).toThrow();
  });
});
