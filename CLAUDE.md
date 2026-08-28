# LAMK Essential Evolution — CLAUDE.md

Documentación viva del proyecto. Generada en la Fase 0 de la auditoría (2026-08-27) y actualizada al cierre de la Fase 7 (2026-08-28) con todo lo aprendido durante las 7 fases (`docs/audit/FASE-0-*.md` a `FASE-7-*.md` tienen el detalle completo de cada una). Actualízala cuando algo aquí quede desactualizado.

## Qué es

**Look At My Kicks MX (LAMK)** — e-commerce PWA de sneakers/streetwear premium en México, con capa de gamificación ("Bóveda del Coleccionista", XP, tiers) y un asistente de IA conversacional (TENISIN) para búsqueda guiada de catálogo.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14.2.35 (App Router), TypeScript, React 18 |
| Estilos | Tailwind CSS 3, tokens de tema en `src/styles/globals.css` |
| Animación | `framer-motion` (única librería — el paquete `motion` standalone que se usaba en 2 componentes se consolidó a `framer-motion` en la Fase 3) |
| Catálogo / inventario | **Shopify Storefront API** (GraphQL) — fuente real, no simulada |
| Auth de cliente | Shopify Customer Accounts (`customerAccessTokenCreate`) — contraseña gestionada por Shopify, no por este repo |
| Auth de admin | Credencial única por variable de entorno (`ADMIN_EMAIL`/`ADMIN_PASSWORD`) + allowlist opcional (`ADMIN_EMAILS`) que reutiliza la contraseña de cliente de esos correos — ver `src/lib/admin-access.ts` |
| Sesión | Cookie HMAC-SHA256 propia para admin (`lamk_admin_session`, ver `src/lib/session.ts`, **fail-closed en producción desde la Fase 1** si falta el secreto); cookie del token de Shopify para cliente (`lamk_customer_token`) |
| Checkout / pago | **Shopify Checkout real** — `cartCreate` (Storefront API) devuelve `checkoutUrl`, se redirige ahí. No hay pasarela de pago propia, no se procesa ni se guarda tarjeta en este repo. Verificación de teléfono por WhatsApp antes de pagar es 100% server-side desde la Fase 1 (`src/lib/otp.ts`, ticket firmado, nunca un código en claro comparado en el navegador). |
| Analítica | **Vercel Analytics** (`@vercel/analytics`), instalado en la Fase 5 — eventos personalizados tipados en `src/lib/analytics.ts` (funnel de compra, clics de carrusel por posición, búsquedas), gateado por consentimiento real (ver `PrivacyConsentBanner.tsx`) |
| Pruebas | **Vitest**, desde la Fase 7 — `npm run test`, ver sección "Suite de pruebas" abajo |
| Base de datos | **No existe.** Ver "Persistencia" abajo — sigue siendo la deuda técnica más importante del proyecto. |
| Hosting | Vercel (`lamk.vercel.app`, dominio propio `lookatmykicksmx.com` pendiente de compra — ver `src/lib/site-url.ts`) |
| Generación de imágenes | Higgsfield (herramienta externa usada por Claude para generar placeholders — no es parte del runtime del sitio). **Regla desde la Fase 3:** cualquier imagen nueva de Higgsfield necesita un paso de redimensionado/compresión a WebP antes de entrar a `public/` — no asumir que el archivo generado ya viene listo para producción (varias imágenes llegaron a pesar 2.5-6.4 MB para mostrarse a 40-56px). |
| WhatsApp / Meta | `WHATSAPP_API_TOKEN` y `META_APP_ID`/`META_APP_SECRET` **no configurados** — el OTP de WhatsApp corre en modo desarrollo (muestra el código en pantalla en vez de enviarlo real — la verificación en sí ya es real del lado servidor desde la Fase 1, ver arriba), y el feed de Instagram "en vivo" es honestamente un CTA al perfil real, no un feed sincronizado |

## Persistencia — deuda técnica más importante

