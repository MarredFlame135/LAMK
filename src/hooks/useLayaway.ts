// src/hooks/useLayaway.ts
//
// Cliente delgado sobre /api/admin/layaway (servidor, ver src/lib/layaway-store.ts).
// Mismo patrón que useLeads.ts: TENISIN escribe, el Admin Dashboard lee — todo
// compartido de verdad entre el celular del cliente y la computadora del admin.

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LayawayRequest, LayawayStatus } from '@/types/admin';

async function fetchLayaways(): Promise<LayawayRequest[]> {
  const res = await fetch('/api/admin/layaway');
  const data = await res.json();
  return data.layaways || [];
}

// Llamado por TENISIN cuando el cliente confirma su apartado (producto, %,
// WhatsApp y nota ya recolectados en el chat guiado).
export async function logLayawayRequest(input: {
  productId: string;
  productTitle: string;
  productImage: string;
  requestedSize?: string;
  totalPrice: number;
  percentage: number;
  depositAmount: number;
  hypeScore?: number;
  customerPhone: string;
  note?: string;
}): Promise<LayawayRequest> {
  const res = await fetch('/api/admin/layaway', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  return data.layaway;
}

export async function updateLayawayRequest(id: string, patch: Partial<LayawayRequest>): Promise<void> {
  await fetch('/api/admin/layaway', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, patch }),
  });
}

export async function deleteLayawayRequest(id: string): Promise<void> {
  await fetch('/api/admin/layaway', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
}

// Hook de lectura reactiva para el Admin Dashboard.
export function useLayaway() {
  const [layaways, setLayaways] = useState<LayawayRequest[]>([]);

  const refresh = useCallback(() => {
    fetchLayaways().then(setLayaways).catch((err) => console.error('Error al cargar apartados de TENISIN:', err));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const setStatus = async (id: string, status: LayawayStatus) => {
    await updateLayawayRequest(id, { status });
    refresh();
  };
  const setNote = async (id: string, note: string) => {
    await updateLayawayRequest(id, { note });
    refresh();
  };
  const remove = async (id: string) => {
    await deleteLayawayRequest(id);
    refresh();
  };

  return { layaways, setStatus, setNote, remove, refresh };
}
