# LAMK Essential Evolution — CLAUDE.md

Documentación viva del proyecto. Generada en la Fase 0 de la auditoría (2026-08-27) y actualizada al cierre de la Fase 7 (2026-08-28) con todo lo aprendido durante las 7 fases (`docs/audit/FASE-0-*.md` a `FASE-7-*.md` tienen el detalle completo de cada una). **Actualizada de nuevo el 2026-08-29** tras la auditoría "Prompt Maestro v4" (Fase A completa — ver sección al final) y tras descubrir que el backend social/QR/Bóveda (`docs/audit/FASE-2-PRIVACIDAD.md`) ya estaba escrito en la rama `feature/social-qr-follow-vault` pero nunca se había commiteado ni documentado aquí — varias afirmaciones de esta versión anterior (sobre todo "no hay base de datos") ya no eran ciertas. Actualízala cuando algo aquí quede desactualizado.

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
| Login social | **NextAuth v4** (Google/Apple) — no reemplaza el auth de cliente de arriba, es un puente (ver "Autenticación" abajo y `src/lib/social-auth/`). Sin credenciales reales configuradas todavía (Dante tiene que generarlas) — los botones se ocultan solos hasta entonces. |
| Auth de admin | Credencial única por variable de entorno (`ADMIN_EMAIL`/`ADMIN_PASSWORD`) + allowlist opcional (`ADMIN_EMAILS`) que reutiliza la contraseña de cliente de esos correos — ver `src/lib/admin-access.ts` |
| Sesión | Cookie HMAC-SHA256 propia para admin (`lamk_admin_session`, ver `src/lib/session.ts`, **fail-closed en producción desde la Fase 1** si falta el secreto); cookie del token de Shopify para cliente (`lamk_customer_token`) |
| Checkout / pago | **Shopify Checkout real** — `cartCreate` (Storefront API) devuelve `checkoutUrl`, se redirige ahí. No hay pasarela de pago propia, no se procesa ni se guarda tarjeta en este repo. Verificación de teléfono por WhatsApp antes de pagar es 100% server-side desde la Fase 1 (`src/lib/otp.ts`, ticket firmado, nunca un código en claro comparado en el navegador). |
| Analítica | **Vercel Analytics** (`@vercel/analytics`), instalado en la Fase 5 — eventos personalizados tipados en `src/lib/analytics.ts` (funnel de compra, clics de carrusel por posición, búsquedas), gateado por consentimiento real (ver `PrivacyConsentBanner.tsx`) |
| Pruebas | **Vitest**, desde la Fase 7 — `npm run test`, ver sección "Suite de pruebas" abajo |
| Base de datos | **Neon Postgres real** (vía marketplace de Vercel), conectada desde el 2026-08-29 — `drizzle-orm` + `@neondatabase/serverless`, esquema en `src/db/schema.ts`, migraciones en `src/db/migrations/` (`npm run db:generate` / `db:push` / `db:studio`). Ver "Persistencia" abajo para qué vive ahí y qué sigue en JSON. |
| Hosting | Vercel (`lamk.vercel.app`, dominio propio `lookatmykicksmx.com` pendiente de compra — ver `src/lib/site-url.ts`) |
| Generación de imágenes | Higgsfield (herramienta externa usada por Claude para generar placeholders — no es parte del runtime del sitio). **Regla desde la Fase 3:** cualquier imagen nueva de Higgsfield necesita un paso de redimensionado/compresión a WebP antes de entrar a `public/` — no asumir que el archivo generado ya viene listo para producción (varias imágenes llegaron a pesar 2.5-6.4 MB para mostrarse a 40-56px). |
| WhatsApp / Meta | `WHATSAPP_API_TOKEN` y `META_APP_ID`/`META_APP_SECRET` **no configurados** — el OTP de WhatsApp corre en modo desarrollo (muestra el código en pantalla en vez de enviarlo real — la verificación en sí ya es real del lado servidor desde la Fase 1, ver arriba), y el feed de Instagram "en vivo" es honestamente un CTA al perfil real, no un feed sincronizado |

## Persistencia

**Ya hay base de datos real** (Neon Postgres, ver tabla de arriba) — pero no todo se migró todavía. Qué vive dónde:

**En Postgres (`src/db/schema.ts`), desde el 2026-08-29:**
- `social_profiles`, `follows`, `blocks`, `reports`, `qr_tokens`, `vault_items` — el modelo social/QR/Bóveda completo de `docs/audit/FASE-2-PRIVACIDAD.md` (schema + endpoints en `src/app/api/social/*` + lógica en `src/lib/social/*`, con pruebas). **Ojo:** esto es infraestructura de backend ya construida, pero `/profile/[username]` todavía no la usa — sigue leyendo de `mock-users.ts` (ver deuda técnica #2 abajo). Conectar una cosa con la otra es trabajo pendiente, no asumir que ya está enchufado solo porque las tablas existen.
- `consent_log` — versión del Aviso de Privacidad aceptada + opt-in de marketing + IP, por registro (hallazgo #3 de la Fase A, ver abajo).
- `product_events` — vistas y "agregar al carrito" por producto, real (reemplazó a `data/views.json`, ver `src/lib/hype.ts`). Base del Índice ponderado (hallazgo #2).
- `linked_accounts` — vínculo de login social (Google/Apple) a un customer real de Shopify, con la contraseña puente cifrada (ver "Autenticación" abajo).

**Todavía en JSON (`process.cwd()/data/*.json`, `fs.writeFileSync`)** — el resto de los stores no se tocó en esta ronda: `inventory-store.ts`, `leads-store.ts`, `reviews-store.ts`, `sales-store.ts`, `layaway-store.ts`. Mismo riesgo de siempre: el filesystem de una función serverless de Vercel no garantiza persistencia entre invocaciones — no confirmado con un test de carga, pero es la hipótesis técnica más probable si algún día "desaparecen" leads o reseñas.

**Recomendación (no ejecutada, pendiente de decisión):** ahora que ya existe una base de datos real conectada, migrar estos 5 stores restantes es mucho más barato que antes — ya no hace falta aprovisionar nada, solo agregar tablas al mismo `schema.ts`.

## Modelo de datos

Todo vive en `src/types/`:

- **`Product` / `ProductVariant`** (`types/product.ts`) — reflejo tipado de lo que devuelve Shopify (`formatShopifyProduct` en `lib/shopify/index.ts`), más metafields custom (`storytelling`, `fitAdvisor`) y el Hype Meter calculado (`lib/hype.ts`, real: vistas24h/stock — confirmado en la Fase 6 que ya es un cálculo, no curaduría manual).
- **`UserProfile`** (`types/user.ts`) — perfil de cliente. Para la propia bóveda (`/vault`) viene de `getCustomerProfile()` (Shopify real). Para perfiles públicos de OTROS coleccionistas (`/profile/[username]`) viene de `src/lib/mock-users.ts` — **ficticio, documentado como tal en el propio archivo**, porque no existe un directorio real de clientes consultable por username. Desde la Fase 4, esta ruta es `noindex` (no debe indexarse en buscadores). Incluye `xp`/`tier`/`collection` (bóveda) y `BrandAffinityScore`/`CustomerSegment` (tipos definidos, sin UI de captura real todavía).
- **`CartItem` / `ShippingAddress`** (`types/cart.ts`) — carrito local (Context + localStorage, ver `src/context/CartContext.tsx`), se traduce a un carrito real de Shopify solo al momento del checkout. El cálculo de subtotal/envío/total vive en `src/lib/cart-math.ts` (extraído a función pura en la Fase 7 específicamente para poder probarlo — ver "Suite de pruebas").
- **`Order`** (`types/order.ts`) — tipo definido para un futuro webhook de post-compra; **no hay tabla ni store real detrás todavía** — las órdenes reales viven en Shopify una vez que el cliente completa el Checkout. **No existe ningún webhook de Shopify configurado** — el sitio nunca vuelve a saber si un checkout iniciado se completó (ver Fase 5, evento `checkout_started` es lo más cerca de "compra" que se puede medir hoy). Esto también es la razón por la que el Índice ponderado (`hype.ts`) no puede incluir "velocidad de venta" todavía — ver hallazgo #2 en la sección de Fase A.
- **Relación usuario-usuario** (seguir, bloquear, compartir por QR, bóveda pública) — el modelo de `docs/audit/FASE-2-PRIVACIDAD.md` **ya está implementado** (`src/db/schema.ts` + `src/app/api/social/*` + `src/lib/social/*`, con pruebas), pero sin UI todavía — ningún componente de cliente lo consume aún. Backend listo, frontend pendiente.
- **`linkedAccounts`** (`db/schema.ts`) — vínculo de una cuenta OAuth (Google/Apple) a un customer real de Shopify, con contraseña puente cifrada (AES-256-GCM). Ver "Autenticación" abajo para el porqué de este diseño.

## Autenticación y autorización

- `src/middleware.ts` protege `/admin/*` y `/api/admin/*` (matcher explícito, corre en Edge) verificando `lamk_admin_session` vía `verifyAdminSession()`.
- `src/app/api/admin/login/route.ts` — dos caminos: admin raíz (email+password contra env vars) o admin por allowlist (reusa `loginCustomer()` de Shopify contra `ADMIN_EMAILS`). Ambos caminos, más `/api/auth/login`, tienen **rate limiting** desde la Fase 1 (`src/lib/rate-limit.ts`, 5 intentos/10min por IP+email — en memoria por instancia, no distribuido, ver limitación documentada en el propio archivo).
- `/api/image-pipeline` y `/api/social-push` (acciones que solo deberían disparar admins desde el panel) verifican sesión de admin explícitamente desde la Fase 1 — antes no tenían ninguna protección pese a vivir fuera de `/api/admin/*`.
- `src/app/api/auth/*` — registro/login/logout/reset de cliente, todo delegado a Shopify (`src/lib/shopify/customer.ts`). El registro (`register/route.ts`) exige `privacyAccepted: true` (400 si falta) y escribe `consent_log` — ver Fase A abajo.
- **Login social (Google/Apple)** — `src/app/api/auth/[...nextauth]/route.ts` (NextAuth v4, config real en `src/lib/social-auth/auth-options.ts`). NextAuth solo maneja el baile OAuth; el callback `signIn` llama a `src/lib/social-auth/bridge.ts`, que traduce el login social a una sesión REAL de Shopify (`lamk_customer_token`, la misma cookie de siempre) — nunca se usa la sesión propia de NextAuth para nada más. Por qué existe este puente en vez de usar algo nativo de Shopify: la Admin API ya no permite fijar/resetear la contraseña de un customer existente (verificado contra la doc actual, 2026-01), y Multipass (que sí resolvería esto sin puente) es exclusivo de Shopify Plus — LAMK MX está en plan estándar. La contraseña puente que genera el bridge para cuentas nuevas se guarda cifrada (`linked_accounts.encryptedPassword`, AES-256-GCM, `src/lib/social-auth/crypto.ts`), **fail-closed en producción** sin `LINKED_ACCOUNT_ENCRYPTION_KEY` (mismo principio que `ADMIN_SESSION_SECRET`). Si alguien entra con Google/Apple usando un correo que ya tenía cuenta con contraseña, no se fusiona sola — se le pide confirmar su contraseña una vez en `/auth/link-account`. **Sin probar end-to-end**: faltan credenciales reales de Google/Apple (Dante las genera él mismo, ver `.env.example`).
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
│   ├── register/route.ts (exige privacyAccepted, escribe consent_log)  └── reset-password/route.ts
│   ├── [...nextauth]/route.ts   (login social — ver "Autenticación" arriba)
│   └── social/
│       ├── prepare-consent/route.ts  (cookie corta pre-OAuth, ver bridge.ts)
│       ├── link/route.ts             (confirma contraseña para fusionar cuenta existente)
│       └── providers/route.ts        (GET — qué proveedores están configurados)
├── cart/checkout/route.ts     (crea el carrito real en Shopify)
├── catalog/route.ts           └── catalog/cross-sell/route.ts
├── image-pipeline/route.ts    (⚠️ stub — ver nota abajo; protegido por sesión de admin)
├── otp/route.ts               (genera+firma el ticket server-side; con rate limiting)
├── otp/verify/route.ts        (verifica el ticket server-side; con rate limiting)
├── reviews/route.ts
├── social-push/route.ts       (protegido por sesión de admin)
├── social/                    (backend de Fase 2 — sin UI todavía, ver "Modelo de datos")
│   ├── follow/route.ts  ├── follow/respond/route.ts  ├── block/route.ts  ├── report/route.ts
│   ├── qr/route.ts  ├── qr/[token]/route.ts
│   └── profile/route.ts  ├── profile/[username]/route.ts  └── vault/route.ts
└── track/cart-add/route.ts    (señal real de "carrito" para el Índice — ver hallazgo #2)
```

**`image-pipeline/route.ts` es un stub** — recibe una URL de imagen y la devuelve tal cual (simula "remoción de fondo IA" en el comentario del código, pero no procesa nada de verdad). No hay subida real de archivos de usuario en todo el proyecto hoy — el riesgo de EXIF/GPS que menciona el brief de auditoría **no aplica todavía** porque la feature de subir fotos no existe; sí aplica el día que se construya.

## SEO

- `src/app/robots.ts` y `src/app/sitemap.ts` (Fase 4) — el sitemap lista home, catálogo y **todos** los productos reales del catálogo (vía `getCatalogLive()`); robots excluye `/admin/`, `/api/` y `/profile/`.
- `product/[handle]/page.tsx` tiene `generateMetadata()` (title/description únicos por producto) + JSON-LD `Product` y `BreadcrumbList`. El layout raíz tiene JSON-LD `Organization` + `metadataBase`/Open Graph (`src/lib/site-url.ts` centraliza la resolución del dominio).
- `profile/[username]/page.tsx` es `noindex` explícito.

## npm audit (Fase 0 — solo reporte, sin `--force`)

7 vulnerabilidades (4 moderate, 3 high) tras agregar `next-auth` en la Fase A (antes: 3 high, sin cambios desde la Fase 0):

| Paquete | Severidad | Fix disponible |
|---|---|---|
| `esbuild` (bajo `drizzle-kit`) | Moderate | Sí, pero baja `drizzle-kit` a 0.18.1 (breaking) |
| `nanoid` (indirecta) | High | Sí, sin cambios de mayor versión |
| `next` (directa) | High | Requiere Next 16.3.3 (**major**, breaking) |
| `postcss` (anidada bajo `next`) | High | Mismo camino que `next` |

Ninguno de los fixes disponibles es un cambio menor — todos implican una migración de versión mayor de alguna dependencia central (`next`, `drizzle-kit`). No se ejecutan sin autorización explícita, por la regla de "no reescribir/actualizar sin justificar". Siguen pendientes de decisión.

## Suite de pruebas

**Existe desde la Fase 7** (antes: ninguna). `npm run test` (Vitest, config en `vitest.config.mts` — el `.mts` es necesario, no cosmético: `vitest.config.ts` falla al cargar por un conflicto ESM/CJS con una dependencia transitiva). 59 pruebas en 9 archivos, todas sobre lógica pura de `src/lib/*` (sin renderizar componentes, sin DOM simulado):

- `session.test.ts` — sesión de admin: roundtrip firma/verifica, tokens manipulados/con secreto distinto/expirados, y una **prueba de regresión explícita** para el fail-closed de producción (hallazgo #1, Fase 1).
- `admin-access.test.ts` — quién es admin (raíz + allowlist), normalización de email, allowlist vacía.
- `otp.test.ts` — ticket de verificación de WhatsApp: código correcto/incorrecto, no transferible entre teléfonos, firma alterada, expiración a los 5 minutos.
- `rate-limit.test.ts` — límite de intentos, bloqueo al excederlo, aislamiento entre claves.
- `cart-math.test.ts` — cálculo de totales del carrito (subtotal, envío gratis, redondeos de porcentaje).
- `hype.test.ts` — Hype Meter (label por stock/vistas) + `computeHypeIndexFromCounts` (el Índice ponderado real, hallazgo #2 de la Fase A).
- `social/age.test.ts` — cálculo de edad/mayoría de edad para las reglas de menores del modelo social.
- `social/profile-view.test.ts` — quién puede ver qué de un perfil social según relación (dueño/seguidor/desconocido) y visibilidad.
- `social-auth/crypto.test.ts` — cifrado de la contraseña puente del login social: roundtrip, IV distinto por cifrado, detección de manipulación (hallazgo #4).

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

1. **5 stores todavía en filesystem** (`inventory-store.ts`, `leads-store.ts`, `reviews-store.ts`, `sales-store.ts`, `layaway-store.ts`) — ver "Persistencia" arriba. Ya no es la deuda más urgente (la base de datos real ya existe, migrar estos 5 es ahora barato), pero sigue sin hacerse.
2. **`mock-users.ts`** — sigue alimentando `/profile/[username]` (perfiles públicos de otros coleccionistas) porque el backend social real (`social_profiles` en Postgres, `src/lib/social/`) todavía no tiene UI que lo consuma — ver "Modelo de datos". El día que se conecte, este archivo se jubila.
3. **Sin webhook de Shopify** (`orders/create` u otro) — el sitio no sabe si una compra se completó; bloquea tener un evento `purchase` real de analítica, una confirmación de pedido propia, **y el término "velocidad de venta" del Índice ponderado** (hallazgo #2, Fase A) — ese término está en 0 a propósito, documentado, hasta que exista este webhook.
4. **Índice ponderado incompleto** (hallazgo #2, Fase A) — la fórmula tiene 4 términos (vistas 30%, carrito 25%, wishlist 25%, velocidad 20%); solo vistas y carrito tienen fuente de datos real hoy. Wishlist depende de que se construya Most Wanted (Fase B, sin empezar); velocidad depende del punto 3 de arriba. El score máximo alcanzable hoy es 55/100 — no es un bug, es honesto (ver `computeHypeIndexFromCounts` en `hype.ts`).
5. **Rate limiting en memoria, no distribuido** — funciona hoy (cierra el hueco real de "intentos ilimitados"), pero se resetea en cada cold start y no se comparte entre instancias bajo tráfico alto. Siguiente paso si hace falta más robustez: Vercel KV / Upstash Redis.
6. **Actualización de Next.js pendiente** por las vulnerabilidades high del `npm audit` (requiere planear la migración a v16).
7. **`generateStaticParams()` no usado en `/product/[handle]`** — cada handle se resuelve dinámicamente (con `revalidate = 60` desde la Fase 3, ya no `force-dynamic`), decisión correcta dado que el catálogo real cambia, pero significa que no hay páginas de producto pre-generadas en build.
8. **CSP sin nonces** — la política de `next.config.js` (Fase 1) usa `'unsafe-inline'` en `script-src`/`style-src` porque Next.js App Router inyecta scripts inline para hidratar RSC y varios componentes usan `style={{ backgroundImage: ... }}`. Una CSP con nonces sería más estricta pero requiere generarlos en `middleware.ts`.
9. **Login social sin probar end-to-end** (hallazgo #4, Fase A) — el puente completo (NextAuth + `bridge.ts` + cuenta puente cifrada) está construido y con pruebas unitarias, pero nadie ha completado un login real contra Google/Apple todavía — faltan credenciales reales (Dante las genera él mismo en Google Cloud Console / Apple Developer, ver `.env.example`). Probar apenas estén configuradas, especialmente dentro del navegador in-app de Instagram (el caso que motivó esta función).
10. **Ficha de coleccionista sin "Índice de Colección"** — la Bóveda (`/vault`) muestra XP y número de piezas reales; el "Índice de Colección" compuesto (valor acumulado + rareza + diversidad + antigüedad) que describe el brief de Fase B **no está construido** — se decidió a propósito no inventar esa cifra sin la fórmula real detrás.

## Cómo correr el proyecto

```bash
npm run dev      # localhost:3000, usa .env.local
npm run build    # build de producción
npm run test     # suite de pruebas (Vitest)
npx tsc --noEmit # type-check sin build completo
```

Variables de entorno requeridas: ver `.env.example` (Shopify Storefront + Admin API, credenciales de admin, WhatsApp, Meta, `DATABASE_URL`, login social — con nota de cuáles están configuradas hoy). Ver también `docs/DEPLOYMENT.md` para el detalle completo de cada variable, respaldos y monitoreo (nota: `DEPLOYMENT.md` es de la Fase 7, anterior a `DATABASE_URL`/login social — revisar si sigue completo).

## Auditoría completa (2026-08-27 a 2026-08-28)

Las 7 fases del brief de auditoría, con hallazgos y fixes detallados, viven en `docs/audit/`:

- `FASE-0-INVENTARIO.md` *(nota: el archivo real de esta fase es este mismo `CLAUDE.md`, generado como su entregable)*
- `FASE-1-SEGURIDAD.md` — 5 hallazgos, todos corregidos.
- `FASE-2-PRIVACIDAD.md` — modelo de privacidad completo para QR/seguir/bóveda, diseño acordado. **Implementado desde el 2026-08-29/30** (schema + endpoints + UI en `/vault/settings`) — ver sección "Auditoría Prompt Maestro v4" abajo.
- `FASE-3-RENDIMIENTO.md` — 6 hallazgos, todos corregidos (LCP/peso de página mejorados ~10× en la corrida de Lighthouse antes/después).
- `FASE-4-SEO.md` — 7 hallazgos, todos corregidos.
- `FASE-5-ANALITICA.md` — 2 hallazgos, todos corregidos. Backend: Vercel Analytics.
- `FASE-6-DISENO.md` — 5 hallazgos + 1 reportado aparte, todos corregidos. Un punto de accesibilidad (recorrido de tabulación con navegador real) sigue sin poder verificarse en este entorno.
- `FASE-7-CIERRE.md` — este cierre: suite de pruebas, este documento, `docs/DEPLOYMENT.md` y el resumen ejecutivo para el cliente.

Cada fase vivió en su propia rama (`audit/fase-N-*`), ninguna se desplegó ni se fusionó a `main` — esa decisión le corresponde a Dante.

## Auditoría "Prompt Maestro v4" — Fase A (2026-08-29)

Segunda ronda de auditoría, brief nuevo (Fases A→B→C→D: Fundamentos → Bóveda → QR → Admin). **Fase A completa**, 4 commits en `feature/social-qr-follow-vault` (misma rama donde ya vivía, sin commitear, el backend social de la Fase 2 — ver arriba):

- **Hallazgo #1 (`og:image`)** — `opengraph-image.tsx` dinámico en producto (precio/serial/badge) y home, vía `ImageResponse` (`src/lib/og-fonts.ts` carga las fuentes de marca en runtime Node, no Edge — `getProductByHandleLive` toca Postgres/fs, incompatible con Edge). `twitter:card` a `summary_large_image`.
- **Hallazgo #2 (Índice)** — causa raíz (persistencia) y fórmula ponderada nueva, ver "Deuda técnica" #4 arriba para el estado real (55/100 máximo hoy, dos términos en 0 documentado).
- **Hallazgo #3 (consentimiento)** — `consent_log`, checkboxes separados en registro, aplica también a login social. De paso se corrigió que `aviso-de-privacidad/page.tsx` mostraba `new Date()` como fecha de actualización (siempre "hoy") — ahora `src/lib/legal.ts` tiene una versión fija.
- **Hallazgo #4 (login social)** — ver "Autenticación" arriba para el diseño completo del puente NextAuth↔Shopify.
- **Hallazgo #5 (contraseña)** — confirmar contraseña + medidor de fortaleza en registro.

**Bóveda (adelanto de Fase B, no pedido por el brief todavía pero sí por Dante directamente):** `CollectorPlaque.tsx`, `RankProgress.tsx`, `RankLadder.tsx` — rediseño de `/vault` con estética de "nivel de videojuego" (checkpoints reales en la barra de XP, escalera de rango con línea conectora). Reusa `TIER_LADDER`/`getNextUnlockPerk()` (nuevo, en `utils/gamification.ts`) como fuente única entre los dos componentes. Corrigió de paso que `CollectorVault.tsx` usaba colores genéricos de Tailwind (`amber-500`) en vez de los tokens reales de marca.

**No tocado de Fase A:** nada — los 5 hallazgos están cerrados.

## Fase B (2026-08-30) — completa

- **Rareza real** (`deriveRealRarity` en `utils/gamification.ts`) — corrige que `CollectionItem.rarity` se asignaba por posición en el array (100% inventado). Ahora cruza cada pieza contra el estado vigente del producto en catálogo.
- **Índice de Colección** (`computeCollectionIndex`) — 4 señales reales (valor acumulado, rareza promedio, diversidad de categoría, antigüedad), sin términos en 0 (a diferencia del Índice de producto de Fase A).
- **Most Wanted** — wishlist real (`wishlist_items`, `lib/wishlist.ts`, `api/wishlist/*`), botón en ficha de producto, sección en `/vault`. Activó el término "wishlist" del Índice de producto (hallazgo #2, Fase A) que estaba reservado en 0.
- **`/vault/settings`** — identidad+privacidad (reusa `api/social/profile` de la Fase 2), notificaciones (reescribe `consent_log`), y derechos ARCO: exportar datos (JSON) y eliminar cuenta (ventana de 14 días, `lib/account-deletion.ts`). Límite real de Shopify verificado: no se puede borrar un customer con pedidos — se conserva por obligación fiscal en ese caso, documentado en el propio código.
- **Deliberadamente fuera de alcance, con razón:** ciudad/ubicación en el perfil (el brief B.4 la pedía opcional, pero `FASE-2-PRIVACIDAD.md` ya había decidido con razón de seguridad física que nunca es un campo visible — se respetó la decisión anterior).

## Fase C (2026-08-30) — Collector Pass + QR, completa salvo C.3

- **`/vault/pass`** (`PassManager.tsx`) — genera/revoca el QR (paquete `qrcode`, cliente), modo presentación (pantalla blanca, QR grande), exportar imagen para stories (`api/vault/pass/story-image`, `ImageResponse` 1080×1920).
- **`/vault/[handle]`** y **`/vault/pass/[token]`** — la bóveda pública real, con la secuencia de "reveal" épica del brief C.2 (`PublicVaultReveal.tsx`: autenticando → placa → colección en cascada → grail, ≤2.5s, saltable, una vez por sesión, respeta `prefers-reduced-motion`). Comparten componente pero difieren en reglas de visibilidad: `[handle]` respeta la configuración real (público/seguidores/privado); `pass/[token]` siempre fuerza la vista más conservadora (es un desconocido escaneando en persona, mayor riesgo — Fase 2 sección 3).
  - Nota de ruta: la carpeta se llama `[handle]`, no `@[handle]` — Next.js reserva nombres de carpeta que empiezan con `@` para rutas paralelas. La URL real `/vault/@usuario` funciona igual; el `@` vive en el valor capturado, no en el nombre de archivo.
- **`/vault/scan`** — `BarcodeDetector` nativo (Chrome/Edge/Android; sin Safari/iOS todavía) + búsqueda por handle como alternativa siempre visible, sin librería nueva de respaldo.
- **Seguir** — botón wired en la bóveda pública, reusa `api/social/follow` (ya existía).
- **No construido (C.3 parcial):** comparación de índices entre coleccionistas ("tu índice vs el suyo", "piezas en común", "él tiene, tú no"), y el directorio público ordenable por índice.

## Fase D (2026-08-30) — Panel de Administración, completa (D.1-D.7)

`/admin` tiene ahora un `page.tsx` propio por primera vez (antes redirigía a `/admin/offline-sales`, que sigue existiendo tal cual como panel operativo, enlazado desde el nuevo Panel de Mando).

- **D.1 (costo real)** — `InventoryItem.unitCost` es el campo nativo de Shopify (verificado contra la doc 2026-01), nunca se inventó uno propio. Requiere el permiso "View product costs" **y** el scope `read_products` en la Admin API — ninguno de los dos está configurado hoy (solo `read_customers`/`read_orders`, ver tabla de env vars). Todo lo que depende de costo real (margen, capital inmovilizado) se degrada a "—" o a precio de venta, explícitamente etiquetado, nunca a un número inventado.
- **D.3 (`/admin`, Panel de Mando)** — 6 cifras reales vía Admin API en vivo (no hay tabla de Order propia, deuda técnica ya documentada): ventas hoy/mes, ticket promedio, pedidos por surtir (con alerta >48h), margen bruto (condicional a D.1), y "XP en circulación" — **no** "Pasivo XP en pesos" como pedía el brief original: no existe sistema de canje de XP por descuento en este proyecto, convertir a pesos sin esa pieza real sería inventar un número.
- **D.4 (`/admin/finanzas`)** — margen y valor por categoría, capital inmovilizado, días de inventario, proyección 30 días (extrapolación lineal, etiquetada como tal — no es un forecast estadístico), export CSV. Depende de D.1.
- **D.5 (`/admin/clientes`)** — segmentación RFM real (`lib/customer-segmentation.ts`, 7 segmentos del brief operacionalizados con umbrales documentados/ajustables — probada, 9 tests), demanda insatisfecha desde Most Wanted (real, ya existía la infraestructura de Fase B), export CSV. **No construido:** cohortes de retención, afinidad de categoría, ficha de cliente 360°.
- **D.6 (`/admin/inventario`)** — señal real REPONER/DESCONTAR/SIN_ACTIVIDAD por pieza, cruzando catálogo + ventas reales (Admin API, ventana 90d) + vistas reales (30d, `getAllViewsInWindow` en `hype.ts`, no solo el contador de 24h del Hype Meter). `publishedAt` como proxy honesto de antigüedad (no se inventó un campo de "fecha de llegada a inventario").
- **D.7 (roles)** — `admin` (todo) vs `staff` (sin `/admin/finanzas` ni `/admin/clientes`, gateado en `middleware.ts`, nueva variable `ADMIN_STAFF_EMAILS`). **Bitácora de auditoría no construida** — no tiene sentido todavía porque el panel no tiene ninguna función de editar precios/inventario que auditar.
- **Bug real encontrado y corregido de paso:** `api/admin/analytics/route.ts` llamaba a `getAllViews24h()` sin `await` desde el refactor async de Fase A — "más deseados" en ese panel llevaba tiempo mostrando 0 en silencio.

**No empezado:** nada — las 4 fases del "Prompt Maestro v4" (A, B, C, D) están completas, cada una con sus límites de datos/permisos documentados explícitamente en vez de rellenados con números inventados.

## Secuencia de despiece en Home (2026-09-01)

Sección nueva en la home entre `VolumetricShowcase` y `DropsCoverflow`:
**`src/components/home/AnatomySequence.tsx`** — "Anatomía de un par
verificado". El tenis se desarma capa por capa (suela, entresuela, plantilla,
corte, lengüeta, agujetas) conforme bajas. Justificación de producto, no
decorativa: la promesa de `t.product.authenticGuarantee` ("producto 100%
verificado") nunca había tenido una imagen detrás.

**No es video ni GIF:** son 96 fotogramas WebP dibujados en un `<canvas>`, con
el índice del cuadro atado al progreso del scroll (patrón de las páginas de
producto de Apple). `<video>` + `currentTime` se descartó porque el seek en
scroll se atora en Safari/iOS.

- **Assets:** `public/assets/anatomy/{desktop,mobile}/f-0001..0096.webp`.
  Escritorio 1280×720 (2.95 MB), móvil 640×576 con **encuadre propio** —
  recorte cerrado, no el mismo 16:9 en chiquito, porque el despiece es una
  composición vertical y con `cover` en pantalla vertical se perdían las
  agujetas y la suela (1.84 MB). Solo se descarga un juego por dispositivo, y
  solo cuando la sección viene entrando al viewport — no toca el LCP.
- **Manifiesto:** `src/lib/anatomy-sequence.ts` (fuente única de `frameCount`,
  rutas y patrón de nombre). Si se regenera el video con otra duración, ese
  número se cambia ahí y en `FRAMES` del script.
- **Regeneración:** `scripts/anatomy-frames.sh <video.mp4>` (ffmpeg) +
  `scripts/anatomy-webp.js` (sharp vía `SHARP_PATH`, tomado prestado de otro
  proyecto — **sharp no es dependencia de este repo** y no debe agregarse: solo
  genera assets, no corre en build ni en runtime). El video original salió de
  Higgsfield: imagen de despiece con `nano_banana_pro` a partir de
  `public/assets/hero/hero-sneaker.png`, y luego `kling3_0` interpolando
  armado→despiezado con esa imagen como `end_image`. El .mp4 fuente queda en
  `docs/assets-source/anatomy-source.mp4` (ignorado por git, 8 MB — solo hace
  falta para regenerar, no para correr el sitio).

**Dos bugs propios encontrados y corregidos en el camino, que valen como
advertencia para la próxima sección de este tipo:**

1. **`body { overflow-x: hidden }` rompía `position: sticky`** (`globals.css`).
   `hidden` convierte al `<body>` en contenedor de scroll y cualquier elemento
   pegajoso que cuelgue de él se despega. Se cambió a `overflow-x: clip`, que
   corta igual pero no crea contenedor de scroll. **Esto era global** — afectaba
   a cualquier futura sección fija, no solo a esta.
2. **`useScroll` de framer-motion cachea la medición del elemento.** Si algo
   ARRIBA de la sección cambia de alto después (fotos que cargan tarde), el
   progreso queda desfasado hasta el siguiente evento de scroll — reproducido:
   parado a mitad de sección, el lienzo seguía en el primer cuadro. Se
   reemplazó por leer `getBoundingClientRect()` dentro del propio rAF, que ya
   estaba corriendo. Para scroll-scrub sobre canvas, preferir esto a
   `useScroll`.

**Bug PREEXISTENTE detectado de paso, NO corregido** (fuera del alcance de esta
tarea): `src/components/ui/coverflow-carousel.tsx` renderiza condicionalmente
según `useReducedMotion` en el JSX (línea ~131, `{!reduceMotion && ...}`). Con
`prefers-reduced-motion: reduce` activo, servidor y cliente no coinciden y React
tira la hidratación de **toda la página** ("the entire root will switch to
client rendering"). El arreglo es el mismo patrón que se usó en
`AnatomySequence`: gatear el valor con un estado `mounted` para que el primer
render del cliente coincida con el del servidor. Pendiente de decisión.

## Carrusel insignia del home: coverflow → vitrina SNKRS (2026-09-01)

`DropsCoverflow` dejó de usar el coverflow 3D de 5 miniaturas y ahora usa
**`src/components/ui/spotlight-carousel.tsx`**: una pieza grande a la vez,
flotando sobre su propio nombre en tipografía gigante, con los vecinos
asomándose recortados por la orilla de la pantalla. Referencia que trajo el
cliente: la home de SNKRS.

La curaduría diversificada, el `displayName()` y el tracking de
`carousel_impression`/`carousel_click` (Fase 5) se conservaron intactos. Bajó de
8 a 5 piezas: los nombres de todas se muestran como pastillas y 8 nombres largos
de sneaker se comían la sección en tres renglones.

**La banda es CLARA en un sitio negro, y la razón principal es técnica.** Las
fotos de Shopify vienen del mismo pipeline de estudio: producto flotando con
sombra sobre fondo gris, **sin canal alfa**. Sobre negro se verían como un
recuadro gris. Medido en las piezas que salen hoy, ese gris va de `#E2E2E3` a
`#ADADAD` y varias traen degradado, así que **no se puede igualar con un color
fijo** — se desvanece la orilla con `PHOTO_MASK` y el fondo de banda (`#DFDCD4`)
se eligió dentro de ese rango para que lo que quede se lea como viñeta de
reflector. Dentro de la banda los colores van hardcodeados, no con tokens de
tema: la banda no cambia con el tema porque las fotos tampoco.

**Tres cosas que se probaron y NO funcionaron** (para no repetirlas):

1. **Ampliar la foto al 140%** para que el producto se viera más grande. Se ve
   bien con tenis (anchos y bajos) y se rompe con el resto del catálogo: al
   hoodie le borraba la capucha y el ruedo. El catálogo tiene ropa, gorras y
   joyería — la foto va al 100% y el tamaño se recupera con un escenario más
   alto (`sm:h-[40rem]`).
2. **Recortar el fondo por producto.** No se puede prehornear: el catálogo son
   265 piezas vivas de Shopify y cuáles 5 salen depende del Hype.
3. **La tipografía gigante en celular.** En 390 px el producto ocupa todo el
   ancho y del nombre solo asomaban letras sueltas. Se oculta abajo de `sm` y
   el nombre lo carga la pastilla activa.

**Detalle que costó tiempo:** framer-motion escribe `transform` en línea al
animar, así que una clase `-translate-*` de Tailwind en el mismo elemento no
tiene ningún efecto. Si hay que desplazar algo animado, se hace con padding en
el contenedor o dentro del propio `animate`.

**Sin copy descriptivo bajo el producto, a propósito:** solo 8 de los 265
productos traen `description`, y `storytelling.storySummary` es la MISMA frase
genérica para los 265 ("Edición limitada seleccionada por Look At My Kicks MX").
Ponerla ahí diría lo mismo 5 veces. Se muestran precio, HEAT y estado de stock,
que sí cambian por pieza y salen de una fuente real.

**El coverflow anterior** (`src/components/ui/coverflow-carousel.tsx`) ya no se
monta en ningún lado — mismo criterio que `CustomCursor.tsx` en la Fase 6: el
archivo se conserva, pero deja de renderizarse. Efecto secundario bueno: su bug
de hidratación con `prefers-reduced-motion` (documentado arriba) deja de afectar
a los usuarios, aunque sigue en el archivo si algún día se retoma.

## Movimiento reducido, rotación diaria y transición del carrusel (2026-09-01, ronda 2)

**Lo que se reportó como "la animación del tenis dejó de funcionar" NO era un
bug.** El sistema del cliente tiene activado *Accesibilidad › Efectos visuales ›
Efectos de animación* en Windows 11, que enciende `prefers-reduced-motion`.
`AnatomySequence` respondía con su versión estática (correcto) y el carrusel no
avanzaba solo (correcto) — pero desde fuera las dos cosas se leen como "está
roto". Vale la pena tenerlo presente: **ese interruptor lo trae mucha gente
prendido sin saberlo**, así que cualquier cosa que dependa de él necesita una
salida visible, no solo un fallback silencioso.

Qué se hizo, en los dos componentes:

- **Opt-in explícito por sesión.** La preferencia del sistema sigue mandando por
  defecto (con movimiento reducido no se descarga ni un cuadro del despiece ni
  arranca ningún `requestAnimationFrame`), pero ahora hay un botón: *"VER EL
  DESPIECE COMPLETO"* en la vista fija de `AnatomySequence`, y el botón de
  pausa del carrusel se convierte en *"Reproducir"*. No se guarda nada, es por
  sesión.
- **Patrón obligatorio para este repo:** los EFECTOS pueden leer la media query
  cruda; el JSX **nunca**. Todo lo que se renderiza pasa por un valor gateado
  con `mounted` (`reducedUI`). Se volvió a caer en esto al agregar el botón de
  pausa —el servidor mandaba "Pausar" y el cliente montaba "Reproducir",
  tumbando la hidratación de toda la página— y se corrigió igual.
- **Fallback al cuadro más cercano** en `AnatomySequence.draw()`: si el cuadro
  que pide el scroll todavía no baja, se dibuja el vecino ya cargado en vez de
  no dibujar nada. Antes, en conexión lenta, el lienzo se quedaba negro mientras
  la persona ya estaba scrolleando dentro de la sección.

**Rotación diaria de la vitrina** (`buildSelection` en `DropsCoverflow.tsx`): el
objetivo final sigue siendo "las más hypeadas", pero hoy ningún producto llega a
`MIN_HYPE_SAMPLE = 50` porque el sitio no se ha compartido, así que todos los
scores empatan y el orden salía estable pero arbitrario — las mismas piezas para
siempre. Mientras no haya señal real, la selección rota por día con un `daySeed`
**calculado en el servidor** (`page.tsx`) y pasado como prop: determinista, todo
el mundo ve lo mismo el mismo día, recargar no lo cambia (importante para que la
analítica de posiciones de la Fase 5 siga siendo comparable). En cuanto exista
Hype real, `hasRealHype` se vuelve true y la rotación se apaga sola — no hay que
venir a borrar nada. De paso subió de 5 a 6 piezas.

**No calcular `new Date()` en el componente de cliente**: cerca de la medianoche
servidor y cliente elegirían días distintos y React tiraría la hidratación. Un
solo reloj, el del servidor.

**Transición del carrusel**, tres capas que juntas dan la sensación de volumen:
direccional (la pieza entra por el lado del que viene, con `rotate` y `scale`,
y se endereza), paralaje invertido (el nombre gigante entra desde el lado
CONTRARIO y recorre menos distancia — dos planos a distinta profundidad), y
profundidad de campo (`blur(3px)` fijo en las vecinas, solo la activa enfocada,
como en la foto macro). Más una barra de avance del autoplay: la vitrina se
mueve sola y esa barra es lo único que lo anuncia antes de que pase.

**Bug PREEXISTENTE detectado, NO corregido:** `ScrollMacroBackground.tsx` pasa
`prefersReducedMotion` directo a los rangos de `useTransform`, así que con
movimiento reducido el `style` inicial difiere entre servidor y cliente
("Prop `style` did not match"). Es solo warning —React parcha el estilo y no
tumba la hidratación, a diferencia de un desajuste de texto— pero es la misma
familia de error y solo aparece para quien tiene la preferencia activada. El
arreglo es el mismo patrón `mounted` de arriba.

## Auditoría integral (2026-09-02) — sesiones, persistencia, webhook, Closet Digital

> Informe completo con hallazgos numerados, severidades y áreas de mejora por
> prioridad: `docs/audit/AUDITORIA-INTEGRAL-2026-09-02.md`.

Ronda completa sobre `feature/social-qr-follow-vault`. Lo que cambió y, sobre
todo, **por qué**, para no volver a tropezar con lo mismo.

### Sesión de admin: el fix propuesto ya estaba, el hueco era otro

Se reportó "al volver al menú principal de admin se pierde la sesión" y se pidió
configurar la cookie con `path:'/'`, `SameSite:'Lax'`, `HttpOnly` y `Secure` en
producción. **Todo eso ya estaba puesto desde la Fase 1.** Se verificó con
trazado de cookies en dev y contra producción: el login devuelve
`Path=/; Secure; HttpOnly; SameSite=lax`, y `/admin` responde 200 con ella en
ambos entornos. El bucle no se reproduce por ahí.

Lo que sí faltaba: la sesión duraba 12h **desde que se emitió**, no desde el
último uso. Quien abre el panel en la mañana y sigue capturando en la tarde era
expulsado a media tarea — y visto desde fuera eso se lee exactamente como
"se perdió la sesión al navegar".

- `shouldRefreshAdminSession()` + refresco en `middleware.ts`: cada request de
  admin que rebasó la hora re-firma el token con `issuedAt` nuevo. El rol se
  re-firma tal cual venía; este camino **nunca** puede elevar de `staff` a
  `admin`.
- Se refresca cada hora y no en cada request a propósito: esto corre en TODAS
  las rutas de `/admin` y `/api/admin`, y reescribir `Set-Cookie` en cada una
  hace que ninguna respuesta del panel se pueda cachear.
- Los atributos de la cookie viven ahora en UN solo lugar
  (`adminSessionCookieOptions()` en `lib/session.ts`), usados por login,
  logout y middleware. Estaban copiados en dos archivos: basta que una copia
  cambie `path` para que el logout deje viva una cookie que el middleware ya
  no encuentra.

### Los 5 stores de filesystem: migrados a Postgres

`data/*.json` + `fs.writeFileSync` desaparecieron. Seis tablas nuevas:
`offline_sales`, `layaway_reservations`, `product_demand_requests`,
`verified_reviews`, `hidden_products`, `product_drafts`.

- **Dinero en `numeric(12,2)`, nunca float.** Drizzle lo devuelve como string y
  cada store lo convierte en la frontera, así que `src/types/admin.ts` no
  cambió para ningún consumidor.
- **`paymentNotes` en jsonb con append atómico** (el operador `||` de Postgres
  dentro del propio UPDATE). Leer-modificar-escribir desde Node hacía que dos
  abonos capturados casi al mismo tiempo se pisaran.
- **`updateLead`/`updateLayaway` ya no hacen spread del patch completo**: lista
  explícita de campos. Antes, cualquier cosa que llegara en el body se escribía.
- **Las dos ventas de ejemplo del store viejo NO se migraron** ("Carlos
  Mendoza", "Sofía Guerrero"): eran inventadas, y la regla del repo es no
  simular contenido.
- **Bug silencioso encontrado de paso:** al volver async los stores, 7 rutas de
  API quedaron serializando Promises (`NextResponse.json({ leads: getLeads() })`
  sin `await`). TypeScript no lo veía porque `NextResponse.json()` acepta `any`
  — habrían devuelto `{}` en producción. Si alguna vez se vuelve async algo que
  una ruta consume, revisar TODAS sus llamadas a mano; el compilador no ayuda ahí.

### Webhook `orders/paid`: la deuda técnica #3, cerrada

`src/app/api/webhooks/shopify/orders-paid/route.ts` + `lib/shopify/webhook.ts` +
`lib/vault-purchase.ts`.

- Firma HMAC-SHA256 sobre el **cuerpo crudo** (`request.text()`, nunca
  reserializar el JSON) y comparación en tiempo constante. **Fail-closed**: sin
  `SHOPIFY_WEBHOOK_SECRET` responde 503 y no procesa nada, ni en desarrollo.
- **Idempotencia en dos capas, porque Shopify reintenta hasta 19 veces en 48h:**
  índice único `(order_id, product_id, customer_id)` en `vault_items`, y una
  columna `dedupe_key` en `product_events` (`<pedido>#<producto>#<unidad>`).
  Sin la segunda, cada reintento volvía a contar las ventas e inflaba solo el
  Índice — se detectó probando el reintento, no leyendo el código.
- Responde **500 a propósito** ante un error de base de datos (que Shopify
  reintente, la escritura es idempotente) y **200** ante un cuerpo firmado pero
  ilegible (reintentar 19 veces algo que nunca va a funcionar no ayuda a nadie).
- **XP se calcula pero NO se guarda** en `vault_items`. El XP de una pieza es su
  precio disfrazado, y esa tabla alimenta bóvedas públicas — la Fase 2 (sección
  1.2) decidió que no tenga columnas de precio ni valor justamente para que no
  puedan filtrarse. El XP del cliente se sigue derivando en vivo de sus pedidos
  con la misma `calculateHypeXp()`, así que el número no se contradice.

**Número de serie estable.** Antes salía de la POSICIÓN de la pieza en el
arreglo de pedidos: comprar otro par le cambiaba el número de serie a piezas que
el cliente ya tenía. Un serial que cambia no es un serial. Ahora `#LK-007/26` =
séptima unidad de ESE modelo registrada en LAMK, en 2026, asignada al pagar y
calculada **dentro del INSERT** (subconsulta) para que dos compras simultáneas
del mismo par no reciban el mismo número. El sufijo es el AÑO y no el total de
la edición: no sabemos cuántas unidades existen de nada, y un denominador que
crece con cada venta reintroduce exactamente el defecto que este campo viene a
corregir.

**El Índice ya no está capado en 80.** Con ventas reales, el término de
velocidad (20%) dejó de estar reservado en 0 — los cuatro términos tienen
fuente y el score puede llegar a 100. Cap de 10 ventas en 30 días (ventana más
larga que las otras señales: una venta es un evento mucho más raro que una
vista, y en 7 días casi todo daría 0 por falta de ventana, no por falta de
demanda).

### La Bóveda como "Closet Digital": tres zonas

`components/vault/VaultZones.tsx` reemplaza la rejilla uniforme, en `/vault` y
en `/vault/[handle]` (la misma pieza en ambas: un coleccionista debe reconocer
el mismo closet cuando visita el de alguien más).

- **ZONA A · SNEAKER VAULT** — pedestal de museo con canto iluminado y sombra
  proyectada. **ZONA B · APPAREL WARDROBE** — un solo riel metálico cruzando la
  sala, con gancho por prenda. **ZONA C · LUXURY VITRINE** — marco de oro,
  terciopelo vino y cristal ahumado (tinte + reflejo diagonal: con una sola
  capa no se lee como vidrio).
- **La restricción que mandó sobre todo el diseño:** las fotos de Shopify vienen
  sobre fondo gris de estudio y **sin canal alfa** (mismo problema que obligó a
  que la banda del carrusel de la home fuera clara). Un tenis no puede "flotar"
  sobre un pedestal oscuro: se vería el recuadro gris de su propia foto. La
  salida es la del museo real, no la del recorte — **sala oscura, nicho
  iluminado**: el nicho es claro (dentro del rango tonal de las fotos, con
  viñeta radial que se come la orilla) y la arquitectura de alrededor es
  oscura. Dentro del nicho los colores van hardcodeados; afuera, tokens de tema.
- **El reparto en zonas NO tiene tabla propia**: `lib/vault-zones.ts` usa
  `mapCategory()`, que se sacó de `lib/shopify/index.ts` a
  `lib/product-category.ts` para poder compartirla con un componente de
  cliente. Con dos tablas, el día que Shopify devuelva un `productType` nuevo
  la misma gorra saldría en Accesorios en el catálogo y en otra zona aquí.
  Un `productType` desconocido cae en la vitrina, nunca en Sneakers: meterlo en
  Sneakers sería afirmar que es calzado sin saberlo.
- **El año que se muestra es de ADQUISICIÓN, no de lanzamiento.** Shopify no
  guarda cuándo salió al mercado un modelo, y `publishedAt` es cuándo LAMK lo
  publicó en SU tienda. Etiquetar eso como "lanzamiento" sería inventar un dato.
- **`next/image`, no `<img>` crudo.** Las fotos del catálogo son PNG de hasta
  **3.6 MB** y la rejilla anterior de la Bóveda las servía en tamaño completo
  para mostrarlas a ~200px. Además la CSP manda las imágenes por el optimizador
  de Next (mismo origen), que es como ya las cargaba el catálogo — un `<img>`
  apuntando al CDN se queda en blanco.
- **`whileInView` fue un error aquí**: la Zona C nacía debajo del pliegue y se
  quedaba en `opacity: 0` hasta que alguien scrolleara. El resto de la Bóveda
  usa `animate="show"`; se unificó.

### `/profile/[username]` redirige, y `mock-users.ts` murió

En vez de "conectarla a Postgres" como una segunda vista, `/profile/[username]`
ahora hace `permanentRedirect` (308) a `/vault/@usuario`. El perfil público real
ya existe ahí, y **no solo lee datos: aplica el modelo de privacidad completo**
(visibilidad según relación, bloqueos en ambos sentidos, reglas de menores,
vista conservadora forzada cuando la visita viene de un QR). Reimplementar eso
aquí serían dos superficies obligadas a aplicar las mismas reglas — y el día que
una cambie y la otra no, la que se quede atrás filtra la bóveda de alguien.

Con esto se cierra la **deuda técnica #2**: ya no queda ningún archivo del
proyecto sirviendo datos inventados a una pantalla real.

### Vercel Analytics llevaba desde la Fase 5 sin registrar un solo evento

Encontrado por una línea roja en la consola, no por el código: la CSP de la
Fase 1 dejaba `script-src` en `'self'`, así que el navegador **rechazaba el
loader de Vercel Analytics**. Todo el embudo de compra, los clics de carrusel
por posición y las búsquedas que la Fase 5 dejó instrumentados nunca se
enviaron. Se abrieron los dos hosts que usa (`va.vercel-scripts.com` para el
script, `vitals.vercel-insights.com` para los eventos) y nada más.

**Lección para la próxima:** instrumentar analítica y no verificar en el
navegador que el script CARGA deja un sistema que se ve completo en el código y
está muerto en producción.

### Rate limiting: dos huecos de los cuatro caminos críticos

- **`/api/cart/checkout`** no tenía tope. Cada llamada crea un carrito REAL en
  Shopify: sin límite, una sola IP puede quemar la cuota de API de la tienda y
  dejar sin poder pagar a los clientes reales. 20 / 10 min.
- **`/api/social/profile/[username]`** tampoco. Responde por username, así que
  sin tope es una máquina de ENUMERAR handles: los 404 contra los 200 dibujan
  la lista de quién tiene cuenta. El archivo ya cuidaba no delatar la diferencia
  entre "no existe" y "es privado" — el límite es la otra mitad de esa misma
  protección. 60 / 5 min.

OTP y login ya estaban cubiertos desde la Fase 1.

### Modal de bienvenida (`components/ui/WelcomeModal.tsx`)

TENISIN festejando a la izquierda, beneficios reales y CTA a la derecha
(referencia de estructura que trajo el cliente: el modal de membresía de Nike).
La animación se "forma desde las esquinas": cuatro escuadras entran desde fuera
de pantalla por su diagonal, se clavan en las esquinas, y el panel se abre entre
ellas con un `clip-path` desde el centro.

- **No se muestra a quien ya inició sesión** — invita a hacerse miembro.
- **Espera a que el banner de privacidad esté contestado.** Su condición real
  son DOS decisiones (`noticeSeen && analyticsDecided`); mirar solo la primera
  hacía que el modal se abriera encima del aviso legal, que es justo el patrón
  oscuro que el propio aviso dice no practicar. Se reusa `getAnalyticsConsent()`
  en vez de leer otra clave a mano.
- Una vez por sesión (`sessionStorage`, no `localStorage`), Escape cierra, foco
  al botón de cerrar, y sin animación con `prefers-reduced-motion`.
- **La imagen es `tenisin-happy.webp`, la que ya existía.** No se generó una
  nueva: la cuenta de Higgsfield está sin créditos. El copy no promete nada que
  el sitio no haga hoy (bóveda real, serial del webhook, Collector Pass con QR).

### Estado de la suite

`npm run test`: **117 pruebas en 13 archivos** (antes 59 en 9). Nuevas:
`shopify/webhook.test.ts` (6, con regresión del fail-closed),
`vault-zones.test.ts` (11), sliding-window y opciones de cookie en
`session.test.ts` (5), y el término de velocidad en `hype.test.ts`.

### Lo que sigue pendiente (no se tocó)

1. **Dar de alta el webhook en Shopify.** El código está listo y probado, pero
   nadie lo ha conectado: Shopify Admin › Configuración › Notificaciones ›
   Webhooks, evento "Pedido pagado" (`orders/paid`), formato JSON, URL
   `https://<dominio>/api/webhooks/shopify/orders-paid`, y copiar el secreto
   que muestra Shopify a `SHOPIFY_WEBHOOK_SECRET` en Vercel. **Hasta que eso
   pase, el endpoint responde 503 y el término de velocidad del Índice sigue
   en 0** — no porque falte código, sino porque no hay quien le hable.
2. Login social sin probar end-to-end (faltan credenciales de Google/Apple).
3. `SHOPIFY_ADMIN_API_ACCESS_TOKEN` sin configurar: el margen, el capital
   inmovilizado y el tier en perfiles públicos se degradan a "—".
4. WhatsApp/Meta sin credenciales: el OTP sigue en modo desarrollo.
5. Rate limiting sigue en memoria por instancia, no distribuido.
6. Next.js 14 con 3 vulnerabilidades high (requiere migrar a v16, breaking).
7. CSP sin nonces.

### Reclamos de compra manual (quedaba sin documentar)

`api/vault/claims` + `api/admin/vault-claims` + `VaultClaimsPanel.tsx` +
`lib/vault-claims.ts`: un cliente registra una compra anterior y un admin la
aprueba. Existía en el código desde el commit `6961815` pero nunca se escribió
aquí. Las piezas aprobadas se marcan `source: 'manual'` y **no reciben número
de serie ni insignia de rareza** — sin pedido real detrás no se puede verificar
ni escasez ni autenticidad, así que llevan una insignia distinta ("Aprobada por
admin") que no se debe confundir con "Autenticidad verificada".
