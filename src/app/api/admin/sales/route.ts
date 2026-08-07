// src/app/api/admin/sales/route.ts

import { NextResponse } from 'next/server';
import { getSales, addSale } from '@/lib/sales-store';

export async function GET() {
  return NextResponse.json({ sales: getSales() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.customerName || !body.itemsSummary) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
  }
  const sale = addSale(body);
  return NextResponse.json({ sale });
}
