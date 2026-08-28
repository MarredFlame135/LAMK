// vitest.config.ts
//
// Fase 7 de la auditoría — primera suite de pruebas del proyecto (antes no
// existía ninguna, confirmado en Fase 0). Vitest en vez de Jest: no
// requiere el wrapper de compilación de `next/jest`, corre directo sobre
// Node (las funciones que se prueban son lógica pura de `src/lib/*`, sin
// necesitar renderizar componentes de React ni un DOM simulado) y es una
// sola dependencia de desarrollo, no dos o tres.
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
