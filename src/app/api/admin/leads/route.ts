// src/app/api/admin/leads/route.ts

import { NextResponse } from 'next/server';
import { getLeads, addLead, updateLead, deleteLead } from '@/lib/leads-store';

export async function GET() {
  return NextResponse.json({ leads: getLeads() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.productId || !body.productTitle || !body.rawQuery || typeof body.wasMatched !== 'boolean') {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
  }
  const lead = addLead(body);
  return NextResponse.json({ lead });
}

export async function PATCH(request: Request) {
  const { id, patch } = await request.json();
  if (!id) return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 });
  updateLead(id, patch || {});
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 });
  deleteLead(id);
  return NextResponse.json({ success: true });
}
