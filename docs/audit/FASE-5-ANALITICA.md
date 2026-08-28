# Fase 5 — Analítica

Rama: `audit/fase-5-analitica`.

**Estado: los 2 hallazgos fueron corregidos y verificados** (`tsc --noEmit`, `next build`, smoke tests reales). Backend elegido por ti: **Vercel Analytics** (`@vercel/analytics`). Nada desplegado, nada en `main`.

## Resumen — tabla por severidad

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| 1 | Consentimiento de cookies sin opción de rechazo real — es un aviso, no un consentimiento | 🔴 Alta | ✅ Corregido |
| 2 | Cero infraestructura de analítica de cualquier tipo — sin funnel de compra, sin eventos de carrusel, sin analítica de búsqueda agregada, sin eventos sociales | 🔴 Alta | ✅ Corregido |

## Lo que ya existe (parcial, punto de partida real)

`TenisinWidget.tsx` ya registra cada búsqueda del chat vía `logDemandRequest()` (`src/lib/leads-store.ts`): `rawQuery` (lo que la persona escribió) + `wasMatched` (si el catálogo tenía algo que respondiera). Es, sin que nadie lo haya llamado así, un germen real de "analítica de búsqueda interna con queries sin resultado" — el dato correcto ya se captura. Lo que falta es (a) que sea legible como analítica y no solo como una lista plana de leads en el panel de admin, y (b) que exista el mismo tipo de captura para cualquier búsqueda que no pase por el chat (hoy no hay una barra de búsqueda de catálogo tradicional — confirmado, no existe ese componente — así que "búsqueda interna" hoy es 100% lo que la gente le pregunta a TENISIN).

## 1. Consentimiento de cookies — es un aviso, no un consentimiento — 🔴 Alta

**Qué encontraste:** `PrivacyConsentBanner.tsx` muestra un mensaje ("usamos tus datos para procesar tu pedido") con un único botón, "Entendido" — no hay opción de rechazar, ni una distinción entre "necesario para operar" (dirección de envío, WhatsApp) y "opcional" (analítica/tracking). Guarda el consentimiento en `localStorage` apenas se acepta; no hay ningún estado que represente "rechazado".

**Dónde:** `src/components/ui/PrivacyConsentBanner.tsx`.

