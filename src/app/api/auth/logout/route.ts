// src/app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { logoutCustomer } from '@/lib/shopify/customer';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('lamk_customer_token')?.value;

  if (token) {
    try {
      await logoutCustomer(token);
    } catch (err) {
      console.error('Error al invalidar el token en Shopify (se cierra sesión local de todos modos):', err);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('lamk_customer_token', '', { path: '/', maxAge: 0 });
  return response;
}
