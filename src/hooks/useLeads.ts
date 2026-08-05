// src/hooks/useLeads.ts
//
// Persiste las peticiones que TENISIN captura de los clientes (búsquedas sin
// resultado, productos agotados, WhatsApp para notificar restock) para que el
// admin las vea en su dashboard. Mismo patrón de persistencia que useCart.ts.

'use client';

import { useState, useEffect, useCallback } from 'react';
import { DemandRequest } from '@/types/admin';

const LOCAL_STORAGE_KEY = 'lamk_tenisin_leads_v1';
const UPDATE_EVENT = 'lamk:leads-updated';

function readLeads(): DemandRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as DemandRequest[]) : [];
  } catch (e) {
    console.error('Error al leer peticiones de TENISIN:', e);
    return [];
  }
}

function writeLeads(leads: DemandRequest[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(leads));
  // Notifica a cualquier otro componente montado en la misma pestaña (ej. el
  // admin dashboard abierto al mismo tiempo que un cliente usa TENISIN).
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

// Llamado por TENISIN cada vez que un cliente busca algo. Se puede invocar sin
// hook (fuera de React) porque solo toca localStorage + un evento del DOM.
export function logDemandRequest(input: {
  productId: string;
  productTitle: string;
  requestedSize?: string;
  customerPhone?: string;
  customerEmail?: string;
  rawQuery: string;
  wasMatched: boolean;
}): DemandRequest {
  const lead: DemandRequest = {
    id: `LEAD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    productId: input.productId,
    productTitle: input.productTitle,
    requestedSize: input.requestedSize || 'N/A',
    customerPhone: input.customerPhone || '',
    customerEmail: input.customerEmail || '',
    createdAt: new Date().toISOString(),
    notified: false,
    rawQuery: input.rawQuery,
    wasMatched: input.wasMatched,
    source: 'TENISIN_CHAT',
  };

  const current = readLeads();
  writeLeads([lead, ...current]);
  return lead;
}

// Actualiza un lead existente (ej. cuando el cliente da su WhatsApp después
// de que TENISIN le preguntó, o el admin lo marca como atendido/notificado).
export function updateDemandRequest(id: string, patch: Partial<DemandRequest>) {
  const current = readLeads();
  const updated = current.map((l) => (l.id === id ? { ...l, ...patch } : l));
  writeLeads(updated);
}

export function deleteDemandRequest(id: string) {
  writeLeads(readLeads().filter((l) => l.id !== id));
}

// Hook de lectura reactiva para el Admin Dashboard.
export function useLeads() {
  const [leads, setLeads] = useState<DemandRequest[]>([]);

  const refresh = useCallback(() => setLeads(readLeads()), []);

  useEffect(() => {
    refresh();
    window.addEventListener(UPDATE_EVENT, refresh);
    window.addEventListener('storage', refresh); // sincroniza entre pestañas
    return () => {
      window.removeEventListener(UPDATE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  const markNotified = (id: string) => updateDemandRequest(id, { notified: true });
  const remove = (id: string) => deleteDemandRequest(id);

  return { leads, markNotified, remove, refresh };
}
