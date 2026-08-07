// src/app/api/auth/reset-password/route.ts

import { NextResponse } from 'next/server';
import { recoverCustomerPassword } from '@/lib/shopify/customer';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Ingresa tu correo.' }, { status: 400 });
    }

    try {
      await recoverCustomerPassword(email);
    } catch (err) {
      console.error('Error en customerRecover:', err);
      // No delatamos si el correo existe o no — mismo mensaje de éxito siempre.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en reset-password:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