No hay base de datos. Los siguientes "stores" escriben JSON a `process.cwd()/data/*.json` con `fs.writeFileSync` (`src/lib/inventory-store.ts`, `leads-store.ts`, `reviews-store.ts`, `sales-store.ts`, `layaway-store.ts`, `hype.ts`):

- Inventario oculto / borradores de producto
- Peticiones de demanda capturadas por TENISIN (y desde la Fase 5, cada una también dispara un evento `search_query` de analítica — ver `src/hooks/useLeads.ts`)
- Reseñas de clientes
- Ventas físicas/offline y saldos pendientes
- Apartados (layaway)
- Vistas 24h para el Hype Meter

**Riesgo real:** el filesystem de una función serverless de Vercel no garantiza persistencia entre invocaciones — escrituras pueden no sobrevivir un cold start o una nueva instancia del contenedor. No confirmado con un test de carga, pero es la hipótesis técnica más probable si algún día "desaparecen" leads o reseñas. Por eso el sistema de permisos de admin (`ADMIN_EMAILS`), el rate limiting (Fase 1) y la analítica (Fase 5) se hicieron con variable de entorno / en memoria / Vercel Analytics respectivamente, en vez de seguir este mismo patrón de store en JSON.

**Recomendación (no ejecutada, pendiente de decisión):** migrar estos 6 stores a una base de datos real (Postgres vía Vercel/Neon, o similar) antes de depender de ellos para decisiones de negocio.

## Modelo de datos

Todo vive en `src/types/`:

- **`Product` / `ProductVariant`** (`types/product.ts`) — reflejo tipado de lo que devuelve Shopify (`formatShopifyProduct` en `lib/shopify/index.ts`), más metafields custom (`storytelling`, `fitAdvisor`) y el Hype Meter calculado (`lib/hype.ts`, real: vistas24h/stock — confirmado en la Fase 6 que ya es un cálculo, no curaduría manual).
- **`UserProfile`** (`types/user.ts`) — perfil de cliente. Para la propia bóveda (`/vault`) viene de `getCustomerProfile()` (Shopify real). Para perfiles públicos de OTROS coleccionistas (`/profile/[username]`) viene de `src/lib/mock-users.ts` — **ficticio, documentado como tal en el propio archivo**, porque no existe un directorio real de clientes consultable por username. Desde la Fase 4, esta ruta es `noindex` (no debe indexarse en buscadores). Incluye `xp`/`tier`/`collection` (bóveda) y `BrandAffinityScore`/`CustomerSegment` (tipos definidos, sin UI de captura real todavía).
- **`CartItem` / `ShippingAddress`** (`types/cart.ts`) — carrito local (Context + localStorage, ver `src/context/CartContext.tsx`), se traduce a un carrito real de Shopify solo al momento del checkout. El cálculo de subtotal/envío/total vive en `src/lib/cart-math.ts` (extraído a función pura en la Fase 7 específicamente para poder probarlo — ver "Suite de pruebas").
- **`Order`** (`types/order.ts`) — tipo definido para un futuro webhook de post-compra; **no hay tabla ni store real detrás todavía** — las órdenes reales viven en Shopify una vez que el cliente completa el Checkout. **No existe ningún webhook de Shopify configurado** — el sitio nunca vuelve a saber si un checkout iniciado se completó (ver Fase 5, evento `checkout_started` es lo más cerca de "compra" que se puede medir hoy).
- **No existe ninguna relación usuario-usuario** (seguir, bloquear, compartir por QR) todavía en código — el modelo de privacidad completo para esas funciones (qué es público/privado por defecto, cómo se revoca un QR, reglas para menores) ya está **diseñado y acordado** en `docs/audit/FASE-2-PRIVACIDAD.md`, listo para implementarse cuando se decida construirlo.

## Autenticación y autorización

