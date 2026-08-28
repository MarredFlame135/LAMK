# Fase 5 — Analítica

Rama: `audit/fase-5-analitica`. Solo reporte — cero cambios de código en esta fase.

## Resumen — tabla por severidad

| # | Hallazgo | Severidad |
|---|---|---|
| 1 | Consentimiento de cookies sin opción de rechazo real — es un aviso, no un consentimiento | 🔴 Alta |
| 2 | Cero infraestructura de analítica de cualquier tipo — sin funnel de compra, sin eventos de carrusel, sin analítica de búsqueda agregada, sin eventos sociales | 🔴 Alta |
| 3 | **Decisión pendiente, no un hallazgo de severidad:** a qué backend van los eventos — ver sección "Antes de construir nada" |

## Lo que ya existe (parcial, punto de partida real)

`TenisinWidget.tsx` ya registra cada búsqueda del chat vía `logDemandRequest()` (`src/lib/leads-store.ts`): `rawQuery` (lo que la persona escribió) + `wasMatched` (si el catálogo tenía algo que respondiera). Es, sin que nadie lo haya llamado así, un germen real de "analítica de búsqueda interna con queries sin resultado" — el dato correcto ya se captura. Lo que falta es (a) que sea legible como analítica y no solo como una lista plana de leads en el panel de admin, y (b) que exista el mismo tipo de captura para cualquier búsqueda que no pase por el chat (hoy no hay una barra de búsqueda de catálogo tradicional — confirmado, no existe ese componente — así que "búsqueda interna" hoy es 100% lo que la gente le pregunta a TENISIN).

## 1. Consentimiento de cookies — es un aviso, no un consentimiento — 🔴 Alta

**Qué encontraste:** `PrivacyConsentBanner.tsx` muestra un mensaje ("usamos tus datos para procesar tu pedido") con un único botón, "Entendido" — no hay opción de rechazar, ni una distinción entre "necesario para operar" (dirección de envío, WhatsApp) y "opcional" (analítica/tracking). Guarda el consentimiento en `localStorage` apenas se acepta; no hay ningún estado que represente "rechazado".

**Dónde:** `src/components/ui/PrivacyConsentBanner.tsx`.

