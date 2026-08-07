// src/lib/validators.ts

// Valida el FORMATO de un Código Postal mexicano (5 dígitos, SEPOMEX no usa
// "00000"). No consulta un catálogo real de CPs existentes — eso requeriría
// una base de datos de Correos de México que este proyecto no tiene todavía.
export function isValidMexicanPostalCode(cp: string): boolean {
  return /^\d{5}$/.test(cp) && cp !== '00000';
}

export function isValidMexicanPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone);
}

// Normaliza cualquier variante común de un teléfono mexicano a E.164
// (+52XXXXXXXXXX), que es el formato que exige Shopify (customerCreate
// rechaza con "Phone is invalid" un número de 10 dígitos sin código de país).
// Acepta: "5512345678", "+525512345678", "525512345678", "045512345678"
// (prefijo local legacy de celular), espacios/guiones/paréntesis.
// Devuelve null si no se puede normalizar a 10 dígitos válidos.
export function normalizeMexicanPhoneE164(raw: string): string | null {
  let digits = raw.replace(/[^\d+]/g, '');

  if (digits.startsWith('+52')) digits = digits.slice(3);
  else if (digits.startsWith('52') && digits.length > 10) digits = digits.slice(2);
  else if (digits.startsWith('044') || digits.startsWith('045')) digits = digits.slice(3);
  else digits = digits.replace(/^\+/, '');

  if (!/^\d{10}$/.test(digits)) return null;
  return `+52${digits}`;
}
