// src/lib/social-auth/bridge.ts
//
// El puente completo entre NextAuth (OAuth con Google/Apple) y Shopify
// Customer Accounts (Storefront API, lo que ya usa todo el resto del
// sitio). Ver el comentario largo en db/schema.ts (tabla linkedAccounts)
// para el porqué de la contraseña puente cifrada — resumen: la Admin API
// de Shopify ya no permite fijar/resetear la contraseña de un customer
// existente, y Multipass (la solución nativa) es exclusivo de Shopify
// Plus; LAMK MX está en plan estándar.
//
// Tres caminos posibles al terminar el OAuth con el proveedor:
//   1. Ya existe un vínculo (provider + providerAccountId) → re-autentica
//      con la contraseña puente guardada, cifrada.
//   2. Primera vez, y NO existe ya un customer de Shopify con ese correo
//      → se crea una cuenta puente nueva (contraseña aleatoria, nunca
//      vista por el usuario) y se vincula.
//   3. Primera vez, pero YA existe un customer de Shopify con ese correo
//      (se registró antes con contraseña) → no se puede fusionar sin
//      pedirle a esa persona que confirme su contraseña una vez (ver
//      /auth/link-account) — fusionar automáticamente solo por compartir
//      correo sería dejar entrar a cualquiera que controle esa bandeja de
//      Google a una cuenta que no es necesariamente suya.

import { randomUUID, randomBytes } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { getDb } from '@/db';
import { linkedAccounts, consentLog } from '@/db/schema';
import { encryptSecret, decryptSecret } from './crypto';
import { registerCustomer, loginCustomer, CustomerAccessToken } from '@/lib/shopify/customer';
import { findCustomerIdByEmail } from '@/lib/shopify/admin';
import { PRIVACY_NOTICE_VERSION } from '@/lib/legal';

export type OAuthSignInResult =
  | { status: 'ok'; token: CustomerAccessToken & { customerId: string } }
  | { status: 'needs_password_confirmation'; email: string }
  | { status: 'email_not_verified' }
  | { status: 'consent_required' };

interface OAuthProfile {
  provider: 'google' | 'apple';
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
}

// Lee y borra la cookie corta que dejó /api/auth/social/prepare-consent —
// si no está (alguien intentó saltarse el botón y pegar la URL de OAuth
// directo), se rechaza: el consentimiento nunca se asume.
function consumePendingConsent(): { privacyAccepted: boolean; marketingOptIn: boolean } | null {
  const store = cookies();
  const raw = store.get('lamk_pending_consent')?.value;
  if (!raw) return null;
  store.delete('lamk_pending_consent');
  try {
    const parsed = JSON.parse(raw);
    return parsed.privacyAccepted === true ? { privacyAccepted: true, marketingOptIn: parsed.marketingOptIn === true } : null;
  } catch {
    return null;
  }
}

function getRequestIp(): string {
  const h = headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h.get('x-real-ip') || 'unknown';
}

async function writeConsent(customerId: string, marketingOptIn: boolean) {
  try {
    await getDb().insert(consentLog).values({
      id: randomUUID(),
      customerId,
      privacyVersion: PRIVACY_NOTICE_VERSION,
      marketingOptIn,
      ip: getRequestIp(),
    });
  } catch (err) {
    console.error('No se pudo guardar consent_log (login social) para', customerId, err);
  }
}

export async function handleOAuthSignIn(profile: OAuthProfile): Promise<OAuthSignInResult> {
  if (!profile.emailVerified) return { status: 'email_not_verified' };

  const db = getDb();
  const [existingLink] = await db
    .select()
    .from(linkedAccounts)
    .where(and(eq(linkedAccounts.provider, profile.provider), eq(linkedAccounts.providerAccountId, profile.providerAccountId)))
    .limit(1);

  if (existingLink) {
    const password = decryptSecret(existingLink.encryptedPassword);
    const token = await loginCustomer({ email: existingLink.email, password });
    return { status: 'ok', token: { ...token, customerId: existingLink.customerId } };
  }

  // Primera vez con este provider+cuenta — el consentimiento tiene que
  // haberse capturado ANTES de llegar aquí (ver prepare-consent).
  const consent = consumePendingConsent();
  if (!consent) return { status: 'consent_required' };

  const existingCustomerId = await findCustomerIdByEmail(profile.email);
  if (existingCustomerId) {
    // No fusionamos solo por compartir correo — ver comentario de arriba.
    // El consentimiento ya se leyó/borró; se vuelve a pedir en
    // /auth/link-account cuando confirme su contraseña.
    return { status: 'needs_password_confirmation', email: profile.email };
  }

  // Cuenta nueva — contraseña puente aleatoria (32 bytes, nunca mostrada).
  const bridgePassword = randomBytes(24).toString('base64url');
  const token = await registerCustomer({
    email: profile.email,
    password: bridgePassword,
    firstName: profile.firstName || 'Coleccionista',
    lastName: profile.lastName || 'LAMK',
  });

  await db.insert(linkedAccounts).values({
    id: randomUUID(),
    customerId: token.customerId,
    provider: profile.provider,
    providerAccountId: profile.providerAccountId,
    email: profile.email,
    encryptedPassword: encryptSecret(bridgePassword),
  });

  await writeConsent(token.customerId, consent.marketingOptIn);

  return { status: 'ok', token };
}

// Usado por /api/auth/social/link (confirmación manual de contraseña,
// camino 3 de arriba). `password` es la contraseña REAL que la persona ya
// tenía — se verifica contra Shopify (loginCustomer falla si está mal) y
// solo si es correcta se guarda cifrada para logins futuros por OAuth.
export async function linkExistingAccountWithPassword(input: {
  email: string;
  password: string;
  provider: 'google' | 'apple';
  providerAccountId: string;
}): Promise<{ token: CustomerAccessToken & { customerId: string }; customerId: string } | null> {
  let token;
  try {
    token = await loginCustomer({ email: input.email, password: input.password });
  } catch {
    return null; // contraseña incorrecta — no revelar más detalle que eso
  }

  const customerId = await findCustomerIdByEmail(input.email);
  if (!customerId) return null; // no debería pasar (ya sabíamos que existía), pero fail-safe

  await getDb().insert(linkedAccounts).values({
    id: randomUUID(),
    customerId,
    provider: input.provider,
    providerAccountId: input.providerAccountId,
    email: input.email,
    encryptedPassword: encryptSecret(input.password),
  });

  return { token: { ...token, customerId }, customerId };
}
