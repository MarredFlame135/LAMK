// src/app/api/auth/me/route.ts
//
// Devuelve el perfil del cliente autenticado (leyendo la cookie httpOnly) o
// 401 si no hay sesión. Usado por el AuthContext del cliente al montar.
//
// También devuelve `isAdmin` (booleano, no la lista de correos — eso nunca
// va al cliente) para que Navbar.tsx pueda mostrar un link privado al panel
// de admin SOLO a quien de verdad tiene acceso (root o ADMIN_EMAILS).

import { NextRequest, NextResponse } from 'next/server';
import { getCustomerProfile } from '@/lib/shopify/customer';
import { isAdminEmail } from '@/lib/admin-access';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('lamk_customer_token')?.value;

  if (!token) {
    return NextResponse.json({ user: null, isAdmin: false }, { status: 200 });
  }

  try {
    const user = await getCustomerProfile(token);
    if (!user) {
      return NextResponse.json({ user: null, isAdmin: false }, { status: 200 });
    }
    return NextResponse.json({ user, isAdmin: isAdminEmail(user.email) });
  } catch (error) {
    console.error('Error al obtener el perfil del cliente:', error);
    return NextResponse.json({ user: null, isAdmin: false }, { status: 200 });
  }
}