**Por qué importa:** el brief lo pide explícito ("consentimiento real de cookies, con opción de rechazo genuina, no solo un botón de aceptar"). Hoy no importa tanto en la práctica porque **no hay ningún tracking corriendo** (ver hallazgo #2) — pero es exactamente el tipo de cosa que hay que resolver ANTES de instrumentar cualquier evento nuevo, no después. Agregar analítica primero y "ya luego arreglamos el consentimiento" es el orden equivocado.

**Cómo se explota / qué se rompe:** no es un exploit — es un incumplimiento potencial de la LFPDPPP (la misma ley que ya motivó este banner) en cuanto se empiece a trackear algo, y una experiencia deshonesta para quien visita el sitio (un botón que dice "aceptar" sin alternativa no es consentimiento, es notificación).

**Parche aplicado:** `PrivacyConsentBanner.tsx` ahora separa las dos cosas:
  1. El aviso de datos operativos (nombre/WhatsApp/dirección) se queda como notificación informativa — no es opcional, es necesario para que el negocio funcione.
  2. Un consentimiento de **analítica/tracking** aparte, con "Aceptar" y "Rechazar" del mismo tamaño y en el mismo lugar (no un botón grande de aceptar contra un link chiquito de rechazar) — se guarda en `lamk_analytics_consent_v1` (`accepted`/`rejected`/sin decidir) y `lib/analytics.ts` lo respeta de verdad: si no es `accepted`, `track()` no manda ni un solo evento — no hace falta acordarse de chequearlo en cada punto de llamada. Además, `<Analytics />` de Vercel ni siquiera se monta (`AnalyticsGate.tsx`, nuevo) hasta que hay un "Aceptar" real — el script no se carga, no solo se le pide que no mande datos.

## 2. Cero infraestructura de analítica — 🔴 Alta

**Qué encontraste:** no hay ninguna librería de analítica instalada (confirmé: sin `gtag`/GA4, sin PostHog, sin Segment, sin Plausible, sin `@vercel/analytics`, nada) y ningún punto del código dispara un evento de negocio. Lo único remotamente parecido es el contador de "vistas 24h" del Hype Meter (`lib/hype.ts`) — cuenta timestamps por producto, no es un sistema de eventos, no tiene funnel, no distingue "vista" de "agregó al carrito" de "compró".

**Dónde:** ausencia en todo el proyecto.

**Por qué importa:** cada pieza que pide el brief depende de esto — el embudo de compra completo (vista de producto → agregar al carrito → inicio de checkout → compra), qué posición del carrusel de home realmente convierte (esto alimenta directo la Fase 6 — hoy literalmente no hay forma de saber si el carrusel "Curaduría LAMK" convierte algo o si nadie pasa de la primera tarjeta), qué está buscando la gente y no encontrando (fuente más barata de decisiones de inventario, dice el brief, y ya casi la tenemos vía `logDemandRequest`), y eventos de las funciones sociales (que ni siquiera existen todavía, ver Fase 2).

**Cómo se explota / qué se rompe:** no es un exploit — es decidir a ciegas. El cliente pidió un carrusel "que sea el más llamativo" en una ronda anterior de esta sesión; hoy no hay ninguna forma de confirmarle si el carrusel actual convierte o no, que es justo la pregunta que la Fase 6 necesita responder con datos, no con opinión.

**Parche aplicado:** `@vercel/analytics` instalado (confirmaste Vercel Analytics), `src/lib/analytics.ts` (nuevo) — capa `track()` tipada (una unión de eventos permitidos, no un objeto libre — la forma de cada evento es la barrera de compilación contra colar un campo con PII sin querer) que respeta el consentimiento del hallazgo #1 en un solo lugar.

## Diseño de eventos — implementado

Regla que aplica a todos: **ningún evento lleva email, nombre, teléfono ni dirección** — solo IDs de producto/variante (ya públicos, son handles de Shopify), posiciones, y un identificador anónimo de sesión (UUID generado en el navegador, sin relación con la cuenta de cliente, solo para poder agrupar "eventos del mismo visitante" sin saber quién es).

| Evento | Dónde se dispara (real) | Datos (sin PII) |
|---|---|---|
| `product_view` | `ProductDetail.tsx`, `useEffect` al montar | `productId`, `handle`, `category` |
| `add_to_cart` | `CartContext.addItem()` — un solo punto cubre ficha de producto, ambos carruseles de home y catálogo | `productId`, `variantId`, `price` |
| `checkout_started` | `SpecialCartDrawer.tsx`, tras `/api/cart/checkout` exitoso, antes de redirigir a Shopify | `itemCount`, `subtotal` |
| `carousel_impression` | `HypeCarousel` (vía `CarouselItemTracker.tsx`, IntersectionObserver al 50%) y `DropsCoverflow` (vía `onActiveChange` de `CoverflowCarousel` — la tarjeta que llega a estar centrada) | `carouselName`, `position` |
| `carousel_click` | Mismos dos componentes — clic real (no el clic de "recentrar" del coverflow en tarjetas no-activas) | `carouselName`, `position` (0-indexed) |
| `search_query` | `logDemandRequest()` en `hooks/useLeads.ts` — un solo punto cubre las 4 llamadas dentro de `TenisinWidget.tsx` | `rawQuery`, `hadResults` |
| `qr_generated` / `qr_scanned` / `follow_created` / `vault_item_added` | Pendiente — estas funciones no existen todavía (Fase 2 es diseño, no código) | Se instrumentan cuando se construyan, según el modelo de privacidad ya acordado — nunca valor de colección ni ubicación, ver `FASE-2-PRIVACIDAD.md` |

**Nota sobre `purchase`:** no se instrumentó — el checkout redirige a Shopify y el sitio nunca vuelve a saber si la compra se completó (no hay página de confirmación propia ni webhook `orders/create` configurado). `checkout_started` es honesto con lo que el sitio puede saber hoy; un webhook de Shopify con validación de firma es una pieza de infraestructura nueva que merece su propia conversación, igual que se trató el tema de pagos en la Fase 1 — no se coló dentro de "agregar analítica".

## Archivos tocados

**Nuevos:** `src/lib/analytics.ts`, `src/components/analytics/AnalyticsGate.tsx`, `src/components/analytics/CarouselItemTracker.tsx`, `package.json`/`package-lock.json` (`@vercel/analytics`).
**Modificados:** `src/components/ui/PrivacyConsentBanner.tsx` (consentimiento real), `src/app/(routes)/layout.tsx` (`<AnalyticsGate />`), `src/context/CartContext.tsx` (`add_to_cart`), `src/components/cart/SpecialCartDrawer.tsx` (`checkout_started`), `src/components/product/ProductDetail.tsx` (`product_view`), `src/hooks/useLeads.ts` (`search_query`), `src/components/home/HypeCarousel.tsx` y `src/components/home/DropsCoverflow.tsx` + `src/components/ui/coverflow-carousel.tsx` (`carousel_impression`/`carousel_click`).

Nada tocó `main` ni se desplegó — todo vive en `audit/fase-5-analitica`, verificado con `tsc --noEmit`, `next build` y smoke tests reales. Lista para Fase 6 (Diseño) cuando digas.
