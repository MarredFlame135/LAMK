# LAMK Essential Evolution — CLAUDE.md

Documentación viva del proyecto. Generada en la Fase 0 de la auditoría (2026-08-27) a partir de trabajo directo y verificado sobre el repo — no de una exploración automática superficial. Actualízala cuando algo aquí quede desactualizado.

## Qué es

**Look At My Kicks MX (LAMK)** — e-commerce PWA de sneakers/streetwear premium en México, con capa de gamificación ("Bóveda del Coleccionista", XP, tiers) y un asistente de IA conversacional (TENISIN) para búsqueda guiada de catálogo.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14.2.35 (App Router), TypeScript, React 18 |
| Estilos | Tailwind CSS 3, tokens de tema en `src/styles/globals.css` |
| Animación | `framer-motion` (única librería — hay un paquete `motion` v13 instalado y usado en 2-3 componentes de UI heredados, ver "Deuda técnica") |
| Catálogo / inventario | **Shopify Storefront API** (GraphQL) — fuente real, no simulada |
| Auth de cliente | Shopify Customer Accounts (`customerAccessTokenCreate`) — contraseña gestionada por Shopify, no por este repo |
| Auth de admin | Credencial única por variable de entorno (`ADMIN_EMAIL`/`ADMIN_PASSWORD`) + allowlist opcional (`ADMIN_EMAILS`) que reutiliza la contraseña de cliente de esos correos — ver `src/lib/admin-access.ts` |
| Sesión | Cookie HMAC-SHA256 propia para admin (`lamk_admin_session`, ver `src/lib/session.ts`); cookie del token de Shopify para cliente (`lamk_customer_token`) |
| Checkout / pago | **Shopify Checkout real** — `cartCreate` (Storefront API) devuelve `checkoutUrl`, se redirige ahí. No hay pasarela de pago propia, no se procesa ni se guarda tarjeta en este repo. |
| Base de datos | **No existe.** Ver "Persistencia" abajo — es la deuda técnica más importante del proyecto. |
| Hosting | Vercel (`lamk.vercel.app`, dominio propio pendiente de compra) |
| Generación de imágenes | Higgsfield (herramienta externa usada por Claude para generar placeholders — no es parte del runtime del sitio) |
| WhatsApp / Meta | `WHATSAPP_API_TOKEN` y `META_APP_ID`/`META_APP_SECRET` **no configurados** — el OTP de WhatsApp corre en modo desarrollo (muestra el código en pantalla en vez de enviarlo real), y el feed de Instagram "en vivo" es honestamente un CTA al perfil real, no un feed sincronizado |

## Persistencia — deuda técnica más importante

No hay base de datos. Los siguientes "stores" escriben JSON a `process.cwd()/data/*.json` con `fs.writeFileSync` (`src/lib/inventory-store.ts`, `leads-store.ts`, `reviews-store.ts`, `sales-store.ts`, `layaway-store.ts`, `hype.ts`):

- Inventario oculto / borradores de producto
- Peticiones de demanda capturadas por TENISIN
- Reseñas de clientes
- Ventas físicas/offline y saldos pendientes
- Apartados (layaway)
- Vistas 24h para el Hype Meter

**Riesgo real:** el filesystem de una función serverless de Vercel no garantiza persistencia entre invocaciones — escrituras pueden no sobrevivir un cold start o una nueva instancia del contenedor. No confirmado con un test de carga, pero es la hipótesis técnica más probable si algún día "desaparecen" leads o reseñas. Por eso el sistema de permisos de admin (`ADMIN_EMAILS`) se hizo con variable de entorno en vez de seguir este mismo patrón.

**Recomendación (no ejecutada, pendiente de decisión):** migrar estos 6 stores a una base de datos real (Postgres vía Vercel/Neon, o similar) antes de depender de ellos para decisiones de negocio.

## Modelo de datos

Todo vive en `src/types/`:

- **`Product` / `ProductVariant`** (`types/product.ts`) — reflejo tipado de lo que devuelve Shopify (`formatShopifyProduct` en `lib/shopify/index.ts`), más metafields custom (`storytelling`, `fitAdvisor`) y el Hype Meter calculado (`lib/hype.ts`, real: vistas24h/stock).
- **`UserProfile`** (`types/user.ts`) — perfil de cliente. Para la propia bóveda (`/vault`) viene de `getCustomerProfile()` (Shopify real). Para perfiles públicos de OTROS coleccionistas (`/profile/[username]`) viene de `src/lib/mock-users.ts` — **ficticio, documentado como tal en el propio archivo**, porque no existe un directorio real de clientes consultable por username. Incluye `xp`/`tier`/`collection` (bóveda) y, desde esta sesión, `BrandAffinityScore`/`CustomerSegment` (tipos definidos, sin UI de captura real todavía).
- **`CartItem` / `ShippingAddress`** (`types/cart.ts`) — carrito local (Context + localStorage, ver `src/context/CartContext.tsx`), se traduce a un carrito real de Shopify solo al momento del checkout.
- **`Order`** (`types/order.ts`) — tipo definido para un futuro webhook de post-compra; **no hay tabla ni store real detrás todavía** — las órdenes reales viven en Shopify una vez que el cliente completa el Checkout.
- **No existe ninguna relación usuario-usuario** (seguir, bloquear, compartir por QR) — esas son las features de la Fase 2 del brief de auditoría, **todavía no implementadas** en este repo (verificado: cero referencias a QR/follow/seguir en el código).

## Autenticación y autorización — mapa para la Fase 1

