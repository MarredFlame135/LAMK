// src/app/api/admin/layaway/route.ts

import { NextResponse } from 'next/server';
import { getLayaways, addLayaway, updateLayaway, deleteLayaway, addPaymentNote } from '@/lib/layaway-store';

export async function GET() {
  return NextResponse.json({ layaways: getLayaways() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.productId || !body.productTitle || !body.totalPrice || !body.percentage || !body.customerPhone) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
  }
  const layaway = addLayaway(body);
  return NextResponse.json({ layaway });
}

export async function PATCH(request: Request) {
  const { id, patch, addPaymentNote: newPayment } = await request.json();
  if (!id) return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 });

  // Nota de abono (fecha + monto): se agrega al historial, nunca reemplaza patch normal.
  if (newPayment) {
    if (typeof newPayment.amount !== 'number' || newPayment.amount <= 0) {
      return NextResponse.json({ error: 'El monto del abono debe ser un número positivo.' }, { status: 400 });
    }
    const entry = addPaymentNote(id, { amount: newPayment.amount, note: newPayment.note || '' });
    if (!entry) return NextResponse.json({ error: 'Apartado no encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, entry });
  }

  updateLayaway(id, patch || {});
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 });
  deleteLayaway(id);
  return NextResponse.json({ success: true });
}
