// src/components/analytics/AnalyticsGate.tsx
//
// Monta <Analytics /> de @vercel/analytics SOLO si la persona ya aceptó el
// consentimiento de tracking (ver PrivacyConsentBanner.tsx / lib/analytics.ts)
// — así el script de analítica ni siquiera se carga hasta que hay un
// "Aceptar" real, no solo `track()` respetando el consentimiento por su
// cuenta. Escucha el evento `storage` para reaccionar si la persona
// responde el banner en la misma sesión, sin necesitar un refresh.

'use client';

import React, { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { ANALYTICS_CONSENT_KEY, getAnalyticsConsent } from '@/lib/analytics';

export function AnalyticsGate() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getAnalyticsConsent() === 'accepted');

    // El banner vive en otro componente montado en el mismo layout — no hay
    // evento `storage` disparado por el propio tab que lo escribió, así que
    // se revisa también con un pequeño poll ligero mientras el banner sigue
    // visible. Costo mínimo: para en cuanto detecta una decisión.
    const interval = setInterval(() => {
      const consent = getAnalyticsConsent();
      if (consent !== 'undecided') {
        setEnabled(consent === 'accepted');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!enabled) return null;
  return <Analytics />;
}