- `src/middleware.ts` protege `/admin/*` y `/api/admin/*` (matcher explícito, corre en Edge) verificando `lamk_admin_session` vía `verifyAdminSession()`.
- `src/app/api/admin/login/route.ts` — dos caminos: admin raíz (email+password contra env vars) o admin por allowlist (reusa `loginCustomer()` de Shopify contra `ADMIN_EMAILS`).
- `src/app/api/auth/*` — registro/login/logout/reset de cliente, todo delegado a Shopify (`src/lib/shopify/customer.ts`).
- **No hay rate limiting en ningún endpoint** (login de cliente, login de admin, `/api/otp`) — candidato obvio para la Fase 1.
- **No hay CSRF token explícito** — las mutaciones dependen de `sameSite: 'lax'` en las cookies.
- Rutas de perfil por ID/slug: `/product/[handle]`, `/profile/[username]` — ambas resuelven por handle/slug público, no por ID interno secuencial, así que el vector clásico de IDOR-por-incremento no aplica directo, pero vale la pena revisar en la Fase 1 de todos modos.

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
│   ├── login/route.ts         (público — punto de entrada)
│   ├── logout/route.ts        (público)
│   ├── product-drafts/route.ts
│   └── sales/route.ts
├── auth/
│   ├── login/route.ts  ├── logout/route.ts  ├── me/route.ts
│   ├── register/route.ts  └── reset-password/route.ts
├── cart/checkout/route.ts     (crea el carrito real en Shopify)
├── catalog/route.ts           └── catalog/cross-sell/route.ts
├── image-pipeline/route.ts    (⚠️ ver nota abajo)
├── otp/route.ts               (WhatsApp OTP, modo dev sin credenciales reales)
├── reviews/route.ts
└── social-push/route.ts
```

**`image-pipeline/route.ts` es un stub** — recibe una URL de imagen y la devuelve tal cual (simula "remoción de fondo IA" en el comentario del código, pero no procesa nada de verdad). No hay subida real de archivos de usuario en todo el proyecto hoy — el riesgo de EXIF/GPS que menciona el brief de auditoría **no aplica todavía** porque la feature de subir fotos no existe; sí aplica el día que se construya.

## npm audit (Fase 0 — solo reporte, sin `--force`)

3 vulnerabilidades **high**, 0 critical:

| Paquete | Severidad | Fix disponible |
|---|---|---|
| `nanoid` (indirecta) | High | Sí, sin cambios de mayor versión |
| `next` (directa) | High | Requiere Next 16.3.3 (**major**, breaking) |
| `postcss` (anidada bajo `next`) | High | Mismo camino que `next` |

El fix de `next`/`postcss` implica una migración de versión mayor — no se ejecuta sin autorización explícita, por la regla de "no reescribir/actualizar sin justificar".

## Suite de pruebas

**No existe.** Cero archivos `.test.`/`.spec.`, sin config de Jest/Vitest/Playwright, sin script `test` real en `package.json`.

## Convenciones del código (detectadas)

- Comentarios de cabecera en español explicando el "por qué", no solo el "qué" — patrón consistente en casi todo el repo, mantenerlo.
- Nunca inventar datos: cuando no hay una señal real, el patrón establecido es **ocultar la sección** (`if (x.length === 0) return null`) en vez de simular contenido — ver `SocialProofSection.tsx`, `IGLiveMonitor.tsx`.
- Paleta fija "Obsidian & Raw Bone" (tokens en `globals.css`, dark/light vía `next-themes` + clase `.dark`), tipografía Space Grotesk (`--font-display`) / Inter (`--font-sans`) / JetBrains Mono (`--font-mono`), acentos `#FF1E42` (Laser Crimson) y `#C5A059` (Muted Gold).
- Sin emoji informal en UI de cliente/admin (títulos, botones) — sí se permiten en el copy de mensajes de WhatsApp salientes (contenido de negocio, no cromo de interfaz).
- Motion: tokens compartidos en `src/lib/motion.ts` (`EASE_LUXURY`, `fadeUp`, `staggerContainer`, `BOUNCE_TAP`) — no inventar curvas nuevas sueltas.
- `prefers-reduced-motion` y `pointer: fine`/touch se respetan explícitamente en los componentes de interacción nuevos (cursor a medida, tilt 3D, avance automático de carruseles).

## Deuda técnica conocida (no bloqueante, documentada para no repetir el hallazgo)

1. **Persistencia por filesystem** — ver sección "Persistencia" arriba. La más importante.
2. **`motion` (paquete standalone v13) vs `framer-motion`** — 2-3 componentes de UI (`gallery-animation.tsx`, `parallax-floating.tsx`) importan de `'motion/react'` en vez de `'framer-motion'`. No se ha confirmado que rompa nada, pero es peso de bundle duplicado.
3. **`mock-users.ts`** — sigue alimentando `/profile/[username]` (perfiles públicos de otros coleccionistas) porque no hay directorio real de clientes. Documentado en el propio archivo.
4. **Sin rate limiting** en ningún endpoint de auth/OTP.
5. **Sin headers de seguridad custom** (`next.config.js` no define `headers()` — sin CSP/HSTS/X-Content-Type-Options propios, solo lo que Vercel agrega por defecto).
6. **Actualización de Next.js pendiente** por las 3 vulnerabilidades high del audit (requiere planear la migración a v16).

## Cómo correr el proyecto

```bash
npm run dev      # localhost:3000, usa .env.local
npm run build    # build de producción
npx tsc --noEmit # type-check sin build completo
```

Variables de entorno requeridas: ver `.env.example` (Shopify Storefront + Admin API, credenciales de admin, WhatsApp, Meta — con nota de cuáles están configuradas hoy).
