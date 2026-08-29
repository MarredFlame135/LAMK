// src/lib/social/age.ts
//
// Fase 2 de la auditoría, sección 4: la edad se recalcula en cada request,
// no solo al registrarse — así un usuario de 17 años pasa a las reglas de
// adulto el día que cumple 18 sin que nadie tenga que hacer nada.
//
// Fix (encontrado durante la construcción, con un test que lo atrapó):
// `new Date('2008-08-29')` (string solo-fecha) se interpreta como
// medianoche UTC — al leerla de vuelta con `.getDate()`/`.getMonth()`
// (hora LOCAL del servidor), en cualquier huso horario detrás de UTC
// (México incluido) cae un día antes de lo real. Eso podía calcular la
// edad de alguien mal por un día cerca de la medianoche/fin de mes, según
// dónde corriera el servidor. Se parsean los componentes de la fecha a
// mano — sin pasar por conversión de huso horario en ningún punto — y se
// compara contra la fecha de hoy también en términos UTC, consistente.

export function isMinor(dateOfBirth: string | null): boolean {
  if (!dateOfBirth) return true; // sin fecha declarada: se trata como menor — el default más restrictivo, nunca el más permisivo

  const parts = dateOfBirth.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return true;
  const [dobYear, dobMonth, dobDay] = parts; // dobMonth: 1-indexado

  const now = new Date();
  const nowYear = now.getUTCFullYear();
  const nowMonth = now.getUTCMonth() + 1;
  const nowDay = now.getUTCDate();

  let age = nowYear - dobYear;
  const monthDiff = nowMonth - dobMonth;
  if (monthDiff < 0 || (monthDiff === 0 && nowDay < dobDay)) {
    age--;
  }
  return age < 18;
}
