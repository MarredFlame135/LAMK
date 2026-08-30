// src/lib/legal.ts
//
// Fix (hallazgo #3 de la auditoría "Prompt Maestro v4", Fase A): la fecha de
// "última actualización" del Aviso de Privacidad usaba `new Date()` — es
// decir, mostraba SIEMPRE la fecha de hoy, en cada carga de página, nunca
// una fecha real de publicación. Aparte de ser falso ("actualizado hoy"
// todos los días), rompe la premisa completa de versionar el consentimiento:
// `consent_log.privacyVersion` (ver db/schema.ts) necesita anclarse a un
// valor fijo para que algún día se pueda responder "¿qué versión del aviso
// aceptó esta persona?". Ahora ambos (la página y el log) leen de aquí.
//
// Cámbialo a mano cuando el Aviso de Privacidad cambie de verdad — nunca se
// debe derivar automáticamente de la fecha de build/deploy.
export const PRIVACY_NOTICE_VERSION = '2026-08-29';

export function formatPrivacyNoticeDate(): string {
  const [year, month, day] = PRIVACY_NOTICE_VERSION.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
