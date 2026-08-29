// drizzle.config.ts
//
// drizzle-kit no carga .env.local solo — se corre con dotenv-cli (ver
// package.json, scripts db:*), no directo.

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
