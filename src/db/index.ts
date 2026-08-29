// src/db/index.ts
//
// Inicialización perezosa a propósito: `neon()` truena si DATABASE_URL no
// está configurada, y Next.js evalúa código de nivel superior de un módulo
// en build time — si esto llamara a neon() al importar el módulo, tumbaría
// `next build` en cualquier entorno donde la variable no esté todavía (ej.
// el primer deploy antes de que Vercel termine de aprovisionar la base de
// datos). getDb() difiere esa llamada hasta el primer uso real, en runtime.

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!);
    _db = drizzle(sql, { schema });
  }
  return _db;
}