- `src/middleware.ts` protege `/admin/*` y `/api/admin/*` (matcher explícito, corre en Edge) verificando `lamk_admin_session` vía `verifyAdminSession()`.
- `src/app/api/admin/login/route.ts` — dos caminos: admin raíz (email+password contra env vars) o admin por allowlist (reusa `loginCustomer()` de Shopify contra `ADMIN_EMAILS`). Ambos caminos, más `/api/auth/login`, tienen **rate limiting** desde la Fase 1 (`src/lib/rate-limit.ts`, 5 intentos/10min por IP+email — en memoria por instancia, no distribuido, ver limitación documentada en el propio archivo).
- `/api/image-pipeline` y `/api/social-push` (acciones que solo deberían disparar admins desde el panel) verifican sesión de admin explícitamente desde la Fase 1 — antes no tenían ninguna protección pese a vivir fuera de `/api/admin/*`.
- `src/app/api/auth/*` — registro/login/logout/reset de cliente, todo delegado a Shopify (`src/lib/shopify/customer.ts`).
- **No hay CSRF token explícito** — las mutaciones dependen de `sameSite: 'lax'` en las cookies.
- Rutas de perfil por ID/slug: `/product/[handle]`, `/profile/[username]` — ambas resuelven por handle/slug público, no por ID interno secuencial. Revisado en la Fase 1: no se encontró ningún endpoint que acepte un ID de otro usuario para leer/modificar su recurso.

## Puntos de entrada (API routes)

```
src/app/api/
├── admin/
│   ├── access/route.ts        (GET, solo lectura — quién tiene acceso admin)
│   ├── analytics/route.ts
│   ├── customers/route.ts
│   ├── hidden-products/route.ts
│   ├── inventory/route.ts
│   ├── layaway/route.ts
│   ├── leads/route.ts
│   ├── login/route.ts         (público — punto de entrada, con rate limiting)
│   ├── logout/route.ts        (público)
│   ├── product-drafts/route.ts
│   └── sales/route.ts
├── auth/
│   ├── login/route.ts (con rate limiting)  ├── logout/route.ts  ├── me/route.ts
│   ├── register/route.ts  └── reset-password/route.ts
├── cart/checkout/route.ts     (crea el carrito real en Shopify)
├── catalog/route.ts           └── catalog/cross-sell/route.ts
├── image-pipeline/route.ts    (⚠️ stub — ver nota abajo; protegido por sesión de admin)
├── otp/route.ts               (genera+firma el ticket server-side; con rate limiting)
├── otp/verify/route.ts        (verifica el ticket server-side; con rate limiting)
├── reviews/route.ts
└── social-push/route.ts       (protegido por sesión de admin)
```

**`image-pipeline/route.ts` es un stub** — recibe una URL de imagen y la devuelve tal cual (simula "remoción de fondo IA" en el comentario del código, pero no procesa nada de verdad). No hay subida real de archivos de usuario en todo el proyecto hoy — el riesgo de EXIF/GPS que menciona el brief de auditoría **no aplica todavía** porque la feature de subir fotos no existe; sí aplica el día que se construya.

## SEO

- `src/app/robots.ts` y `src/app/sitemap.ts` (Fase 4) — el sitemap lista home, catálogo y **todos** los productos reales del catálogo (vía `getCatalogLive()`); robots excluye `/admin/`, `/api/` y `/profile/`.
- `product/[handle]/page.tsx` tiene `generateMetadata()` (title/description únicos por producto) + JSON-LD `Product` y `BreadcrumbList`. El layout raíz tiene JSON-LD `Organization` + `metadataBase`/Open Graph (`src/lib/site-url.ts` centraliza la resolución del dominio).
- `profile/[username]/page.tsx` es `noindex` explícito.

## npm audit (Fase 0 — solo reporte, sin `--force`)

3 vulnerabilidades **high**, 0 critical, sin cambios desde la Fase 0:

| Paquete | Severidad | Fix disponible |
|---|---|---|
| `nanoid` (indirecta) | High | Sí, sin cambios de mayor versión |
| `next` (directa) | High | Requiere Next 16.3.3 (**major**, breaking) |
| `postcss` (anidada bajo `next`) | High | Mismo camino que `next` |

