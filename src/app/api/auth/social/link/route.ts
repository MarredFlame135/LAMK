// src/app/api/auth/social/link/route.ts
//
// Confirma el camino 3 del puente (ver bridge.ts): ya existe una cuenta de
// Shopify con este correo, registrada antes con contraseña. Se verifica
// esa contraseña real contra Shopify (nunca se confía en el correo solo) y,
// si es correcta, se vincula el proveedor OAuth para que la próxima vez
// entre directo sin volver a pedirla.

import { NextResponse } from 'next/server';
import { linkExistingAccountWithPassword } from '@/lib/social-auth/bridge';

export async function POST(request: Request) {
  try {
    const { email, password, provider, providerAccountId } = await request.json();

    if (!email || !password || (provider !== 'google' && provider !== 'apple') || !providerAccountId) {
      return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 });
    }

    const result = await linkExistingAccountWithPassword({ email, password, provider, providerAccountId });
    if (!result) {
      return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('lamk_customer_token', result.token.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(result.token.expiresAt),
    });
    return response;
  } catch (error: any) {
    console.error('Error al vincular cuenta social:', error);
    return NextResponse.json({ error: 'No se pudo vincular la cuenta.' }, { status: 400 });
  }
}
