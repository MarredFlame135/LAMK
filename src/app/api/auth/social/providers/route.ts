// src/app/api/auth/social/providers/route.ts
//
// Le dice al cliente qué botones de login social mostrar — sin esto, los
// botones de Google/Apple aparecerían siempre, incluso antes de que Dante
// configure las credenciales reales, y tronarían al primer clic. Mismo
// principio que hasShopifyCredentials en catalog-source.ts: una función no
// configurada se oculta, nunca se muestra rota.

import { NextResponse } from 'next/server';
import { isAppleConfigured } from '@/lib/social-auth/apple-client-secret';

export async function GET() {
  return NextResponse.json({
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    apple: isAppleConfigured(),
  });
}
