// src/app/api/admin/login/route.ts

import { NextResponse } from 'next/server';
import { signAdminSession } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'El admin no está configurado en el servidor (falta ADMIN_EMAIL / ADMIN_PASSWORD en .env.local).' },
        { status: 500 }
      );
    }

    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
    }

    const token = await signAdminSession({ email, issuedAt: Date.now() });

    const response = NextResponse.json({ success: true });
    response.cookies.set('lamk_admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12, // 12 horas
    });
    return response;
  } catch (error) {
    console.error('Error en login de admin:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
