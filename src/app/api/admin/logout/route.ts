// src/app/api/admin/logout/route.ts

import { NextResponse } from 'next/server';
import { adminSessionCookieOptions, ADMIN_SESSION_COOKIE } from '@/lib/session';

export async function POST() {
  const response = NextResponse.json({ success: true });
  // Mismos atributos con los que se emitió (path sobre todo): un clear con
  // path distinto deja viva la cookie original y la sesión no se cierra.
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { ...adminSessionCookieOptions(), maxAge: 0 });
  return response;
}
