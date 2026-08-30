// src/app/api/track/cart-add/route.ts
//
// Fix (hallazgo #2 de la auditoría "Prompt Maestro v4", Fase A): antes
// "agregar al carrito" solo se mandaba a Vercel Analytics (ver
// lib/analytics.ts) — útil para dashboards, pero no se podía leer de vuelta
// en el servidor para calcular el Índice por producto. Este endpoint es el
// puente: CartContext lo llama en paralelo a track('add_to_cart',...), sin
// bloquear la UI (fire-and-forget desde el cliente).
//
// Sin autenticación a propósito — es una señal de demanda pública (cuántas
// personas agregaron ESTE producto), no un dato personal. Nunca falla la
// experiencia del usuario: cualquier error se registra en servidor y
// responde 200 igual, agregar al carrito no debe depender de esto.

import { NextResponse } from 'next/server';
import { recordCartAdd } from '@/lib/hype';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const { productId } = await request.json();
    if (typeof productId === 'string' && productId.length > 0 && productId.length < 200) {
      // Fix (auditoría de seguridad 2026-08-30): sin límite, cualquiera
      // podía inflar a mano el término "carrito" del Índice ponderado de un
      // producto (hallazgo #2, Fase A) mandando este evento en bucle — no
      // expone datos de nadie, pero sí falsea una señal que el sitio
      // presenta como real. Límite generoso (no debe estorbar el uso
      // normal: agregar/quitar del carrito varias veces sí es legítimo).
      const { allowed } = checkRateLimit(`cart-add-track:${getClientIp(request)}:${productId}`, 20, 60 * 1000);
      if (allowed) {
        await recordCartAdd(productId);
      }
    }
  } catch (err) {
    console.error('No se pudo registrar evento de carrito para el Índice:', err);
  }
  return NextResponse.json({ ok: true });
}
