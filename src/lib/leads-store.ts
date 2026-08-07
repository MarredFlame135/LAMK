// src/lib/leads-store.ts
//
// Peticiones de demanda capturadas por TENISIN (server-side, JSON en /data —
// mismo patrón que hype.ts/reviews-store.ts). Reemplaza el localStorage
// anterior: esas peticiones las genera el CLIENTE en su propio navegador, y
// el admin necesita verlas desde el suyo — localStorage nunca iba a servir
// para eso porque no se comparte entre navegadores/dispositivos.

import fs from 'fs';
import path from 'path';
import { DemandRequest } from '@/types/admin';

const DATA_DIR = path.join(process.cwd(), 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');

function readLeads(): DemandRequest[] {
  try {
    if (!fs.existsSync(LEADS_FILE)) return [];
    return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error al leer leads.json:', err);
    return [];
  }
}

function writeLeads(leads: DemandRequest[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads));
  } catch (err) {
    console.error('Error al guardar leads.json:', err);
  }
}

export function getLeads(): DemandRequest[] {
  return readLeads();
}

export function addLead(input: {
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
  writeLeads([lead, ...readLeads()]);
  return lead;
}

export function updateLead(id: string, patch: Partial<DemandRequest>): void {
  writeLeads(readLeads().map((l) => (l.id === id ? { ...l, ...patch } : l)));
}

export function deleteLead(id: string): void {
  writeLeads(readLeads().filter((l) => l.id !== id));
}
