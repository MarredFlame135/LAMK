// src/lib/social-auth/apple-client-secret.ts
//
// "Sign in with Apple" no usa un client secret fijo como Google — pide un
// JWT firmado con ES256 con la llave privada que Apple Developer genera
// una sola vez (y hay que descargar en el momento, Apple no la vuelve a
// mostrar). Ese JWT expira a los 6 meses máximo — por eso se genera al
// vuelo en cada arranque del servidor en vez de pegar un valor fijo en
// .env que se vencería solo. Sin librería nueva (`jsonwebtoken` no está
// en el proyecto y un JWT ES256 de 3 claims no lo justifica) — Node trae
// todo lo necesario en `crypto`.
//
// Variables requeridas (ver .env.example):
//   APPLE_TEAM_ID     — Apple Developer → Membership
//   APPLE_KEY_ID      — el "Key ID" de la Sign in with Apple key
//   APPLE_CLIENT_ID   — el Services ID (ej. mx.lookatmykicks.web)
//   APPLE_PRIVATE_KEY — contenido del .p8 descargado, con los saltos de
//                       línea reales (o "\n" literales — se normalizan abajo)

import { createSign } from 'crypto';

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function isAppleConfigured(): boolean {
  return Boolean(
    process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_CLIENT_ID && process.env.APPLE_PRIVATE_KEY
  );
}

export function generateAppleClientSecret(): string {
  const teamId = process.env.APPLE_TEAM_ID!;
  const keyId = process.env.APPLE_KEY_ID!;
  const clientId = process.env.APPLE_CLIENT_ID!;
  const privateKey = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = base64url(
    JSON.stringify({
      iss: teamId,
      iat: now,
      exp: now + 60 * 60, // 1 hora — de sobra para completar un login, no hace falta el máximo de 6 meses
      aud: 'https://appleid.apple.com',
      sub: clientId,
    })
  );

  // 'SHA256' (no 'RSA-SHA256') — Node deriva ECDSA del tipo de la llave
  // (EC/P-256), no del nombre del hash. `dsaEncoding: 'ieee-p1363'` pide el
  // formato crudo r||s de 64 bytes que exige JWS — el default de Node para
  // firmas EC es DER, que un verificador de JWT rechazaría.
  const signer = createSign('SHA256');
  signer.update(`${header}.${payload}`);
  const signatureB64 = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }, 'base64');
  const signature = signatureB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${header}.${payload}.${signature}`;
}
