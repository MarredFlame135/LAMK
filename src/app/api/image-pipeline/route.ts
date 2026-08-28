// src/app/api/image-pipeline/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    // Fix (hallazgo #3 de la auditoría de Fase 1): esta ruta vive fuera de
    // /api/admin/*, así que el middleware no la protegía, y el handler no
    // verificaba sesión por su cuenta — pero solo se usa desde el panel de
    // admin (InventoryManager.tsx) para subir un producto nuevo. Hoy es un
    // stub sin impacto real, pero el día que se conecte a un proveedor de
    // pago real (Photoroom/Remove.bg) esto sería una API abierta para
    // gastar esa cuota sin sesión.
    const session = await verifyAdminSession(request.cookies.get('lamk_admin_session')?.value);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado. Inicia sesión como administrador.' }, { status: 401 });
    }

    const { imageUrl, backgroundTheme = 'DARK_ASPHALT' } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Falta la URL de la imagen' }, { status: 400 });
    }

    console.log(`Procesando imagen vía IA: ${imageUrl} con fondo ${backgroundTheme}`);

    // Simulación del pipeline de IA (Remoción de fondo + Reiluminación)
    // En producción se conecta a APIs como Cloudinary, Photoroom o Remove.bg API
    const processedUrl = imageUrl.startsWith('http') || imageUrl.startsWith('data:')
      ? imageUrl
      : 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1200&q=80';

    return NextResponse.json({
      success: true,
      originalUrl: imageUrl,
      processedUrl: processedUrl,
      format: 'webp',
      resolution: '4K',
      backgroundApplied: backgroundTheme,
    });
  } catch (error) {
    console.error('Error en Pipeline de Imágenes IA:', error);
    return NextResponse.json({ error: 'Error procesando la imagen' }, { status: 500 });
  }
}