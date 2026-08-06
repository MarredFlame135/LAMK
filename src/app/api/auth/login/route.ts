// src/app/api/auth/login/route.ts

import { NextResponse } from 'next/server';
import { loginCustomer } from '@/lib/shopify/customer';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Correo y contraseña son obligatorios.' }, { status: 400 });
    }

    const token = await loginCustomer({ email, password });

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
    console.error('Error en login de cliente:', error);
    return NextResponse.json({ error: error.message || 'Correo o contraseña incorrectos.' }, { status: 401 });
  }
}
