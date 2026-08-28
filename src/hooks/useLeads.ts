// src/hooks/useLeads.ts
//
// Cliente delgado sobre /api/admin/leads (servidor, ver src/lib/leads-store.ts).
// Antes esto guardaba en localStorage del navegador — lo que capturaba el
// cliente en su celular nunca le llegaba al admin en su computadora. Ahora
// todo pasa por el servidor, compartido de verdad entre todos.

'use client';

import { useState, useEffect, useCallback } from 'react';
import { DemandRequest } from '@/types/admin';
import { track } from '@/lib/analytics';

async function fetchLeads(): Promise<DemandRequest[]> {
  const res = await fetch('/api/admin/leads');
  const data = await res.json();
  return data.leads || [];
}

// Llamado por TENISIN / ProductDetail cada vez que un cliente busca algo o
// pide que le avisen. Devuelve una Promise — los call sites deben esperarla.
export async function logDemandRequest(input: {
  productId: string;
  productTitle: string;
  requestedSize?: string;
  customerPhone?: string;
  customerEmail?: string;
  rawQuery: string;
  wasMatched: boolean;
}): Promise<DemandRequest> {
  const res = await fetch('/api/admin/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  // Fix (hallazgo #2 de la auditoría de Fase 5): un solo punto de entrada
  // cubre las 4 llamadas a logDemandRequest en TenisinWidget.tsx — todas
  // representan la misma señal ("alguien buscó algo, ¿lo encontramos?").
  track('search_query', { rawQuery: input.rawQuery, hadResults: input.wasMatched });
  return data.lead;
}

export async function updateDemandRequest(id: string, patch: Partial<DemandRequest>): Promise<void> {
  await fetch('/api/admin/leads', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, patch }),
  });
}

export async function deleteDemandRequest(id: string): Promise<void> {
  await fetch('/api/admin/leads', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
}

// Hook de lectura reactiva para el Admin Dashboard. Se re-consulta cada vez
// que la pestaña vuelve a tener foco, además de al montar.
export function useLeads() {
  const [leads, setLeads] = useState<DemandRequest[]>([]);

  const refresh = useCallback(() => {
    fetchLeads().then(setLeads).catch((err) => console.error('Error al cargar peticiones de TENISIN:', err));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const markNotified = async (id: string) => {
    await updateDemandRequest(id, { notified: true });
    refresh();
  };
  const remove = async (id: string) => {
    await deleteDemandRequest(id);
    refresh();
  };

  return { leads, markNotified, remove, refresh };
}
