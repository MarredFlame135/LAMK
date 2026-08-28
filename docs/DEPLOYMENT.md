# Despliegue — LAMK Essential Evolution

Documento de la Fase 7 de la auditoría. Cubre variables de entorno, respaldos y monitoreo — lo que hace falta saber para desplegar y mantener el sitio con confianza, no una guía genérica de Next.js/Vercel.

**Recordatorio del criterio de esta auditoría: nada de este trabajo se desplegó.** Todo vive en ramas `audit/fase-N-*`, ninguna fusionada a `main`. Cuándo y cómo desplegar es una decisión de Dante — este documento describe cómo hacerlo cuando se decida, no un aviso de que ya se hizo.

## Variables de entorno

Fuente de verdad: `.env.example` en la raíz del repo (siempre actualizado con esta lista). Configúralas en Vercel → Project Settings → Environment Variables, no solo en `.env.local`.

### Obligatorias para que el sitio funcione

| Variable | Para qué | Si falta |
|---|---|---|
| `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` | Dominio de la tienda — usado también como fuente de la URL pública del sitio (`src/lib/site-url.ts`, `metadataBase`, `robots.ts`, `sitemap.ts`, JSON-LD) | El catálogo cae a datos mock; SEO/sitemap apuntan al fallback `lamk.vercel.app` |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Token público de Storefront API | El catálogo cae a datos mock |
| `SHOPIFY_PRIVATE_STOREFRONT_ACCESS_TOKEN` | Token privado de Storefront API (server-side) | El catálogo cae a datos mock |
| `SHOPIFY_API_VERSION` | Versión de la API de Shopify a usar | Falla el fetch a Shopify |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenciales del admin raíz | Nadie puede entrar a `/admin/*` |
| `ADMIN_SESSION_SECRET` | Firma la cookie de sesión de admin | **Crítico desde la Fase 1**: en producción, sin esto, el servidor rechaza firmar/verificar sesiones (fail-closed a propósito) — el panel de admin queda inaccesible hasta configurarla, en vez de caer a un secreto inseguro conocido. |

### Opcionales — el sitio funciona sin ellas, pero con menos funciones

| Variable | Para qué | Si falta |
|---|---|---|
| `SHOPIFY_ADMIN_API_STORE_DOMAIN` / `SHOPIFY_ADMIN_API_ACCESS_TOKEN` | Pestaña "Clientes" del panel admin (scopes `read_customers`+`read_orders`) | Esa pestaña muestra solo leads/apartados, sin clientes reales de Shopify |
| `ADMIN_EMAILS` | Admins adicionales (allowlist, sin contraseña propia — usan su cuenta de cliente) | Solo el admin raíz tiene acceso |
| `OTP_SESSION_SECRET` | Firma el ticket de verificación de WhatsApp, independiente de `ADMIN_SESSION_SECRET` | Usa `ADMIN_SESSION_SECRET` como respaldo — no rompe nada, solo comparten secreto |
| `WHATSAPP_API_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Envío real de WhatsApp (OTP antes de pagar) | El código de verificación se muestra en pantalla en vez de enviarse — el checkout sigue funcionando, solo en "modo desarrollo" visible para cualquiera |
| `META_APP_ID` / `META_APP_SECRET` | Publicación real en Instagram/Facebook desde el botón "Publicar Drop" del panel admin | Ese botón sigue respondiendo éxito pero no publica nada de verdad (es un stub, ver `CLAUDE.md`) |

## Respaldos

**No hay base de datos que respaldar** (ver `CLAUDE.md` → "Persistencia") — el estado real del negocio (productos, precios, stock, clientes, pedidos) vive en Shopify, que ya tiene sus propios respaldos gestionados por Shopify. Lo único que vive en este repo/deploy y **no está respaldado hoy**:

- `data/*.json` (leads, reseñas, ventas offline, apartados, inventario oculto, vistas del Hype Meter) — filesystem efímero de la función serverless, sin ningún respaldo. Es la misma deuda técnica documentada en `CLAUDE.md`. Si se pierden, se pierden sin aviso.

**Recomendación concreta, no ejecutada:** antes de que el negocio dependa de verdad de leads/reseñas/ventas offline capturados aquí, migrar esos 6 stores a una base de datos real con respaldo automático (Postgres administrado vía el marketplace de Vercel, por ejemplo) — es la misma recomendación que ya está en `CLAUDE.md`, repetida aquí porque es directamente relevante a "qué se pierde si algo sale mal".

## Monitoreo

**Lo que ya existe, listo para usarse en cuanto se despliegue:**

- **Vercel Analytics** (Fase 5) — funnel de compra, clics de carrusel por posición, búsquedas sin resultado. Se ve en el dashboard de Vercel del proyecto, pestaña Analytics, en cuanto haya tráfico real y consentimiento aceptado (los eventos no llegan si alguien rechaza el consentimiento de tracking — es el comportamiento correcto, no un bug).
- **Logs de servidor** — todos los `console.error` ya presentes en rutas de API (errores de Shopify, de WhatsApp, de sesión) aparecen en Vercel → Logs sin configuración adicional.

**Lo que NO existe todavía, y vale la pena considerar antes de un lanzamiento con tráfico real:**

- **Alertas** — hoy nadie se entera si `/api/cart/checkout` empieza a fallar salvo que alguien revise los logs manualmente. Vercel tiene integraciones de alertas (Slack, email) que no están configuradas.
- **Error tracking estructurado** (Sentry o similar) — los `console.error` existen pero no hay un lugar centralizado que agrupe errores repetidos o avise en tiempo real.
- **Uptime monitoring** — nada revisa desde afuera si el sitio está caído.

Ninguna de estas tres es una falla de la auditoría (no estaban en el alcance del brief) — se documentan aquí porque es exactamente el tipo de cosa que un documento de despliegue debe señalar antes de que el sitio reciba tráfico real.

## Antes de cada despliegue — checklist rápido

1. `npm run test` — 36 pruebas, deben pasar todas.
2. `npx tsc --noEmit` — sin errores de tipos.
3. `npm run build` — build de producción completo, sin errores.
4. Confirmar que las variables "Obligatorias" de la tabla de arriba están configuradas en el entorno de destino (Preview o Production) en Vercel — especialmente `ADMIN_SESSION_SECRET`, que desde la Fase 1 bloquea el panel de admin si falta, a propósito.
