// src/lib/carrier-detection.ts
//
// Detección de paquetería por formato del código de rastreo. Esto es
// heurístico, no exacto: varias paqueterías usan códigos puramente
// numéricos de longitudes parecidas, así que un mismo código de 10-11
// dígitos podría en teoría ser de más de una. El orden de PATTERNS importa
// (de más específico a más ambiguo) y TrackingHub siempre deja un selector
// manual visible para cuando la detección automática se equivoque — no se
// presenta como 100% infalible.
//
// ⚠️ Verificar antes de producción: las URLs de rastreo con el código
// inyectado por query param se armaron con el formato público conocido de
// cada paquetería al momento de escribir esto; confirmar que sigan vigentes
// (estas URLs cambian sin aviso) antes de confiar en el redirect automático.

import { ShippingCarrier } from '@/types/order';

interface CarrierRule {
  carrier: ShippingCarrier;
  label: string;
  pattern: RegExp;
  trackingUrl: (code: string) => string;
  // true solo cuando el patrón es virtualmente exclusivo de esa paquetería
  // (prefijo alfabético o longitud muy poco común); false para los rangos
  // puramente numéricos que se solapan entre paqueterías — ahí el usuario
  // debe poder corregir manualmente en TrackingHub.
  confident: boolean;
}

// De más específico (prefijo único) a más genérico (solo dígitos).
const CARRIER_RULES: CarrierRule[] = [
  {
    // DHL Parcel/eCommerce: prefijo alfabético distintivo, poco ambiguo.
    carrier: 'DHL',
    label: 'DHL',
    pattern: /^(JJD|JVGL|GM)\d{10,16}$/i,
    trackingUrl: (code) => `https://www.dhl.com/mx-es/home/tracking.html?tracking-id=${code}`,
    confident: true,
  },
  {
    // FedEx: 15 o 20-22 dígitos son casi exclusivos de FedEx (door-tag/express).
    carrier: 'FEDEX',
    label: 'FedEx',
    pattern: /^\d{15}$|^\d{20,22}$/,
    trackingUrl: (code) => `https://www.fedex.com/fedextrack/?trknbr=${code}`,
    confident: true,
  },
  {
    // FedEx Ground/Express clásico de 12 dígitos — se solapa poco con las
    // demás, pero no es tan inequívoco como los de arriba.
    carrier: 'FEDEX',
    label: 'FedEx',
    pattern: /^\d{12}$/,
    trackingUrl: (code) => `https://www.fedex.com/fedextrack/?trknbr=${code}`,
    confident: false,
  },
  {
    // DHL Express (AWB) de 10-11 dígitos — se revisa DESPUÉS de FedEx-12 para
    // no competir con ese rango, pero antes de Estafeta por ser más específico
    // en longitud (Estafeta suele ser más largo o alfanumérico).
    carrier: 'DHL',
    label: 'DHL',
    pattern: /^\d{10,11}$/,
    trackingUrl: (code) => `https://www.dhl.com/mx-es/home/tracking.html?tracking-id=${code}`,
    confident: false,
  },
  {
    // Estafeta (mensajería mexicana): códigos numéricos de 9-14 dígitos,
    // formato menos estandarizado públicamente — se deja como fallback
    // numérico más amplio, priorizando el contexto MX de LAMK.
    carrier: 'ESTAFETA',
    label: 'Estafeta',
    pattern: /^\d{9,14}$/,
    trackingUrl: (code) => `https://rastreo.estafeta.com/RastreoEnvios/${code}`,
    confident: false,
  },
];

export interface CarrierDetectionResult {
  carrier: ShippingCarrier;
  label: string;
  trackingUrl: string;
  confident: boolean; // false = "revisa que sea la paquetería correcta" en la UI
}

export function detectCarrier(rawCode: string): CarrierDetectionResult | null {
  const code = rawCode.trim().toUpperCase().replace(/\s+/g, '');
  if (!code) return null;

  for (const rule of CARRIER_RULES) {
    if (rule.pattern.test(code)) {
      return { carrier: rule.carrier, label: rule.label, trackingUrl: rule.trackingUrl(code), confident: rule.confident };
    }
  }
  return null;
}

export const MANUAL_CARRIERS: { carrier: ShippingCarrier; label: string; trackingUrl: (code: string) => string }[] = [
  { carrier: 'FEDEX', label: 'FedEx', trackingUrl: (c) => `https://www.fedex.com/fedextrack/?trknbr=${c}` },
  { carrier: 'DHL', label: 'DHL', trackingUrl: (c) => `https://www.dhl.com/mx-es/home/tracking.html?tracking-id=${c}` },
  { carrier: 'ESTAFETA', label: 'Estafeta', trackingUrl: (c) => `https://rastreo.estafeta.com/RastreoEnvios/${c}` },
];
