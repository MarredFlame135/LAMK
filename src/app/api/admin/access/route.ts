// src/app/api/admin/access/route.ts
//
// Solo lectura: quién tiene acceso de admin hoy. Ya está detrás del
// middleware (requiere sesión de admin válida, ver middleware.ts). No hay
// endpoint de escritura — agregar un correo implica actualizar la variable
// de entorno ADMIN_EMAILS (ver AdminAccessPanel.tsx para el porqué).

import { NextResponse } from 'next/server';
import { getAllowlistedAdminEmails } from '@/lib/admin-access';

export async function GET() {
  const rootAdmin = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const allowlisted = getAllowlistedAdminEmails();
  return NextResponse.json({ rootAdmin, allowlisted });
}
