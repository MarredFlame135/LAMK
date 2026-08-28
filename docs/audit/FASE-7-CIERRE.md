# Fase 7 — Cierre

Rama: `audit/fase-7-cierre`, última de las 7. A diferencia de las fases 1-6, esta no reporta hallazgos con severidad — es la entrega final: suite de pruebas, `CLAUDE.md` actualizado, documento de despliegue, y el resumen ejecutivo para Dante.

## 1. Suite de pruebas

**Antes: cero pruebas en todo el proyecto** (confirmado en Fase 0). Ahora: **Vitest**, `npm run test`, 36 pruebas en 6 archivos, todas verdes.

**Por qué Vitest y no Jest:** una sola dependencia de desarrollo, corre directo sobre Node sin el wrapper de compilación de `next/jest`, y las funciones que se prueban son lógica pura de `src/lib/*` — no hace falta renderizar componentes de React ni simular un DOM, así que la config es mínima (`vitest.config.mts` — el `.mts` es necesario: `vitest.config.ts` falla al cargar por un conflicto ESM/CJS con una dependencia transitiva de Vitest, `std-env`).

### Los cuatro caminos críticos que pidió el brief, uno por uno

1. **Autorización** — `session.test.ts` (sesión de admin: firma/verifica, tokens manipulados, con secreto distinto, expirados, y una prueba de regresión explícita para el fail-closed de producción del hallazgo #1 de la Fase 1), `admin-access.test.ts` (quién es admin), `otp.test.ts` (el ticket de verificación de WhatsApp no es falsificable ni transferible entre teléfonos), `rate-limit.test.ts` (el límite de intentos de verdad limita).
2. **Cálculo de totales** — `cart-math.test.ts`. Este cálculo vivía inline dentro de `CartContext.tsx`, imposible de probar sin renderizar el Provider completo — se extrajo a `src/lib/cart-math.ts` como función pura (mismo código, solo movido) específicamente para poder probarlo. Cubre: suma de precio×cantidad, el umbral exacto de envío gratis (no solo "por encima"), y que los porcentajes/restantes nunca salgan negativos o pasen de 100.
3. **Webhooks de pago** — **no se escribió ningún test.** No hay ningún webhook de Shopify configurado en el proyecto (confirmado en Fase 0 y otra vez aquí) — escribir pruebas para código que no existe sería inventar cobertura, lo mismo que "no inventes hallazgos" aplicado a pruebas.
4. **Controles de privacidad de perfil** — **tampoco se escribió ningún test**, misma razón: el modelo de privacidad está diseñado (`FASE-2-PRIVACIDAD.md`) pero no implementado en código. Probar el `mock-users.ts` actual sería probar una maqueta.

**Bonus, no pedido explícitamente pero relevante:** `hype.test.ts` — el cálculo del Hype Meter que la Fase 6 confirmó que ya era real (no curaduría manual). Queda cubierto para que si algún día alguien lo cambia sin querer, la suite lo note.

## 2. `CLAUDE.md` actualizado

Reescrito con todo lo aprendido en las 7 fases — no solo el inventario original de la Fase 0. Cambios de fondo: la tabla de stack ahora refleja Vercel Analytics y Vitest como parte real del proyecto; la sección de autenticación documenta el rate limiting y las protecciones agregadas en Fase 1; se agregó una sección de SEO que no existía; la deuda técnica se actualizó (ya no dice "sin headers de seguridad" — eso se corrigió — y suma los puntos nuevos: rate limiting en memoria no distribuido, sin webhook de Shopify, CSP sin nonces); y un índice final que apunta a los 7 documentos de auditoría.

## 3. Documento de despliegue

`docs/DEPLOYMENT.md` (nuevo) — variables de entorno separadas en obligatorias/opcionales con qué pasa si falta cada una (destacando que `ADMIN_SESSION_SECRET` ahora bloquea el panel de admin a propósito si falta, por el fix de Fase 1), qué se respalda y qué no (nada — el filesystem de `data/*.json` sigue sin respaldo, mismo hallazgo de siempre), y qué monitoreo existe hoy (Vercel Analytics, logs) contra lo que todavía no existe (alertas, error tracking estructurado, uptime monitoring) — documentado como una observación honesta, no como una falla de esta auditoría (no estaba en el alcance del brief).

`.env.example` se actualizó con `OTP_SESSION_SECRET` (la variable nueva de la Fase 1 que antes no estaba documentada ahí).

## 4. Resumen ejecutivo

`docs/audit/RESUMEN-EJECUTIVO.md` — sin tecnicismos, organizado por lo que se corrigió (con una frase de qué significaba el riesgo real, no el nombre técnico del hallazgo) y lo que queda pendiente con la razón concreta de cada uno. Incluye lo que salió bien, no solo problemas — el Hype Meter ya calculado, el precio del checkout siempre validado por Shopify, los empty states del panel de admin.

## Verificación de esta fase

`tsc --noEmit` limpio, `npm run build` exitoso, `npm run test` con las 36 pruebas en verde. Nada desplegado, nada en `main` — la rama `audit/fase-7-cierre` es la última de las 7, lista para que decidas qué se fusiona y cuándo se despliega.