**Por qué importa:** el brief lo pide explícito ("consentimiento real de cookies, con opción de rechazo genuina, no solo un botón de aceptar"). Hoy no importa tanto en la práctica porque **no hay ningún tracking corriendo** (ver hallazgo #2) — pero es exactamente el tipo de cosa que hay que resolver ANTES de instrumentar cualquier evento nuevo, no después. Agregar analítica primero y "ya luego arreglamos el consentimiento" es el orden equivocado.

**Cómo se explota / qué se rompe:** no es un exploit — es un incumplimiento potencial de la LFPDPPP (la misma ley que ya motivó este banner) en cuanto se empiece a trackear algo, y una experiencia deshonesta para quien visita el sitio (un botón que dice "aceptar" sin alternativa no es consentimiento, es notificación).

**Parche propuesto:** separar dos cosas que hoy están mezcladas en un solo aviso:
  1. El aviso de datos operativos (nombre/WhatsApp/dirección para procesar pedidos) — eso NO es opcional, es necesario para que el negocio funcione, se queda como notificación informativa (lo que ya es).
  2. Un consentimiento de **analítica/tracking** aparte, con "Aceptar" y "Rechazar" con el mismo peso visual (mismo tamaño, mismo lugar — no un botón grande de aceptar y un link chiquito de rechazar), que se guarda como tres estados posibles (`accepted` / `rejected` / sin decidir todavía) y que la capa de eventos (hallazgo #2) respeta de verdad: si `rejected`, no se manda ni un solo evento.

## 2. Cero infraestructura de analítica — 🔴 Alta

**Qué encontraste:** no hay ninguna librería de analítica instalada (confirmé: sin `gtag`/GA4, sin PostHog, sin Segment, sin Plausible, sin `@vercel/analytics`, nada) y ningún punto del código dispara un evento de negocio. Lo único remotamente parecido es el contador de "vistas 24h" del Hype Meter (`lib/hype.ts`) — cuenta timestamps por producto, no es un sistema de eventos, no tiene funnel, no distingue "vista" de "agregó al carrito" de "compró".

**Dónde:** ausencia en todo el proyecto.

**Por qué importa:** cada pieza que pide el brief depende de esto — el embudo de compra completo (vista de producto → agregar al carrito → inicio de checkout → compra), qué posición del carrusel de home realmente convierte (esto alimenta directo la Fase 6 — hoy literalmente no hay forma de saber si el carrusel "Curaduría LAMK" convierte algo o si nadie pasa de la primera tarjeta), qué está buscando la gente y no encontrando (fuente más barata de decisiones de inventario, dice el brief, y ya casi la tenemos vía `logDemandRequest`), y eventos de las funciones sociales (que ni siquiera existen todavía, ver Fase 2).

**Cómo se explota / qué se rompe:** no es un exploit — es decidir a ciegas. El cliente pidió un carrusel "que sea el más llamativo" en una ronda anterior de esta sesión; hoy no hay ninguna forma de confirmarle si el carrusel actual convierte o no, que es justo la pregunta que la Fase 6 necesita responder con datos, no con opinión.

**Parche propuesto:** ver la sección siguiente — antes de escribir el código hace falta una decisión tuya.

## Antes de construir nada: a dónde van los eventos

Esto no es un hallazgo con severidad, es una decisión de producto que no me corresponde tomar solo (mismo criterio que usé en la Fase 2 con el tema de menores, y en la Fase 1 con Vercel KV/Upstash para el rate limiting).

**Lo que sí puedo diseñar y dejar listo sin esa decisión:** la capa de eventos en sí (nombres de evento, qué datos lleva cada uno, la regla de "cero PII", y los puntos exactos del código donde se dispara cada uno) más el fix del consentimiento (hallazgo #1) — todo eso es independiente de a dónde terminen viajando los eventos.

**Lo que sí depende de la decisión:** el "sink" — el lugar real donde esos eventos aterrizan para poder verlos como dashboard/reportes.

Propongo **Vercel Analytics** (`@vercel/analytics`, específicamente su función `track()` para eventos personalizados) como default recomendado, por tres razones concretas: (1) el proyecto ya está hospedado en Vercel — no es sumar una relación con un proveedor nuevo, es activar algo del mismo lugar donde ya vive el sitio; (2) sus eventos personalizados no usan cookies por diseño, lo cual simplifica directamente el fix del hallazgo #1 (menos que gatear); (3) es la dependencia más liviana posible para esto — no agrega el peso ni la curva de configuración de GA4/PostHog/Segment. La alternativa sería usar el mismo patrón de "store en JSON local" que ya usa `leads-store.ts`/`sales-store.ts`, pero ya está documentado en `CLAUDE.md` como un riesgo de persistencia real en Vercel — usarlo para analítica (volumen mucho más alto que leads/reseñas) empeoraría ese riesgo, no lo resolvería.

No instalé nada — necesito tu confirmación antes de agregar cualquier paquete nuevo.

## Diseño de eventos propuesto (para acordar junto con lo anterior)

Regla que aplica a todos: **ningún evento lleva email, nombre, teléfono ni dirección** — solo IDs de producto/variante (ya públicos, son handles de Shopify), posiciones, y un identificador anónimo de sesión (UUID generado en el navegador, sin relación con la cuenta de cliente, solo para poder agrupar "eventos del mismo visitante" sin saber quién es).

| Evento | Cuándo dispara | Datos (sin PII) |
|---|---|---|
| `product_view` | Se monta la ficha de producto | `productId`, `handle`, `category` |
| `add_to_cart` | `CartContext.addItem()` | `productId`, `variantId`, `price` |
| `checkout_started` | Se llama `/api/cart/checkout` con éxito | `itemCount`, `subtotal` |
| `purchase` | Idealmente confirmado por un webhook de Shopify (no existe todavía — ver nota) | `orderTotal` (sin desglose de qué compró alguien específico si eso pudiera cruzarse con PII) |
| `carousel_impression` | Un carrusel de home entra al viewport | `carouselName`, `slideCount` |
| `carousel_click` | Clic en una tarjeta del carrusel | `carouselName`, `position` (0-indexed — esto es lo que responde "¿la gente pasa de la primera tarjeta?") |
| `search_query` | Cualquier búsqueda (hoy: TenisinWidget) | `rawQuery`, `hadResults` (booleano) — mismo dato que ya captura `logDemandRequest`, solo que también como evento de analítica agregable |
| `qr_generated` / `qr_scanned` / `follow_created` / `vault_item_added` | Cuando existan las funciones sociales (Fase 2) | según el modelo de privacidad ya acordado — nunca valor de colección ni ubicación, ver `FASE-2-PRIVACIDAD.md` |

**Nota sobre `purchase`:** hoy el checkout redirige a Shopify y el sitio nunca vuelve a saber si la compra se completó (no hay página de confirmación propia ni webhook de Shopify configurado). Registrar `checkout_started` es honesto con lo que el sitio puede saber hoy; `purchase` de verdad requeriría un webhook `orders/create` de Shopify — lo dejo señalado, no lo construyo en esta fase porque es una pieza nueva de infraestructura (webhook con validación de firma, ver el mismo criterio que usó la Fase 1 para pagos) que merece su propia conversación, no colarse dentro de "agregar analítica".

Quedo a la espera de: (1) tu decisión sobre Vercel Analytics vs. otra alternativa vs. "solo deja la capa lista, sin sink todavía", y (2) tu aprobación del diseño de eventos de arriba, antes de escribir código.
