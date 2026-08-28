// src/lib/analytics.ts
//
// Capa de eventos de analítica — Fase 5 de la auditoría. Envuelve
// @vercel/analytics para que:
//
//  1. Nada se dispare sin consentimiento real (hallazgo #1: antes el
//     banner de privacidad no distinguía "aviso de datos operativos" de
//     "consentimiento de tracking" — ahora son cosas separadas, ver
//     PrivacyConsentBanner.tsx). Si el usuario rechazó o todavía no ha
//     decidido, `track()` no manda absolutamente nada — no hace falta
//     acordarse de chequear el consentimiento en cada punto de llamada.
//  2. El tipado de los eventos sea la barrera contra colar PII sin
//     querer — cada evento tiene una forma fija de campos permitidos
//     (ver docs/audit/FASE-5-ANALITICA.md), no un objeto libre donde
//     alguien podría pasar `email`/`phone` por descuido.

import { track as vercelTrack } from '@vercel/analytics';

export const ANALYTICS_CONSENT_KEY = 'lamk_analytics_consent_v1';

export type ConsentState = 'accepted' | 'rejected' | 'undecided';

export function getAnalyticsConsent(): ConsentState {
  if (typeof window === 'undefined') return 'undecided';
  try {
    const v = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (v === 'accepted' || v === 'rejected') return v;
  } catch {
    // localStorage puede fallar en modo privado — se trata como "undecided".
  }
  return 'undecided';
}

export function setAnalyticsConsent(state: 'accepted' | 'rejected'): void {
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, state);
  } catch {
    // No bloquea el sitio si localStorage falla — solo no persiste la elección.
  }
}

// Unión de eventos permitidos. Ninguno lleva email, nombre, teléfono ni
// dirección — solo IDs de producto/variante (ya públicos, son handles de
// Shopify), posiciones y montos agregados.
type AnalyticsEvent =
  | { name: 'product_view'; data: { productId: string; handle: string; category: string } }
  | { name: 'add_to_cart'; data: { productId: string; variantId: string; price: number } }
  | { name: 'checkout_started'; data: { itemCount: number; subtotal: number } }
  | { name: 'carousel_impression'; data: { carouselName: string; position: number } }
  | { name: 'carousel_click'; data: { carouselName: string; position: number } }
  | { name: 'search_query'; data: { rawQuery: string; hadResults: boolean } };

export function track<Name extends AnalyticsEvent['name']>(
  name: Name,
  data: Extract<AnalyticsEvent, { name: Name }>['data']
): void {
  if (typeof window === 'undefined') return;
  if (getAnalyticsConsent() !== 'accepted') return;
  try {
    vercelTrack(name, data as Record<string, string | number | boolean>);
  } catch (err) {
    console.error('Error al registrar evento de analítica:', err);
  }
}