El fix de `next`/`postcss` implica una migración de versión mayor — no se ejecuta sin autorización explícita, por la regla de "no reescribir/actualizar sin justificar". Sigue pendiente de decisión al cierre de la auditoría.

## Suite de pruebas

**Existe desde la Fase 7** (antes: ninguna). `npm run test` (Vitest, config en `vitest.config.mts` — el `.mts` es necesario, no cosmético: `vitest.config.ts` falla al cargar por un conflicto ESM/CJS con una dependencia transitiva). 36 pruebas en 6 archivos, todas sobre lógica pura de `src/lib/*` (sin renderizar componentes, sin DOM simulado):

- `session.test.ts` — sesión de admin: roundtrip firma/verifica, tokens manipulados/con secreto distinto/expirados, y una **prueba de regresión explícita** para el fail-closed de producción (hallazgo #1, Fase 1).
- `admin-access.test.ts` — quién es admin (raíz + allowlist), normalización de email, allowlist vacía.
- `otp.test.ts` — ticket de verificación de WhatsApp: código correcto/incorrecto, no transferible entre teléfonos, firma alterada, expiración a los 5 minutos.
- `rate-limit.test.ts` — límite de intentos, bloqueo al excederlo, aislamiento entre claves.
- `cart-math.test.ts` — cálculo de totales del carrito (subtotal, envío gratis, redondeos de porcentaje).
- `hype.test.ts` — cálculo del Hype Meter (el que decide el orden de los carruseles de home).

**Deliberadamente fuera de esta suite, con la razón documentada** (no se inventó cobertura para código que no existe):
- **Webhooks de pago:** no hay ningún webhook de Shopify configurado en el proyecto — no hay nada que probar todavía.
- **Controles de privacidad de perfil:** el modelo está diseñado (`FASE-2-PRIVACIDAD.md`) pero no implementado en código — probar el mock actual sería probar una maqueta, no el producto.

## Convenciones del código (detectadas)

- Comentarios de cabecera en español explicando el "por qué", no solo el "qué" — patrón consistente en casi todo el repo, mantenerlo. Los fixes de la auditoría siguen el mismo patrón: `// Fix (hallazgo #N de la auditoría de Fase X): ...`.
- Nunca inventar datos: cuando no hay una señal real, el patrón establecido es **ocultar la sección** (`if (x.length === 0) return null`) en vez de simular contenido — ver `SocialProofSection.tsx`, `IGLiveMonitor.tsx`.
- Paleta fija "Obsidian & Raw Bone" (tokens en `globals.css`, dark/light vía `next-themes` + clase `.dark`), tipografía Space Grotesk (`--font-display`) / Inter (`--font-sans`) / JetBrains Mono (`--font-mono`), acentos `#FF1E42` (Laser Crimson) y `#C5A059` (Muted Gold). **Desde la Fase 6: usar `text-zinc-400` como mínimo para texto secundario legible sobre el fondo oscuro** (`text-zinc-500` mide 4.33:1 de contraste, por debajo del 4.5:1 que exige WCAG AA para texto normal — `zinc-400` da 8.19:1).
- Sin emoji informal en UI de cliente/admin (títulos, botones) — sí se permiten en el copy de mensajes de WhatsApp salientes (contenido de negocio, no cromo de interfaz).
- Motion: tokens compartidos en `src/lib/motion.ts` (`EASE_LUXURY`, `fadeUp`, `staggerContainer`, `BOUNCE_TAP`) — no inventar curvas nuevas sueltas. **Sin cursor a medida** (se retiró en la Fase 6 — decoración pura, no comunica nada sobre la marca; el archivo `CustomCursor.tsx` sigue existiendo pero ya no se monta). Cualquier animación nueva debe justificarse por lo que comunica, no agregarse "porque se ve bien".
- `prefers-reduced-motion` se revisa explícitamente solo donde hay algo que de verdad se mueve sin que el usuario lo pida (avance automático de carruseles, parallax de scroll, conteo animado) — no hace falta en micro-interacciones `whileHover`/`whileTap` puntuales.
- Carruseles: preferir `scroll-snap` nativo de CSS sobre JS cuando el efecto lo permita (`HypeCarousel`); si el efecto requiere JS de verdad (coverflow 3D con perspectiva), que tenga control de pausa visible, no solo pausa-por-hover.

## Deuda técnica conocida (no bloqueante, documentada para no repetir el hallazgo)

1. **Persistencia por filesystem** — ver sección "Persistencia" arriba. La más importante.
2. **`mock-users.ts`** — sigue alimentando `/profile/[username]` (perfiles públicos de otros coleccionistas) porque no hay directorio real de clientes. Documentado en el propio archivo. El día que se implemente el modelo social de la Fase 2, este archivo se jubila.
3. **Sin webhook de Shopify** (`orders/create` u otro) — el sitio no sabe si una compra se completó; bloquea tener un evento `purchase` real de analítica y una confirmación de pedido propia.
4. **Rate limiting en memoria, no distribuido** — funciona hoy (cierra el hueco real de "intentos ilimitados"), pero se resetea en cada cold start y no se comparte entre instancias bajo tráfico alto. Siguiente paso si hace falta más robustez: Vercel KV / Upstash Redis.
5. **Actualización de Next.js pendiente** por las 3 vulnerabilidades high del `npm audit` (requiere planear la migración a v16).
6. **`generateStaticParams()` no usado en `/product/[handle]`** — cada handle se resuelve dinámicamente (con `revalidate = 60` desde la Fase 3, ya no `force-dynamic`), decisión correcta dado que el catálogo real cambia, pero significa que no hay páginas de producto pre-generadas en build.
7. **CSP sin nonces** — la política de `next.config.js` (Fase 1) usa `'unsafe-inline'` en `script-src`/`style-src` porque Next.js App Router inyecta scripts inline para hidratar RSC y varios componentes usan `style={{ backgroundImage: ... }}`. Una CSP con nonces sería más estricta pero requiere generarlos en `middleware.ts`.

## Cómo correr el proyecto

```bash
npm run dev      # localhost:3000, usa .env.local
npm run build    # build de producción
npm run test     # suite de pruebas (Vitest)
npx tsc --noEmit # type-check sin build completo
```

Variables de entorno requeridas: ver `.env.example` (Shopify Storefront + Admin API, credenciales de admin, WhatsApp, Meta — con nota de cuáles están configuradas hoy). Ver también `docs/DEPLOYMENT.md` para el detalle completo de cada variable, respaldos y monitoreo.

## Auditoría completa (2026-08-27 a 2026-08-28)

Las 7 fases del brief de auditoría, con hallazgos y fixes detallados, viven en `docs/audit/`:

- `FASE-0-INVENTARIO.md` *(nota: el archivo real de esta fase es este mismo `CLAUDE.md`, generado como su entregable)*
- `FASE-1-SEGURIDAD.md` — 5 hallazgos, todos corregidos.
- `FASE-2-PRIVACIDAD.md` — modelo de privacidad completo para QR/seguir/bóveda, diseño acordado, sin implementar todavía.
- `FASE-3-RENDIMIENTO.md` — 6 hallazgos, todos corregidos (LCP/peso de página mejorados ~10× en la corrida de Lighthouse antes/después).
- `FASE-4-SEO.md` — 7 hallazgos, todos corregidos.
- `FASE-5-ANALITICA.md` — 2 hallazgos, todos corregidos. Backend: Vercel Analytics.
- `FASE-6-DISENO.md` — 5 hallazgos + 1 reportado aparte, todos corregidos. Un punto de accesibilidad (recorrido de tabulación con navegador real) sigue sin poder verificarse en este entorno.
- `FASE-7-CIERRE.md` — este cierre: suite de pruebas, este documento, `docs/DEPLOYMENT.md` y el resumen ejecutivo para el cliente.

Cada fase vivió en su propia rama (`audit/fase-N-*`), ninguna se desplegó ni se fusionó a `main` — esa decisión le corresponde a Dante.
