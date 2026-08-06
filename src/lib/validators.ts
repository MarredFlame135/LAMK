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
