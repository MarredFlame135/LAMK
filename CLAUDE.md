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

**No empezado:** Fase D (panel de administración).
