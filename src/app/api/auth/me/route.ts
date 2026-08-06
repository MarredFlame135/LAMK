// src/app/api/auth/me/route.ts
//
// Devuelve el perfil del cliente autenticado (leyendo la cookie httpOnly) o
// 401 si no hay sesión. Usado por el AuthContext del cliente al montar.

import { NextRequest, NextResponse } from 'next/server';
import { getCustomerProfile } from '@/lib/shopify/customer';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('lamk_customer_token')?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const user = await getCustomerProfile(token);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error al obtener el perfil del cliente:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
