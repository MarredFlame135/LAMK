// src/app/api/auth/register/route.ts

import { NextResponse } from 'next/server';
import { registerCustomer } from '@/lib/shopify/customer';

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName, phone } = await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    const token = await registerCustomer({ email, password, firstName, lastName, phone });

    const response = NextResponse.json({ success: true });
    response.cookies.set('lamk_customer_token', token.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(token.expiresAt),
    });
    return response;
  } catch (error: any) {
    console.error('Error en registro de cliente:', error);
    return NextResponse.json({ error: error.message || 'No se pudo crear la cuenta.' }, { status: 400 });
  }
}
