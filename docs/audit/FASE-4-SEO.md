# Fase 4 — SEO

Rama: `audit/fase-4-seo`. Solo reporte — cero cambios de código en esta fase (misma regla: entrego hallazgos, espero aprobación antes de tocar código).

## Resumen — tabla por severidad

| # | Hallazgo | Severidad |
|---|---|---|
| 1 | Metadata (title/description) única por producto — no existe | 🔴 Alta |
| 2 | `/profile/[username]` indexable — debería ser `noindex` | 🔴 Alta |
| 3 | Sin `robots.txt` ni `sitemap.xml` | 🔴 Alta |
| 4 | Catálogo usa "Cargar más" client-side — productos más allá del primero PAGE_SIZE=24 no tienen URL propia que Google pueda seguir | 🟡 Media |
| 5 | Sin `metadataBase` ni Open Graph — links compartidos no muestran preview, y Next no puede generar canónicas absolutas | 🟡 Media |
| 6 | Sin `Organization` JSON-LD en la raíz | 🟢 Baja |
| 7 | Sin `BreadcrumbList` — bloqueado por la misma decisión del #4 (categorías no son URLs reales todavía) | 🟢 Baja / pendiente de decisión de producto |

## Lo que salió limpio

- **JSON-LD de producto ya existe y está bien hecho** (`product/[handle]/page.tsx`): `Product` con `offers.priceCurrency: 'MXN'`, precio y disponibilidad reales (`InStock`/`OutOfStock` según `product.isSoldOut`, no inventado), `brand`, `sku`. Esto viene de una pasada anterior de esta misma sesión (comentario en el código: "auditoría 2026-08-27, hallazgo #8") — no hace falta rehacerlo.
- **404 real, no soft-404:** tanto `product/[handle]` como `profile/[username]` llaman a `notFound()` de Next cuando el recurso no existe (o está oculto por el admin) — eso produce un status HTTP 404 de verdad, aunque no haya una página 404 con marca propia (usa la genérica de Next). Un producto que un admin oculta también cae en 404 en vez de mostrar contenido fantasma.
- **Contenido real en el HTML servido, no una cáscara vacía:** Home, Catálogo y Ficha de producto son Server Components async que hacen el fetch a Shopify del lado del servidor y pasan los datos ya resueltos a los componentes cliente — Google (o cualquiera) ve el HTML con el catálogo real ya adentro, no un `<div id="root">` vacío que dependa de JS para tener contenido.
- **Precio/disponibilidad del JSON-LD no están inventados** — se leen del mismo dato real que ya usa la ficha de producto, no hay un cálculo paralelo que se pueda desincronizar.

---

### 1. Metadata única por producto — no existe — 🔴 Alta

**Qué encontraste:** en todo el proyecto solo 2 archivos exportan `metadata` (`aviso-de-privacidad/page.tsx` y el layout raíz). `product/[handle]/page.tsx` **no tiene `generateMetadata()`** — así que cada ficha de producto hereda el `<title>` y `<meta description>` genéricos del layout raíz: `"Look At My Kicks MX | Exclusive Streetwear & Sneakers"` para absolutamente todos los productos.

**Dónde:** `src/app/(routes)/product/[handle]/page.tsx` (ausencia).

**Por qué importa:** el `<title>` es literalmente lo que Google muestra como enlace clicable en resultados de búsqueda. Hoy, si alguien busca "Jordan 1 Chicago LAMK", Google tiene que decidir mostrar el mismo título genérico de la tienda para esa ficha que para todas las demás — nada distingue una ficha de otra en el resultado de búsqueda, y se pierde toda la long-tail de gente buscando un modelo específico por nombre.

**Cómo se explota / qué se rompe:** no es un exploit — es una pérdida de tráfico orgánico real. Cientos de fichas de producto compitiendo todas con el mismo título/descripción entre sí y contra la home.

**Parche propuesto:** agregar `generateMetadata()` a la ficha de producto — título tipo `"{producto.title} | {marca} — Look At My Kicks MX"`, descripción usando `product.description`/`storySummary` real (ya existe, es el mismo texto que usa el JSON-LD), y `openGraph.images` con la primera imagen real del producto.

---

### 2. `/profile/[username]` indexable — 🔴 Alta

**Qué encontraste:** `profile/[username]/page.tsx` no exporta `metadata` ni `generateMetadata()` — no hay ningún `noindex`.

**Dónde:** `src/app/(routes)/profile/[username]/page.tsx`.

**Por qué importa:** el brief lo marca como requisito explícito, y conecta directo con el modelo de privacidad de la Fase 2 (perfiles nacen privados por defecto) — no tendría sentido diseñar un sistema entero para que un perfil nazca privado si Google puede indexarlo de todos modos apenas exista una URL pública. Hoy los perfiles corren sobre `mock-users.ts` (ficticios), pero la ruta ya es rastreable — el día que se conecten datos reales (Fase 2), el hueco ya estaría ahí desde antes.

**Cómo se explota / qué se rompe:** no es un exploit — es exactamente el escenario que motivó la Fase 2 (alguien buscando el nombre de una persona en Google terminando en su perfil de coleccionista), solo que a través del buscador en vez de un QR físico.

**Parche propuesto:** `generateMetadata()` devolviendo `{ robots: { index: false, follow: false } }` en esta ruta — y (ver hallazgo #3) excluir `/profile/` en `robots.txt` también, como refuerzo, no como sustituto (un `disallow` en robots.txt no saca del índice una URL ya indexada; el `noindex` en meta sí).

---

### 3. Sin `robots.txt` ni `sitemap.xml` — 🔴 Alta

**Qué encontraste:** no existe ninguno de los dos — ni como archivo estático en `public/`, ni como ruta dinámica (`app/robots.ts`/`app/sitemap.ts`, el patrón nativo de Next 14 para generarlos).

**Dónde:** ausencia en todo el proyecto.

**Por qué importa:** sin `sitemap.xml`, Google tiene que descubrir cada ficha de producto solo seguíendo links desde el catálogo — y el catálogo, por el hallazgo #4, no expone todos los productos en URLs rastreables. Sin `robots.txt`, no hay ninguna directiva explícita que excluya `/admin/*` (páginas de login/dashboard que no aportan nada indexado y no deberían competir por presupuesto de rastreo) ni `/profile/*` (hallazgo #2).

**Cómo se explota / qué se rompe:** no es un exploit — es invisibilidad parcial en buscadores (productos que nunca se indexan porque nadie los enlaza) combinada con gasto de presupuesto de rastreo en páginas que no deberían indexarse.

**Parche propuesto:** `app/robots.ts` (disallow `/admin/`, `/api/`, `/profile/`; allow todo lo demás; referencia al sitemap) + `app/sitemap.ts` generando entradas para home, catálogo, y **todas** las fichas de producto reales (via `getCatalogLive()`, mismo dato que ya usa todo el proyecto — nada inventado).

---

### 4. Catálogo sin paginación indexable — 🟡 Media

**Qué encontraste:** `CatalogGrid.tsx` implementa "Cargar más" con estado de React puro (`visibleCount`, `PAGE_SIZE = 24`) — nunca cambia la URL. No existe `?page=2` ni ninguna URL que represente "el resto del catálogo".

**Dónde:** `src/components/catalog/CatalogGrid.tsx`.

**Por qué importa:** Google no hace clic en botones — sigue links con `href` real. Si el catálogo real (Shopify) tiene más de 24 productos, todo lo que esté después del primer lote **no tiene ninguna URL que un crawler pueda seguir para llegar ahí** (a menos que ese producto individual ya esté enlazado desde otro lado, como un carrusel de home). Hoy el catálogo mock tiene 12 productos (no lo dispara), pero es una limitación estructural que sí importa en cuanto el catálogo real crezca.

**Cómo se explota / qué se rompe:** no es un exploit — es un techo de indexación silencioso que aparece justo cuando el negocio crece (más productos = más invisibles).

**Parche propuesto:** dos caminos, a decidir:
  1. Paginación real con URL (`/catalog?page=2`) además del "cargar más" — mismo estado de React pero sincronizado con `useSearchParams`/`router.push`, y agregar esas URLs al sitemap.
  2. Alternativa más simple: no cambiar la UX de "cargar más", pero asegurar que **cada producto individual** ya está en el sitemap (hallazgo #3) — así Google llega a cada ficha directo, sin depender de recorrer el catálogo paginado. Esto ya resuelve el 90% del problema sin tocar la UX del catálogo.

Recomiendo la opción 2 primero (ya la cubre el fix del hallazgo #3) y dejar la opción 1 como mejora futura si el catálogo crece mucho.

---

### 5. Sin `metadataBase` ni Open Graph — 🟡 Media

**Qué encontraste:** el objeto `metadata` del layout raíz no tiene `metadataBase`, `openGraph` ni `alternates`.

**Dónde:** `src/app/(routes)/layout.tsx:24-32`.

**Por qué importa:** sin `metadataBase`, Next no puede resolver URLs relativas de `og:image`/canónicas a absolutas — y sin `openGraph` configurado, compartir un link de LAMK en WhatsApp, Instagram o Facebook (el canal real de tráfico del negocio, según `CLAUDE.md`) no muestra ninguna tarjeta de preview (ni imagen, ni título, ni descripción) — se ve como un link pelón.

**Cómo se explota / qué se rompe:** no es un exploit — es una pérdida real de clics cuando alguien comparte un producto o la tienda en redes, que es exactamente el canal de adquisición principal del negocio.

**Parche propuesto:** agregar `metadataBase: new URL('https://lookatmykicksmx.com')` (o el dominio que corresponda) y un bloque `openGraph` básico en el layout raíz, más `openGraph.images` específico en cada ficha de producto (junto con el fix del hallazgo #1).

---

### 6. Sin `Organization` JSON-LD en la raíz — 🟢 Baja

**Qué encontraste:** el único JSON-LD de todo el sitio es el de producto — no hay `Organization` en el layout raíz.

**Dónde:** `src/app/(routes)/layout.tsx` (ausencia).

**Por qué importa:** `Organization` es lo que le da a Google contexto de marca (nombre, logo, redes sociales oficiales) para el panel de conocimiento y para que Google Shopping/rich results asocien correctamente los productos con la tienda. No es tan urgente como los hallazgos anteriores porque no bloquea nada, solo enriquece.

**Parche propuesto:** JSON-LD `Organization` en el layout raíz con nombre real, logo, y `sameAs` apuntando al Instagram/redes reales de la marca (ya existen en `SAAS_CONFIG` o similar).

---

### 7. Sin `BreadcrumbList` — 🟢 Baja / pendiente de una decisión de producto

**Qué encontraste:** no hay ningún breadcrumb, ni en JSON-LD ni visual.

**Dónde:** ausencia en todo el proyecto.

**Por qué importa:** el brief pide `BreadcrumbList` "en categorías" — pero hoy las categorías **no son URLs reales** (ver hallazgo #4: el filtro de categoría es un botón de estado de React, no una ruta tipo `/catalog/tenis`). No hay dónde colgar un breadcrumb de categoría hasta que exista esa URL. Si algún día se decide que las categorías sí merecen su propia URL (lo cual también ayudaría al hallazgo #4), ahí es donde tendría sentido agregar `BreadcrumbList`. Por ahora sí se puede agregar un breadcrumb simple Home → Catálogo → Producto en la ficha de producto, que no depende de esa decisión.

**Parche propuesto:** breadcrumb Home → Catálogo → {producto} en la ficha de producto (no depende de nada más); breadcrumb por categoría queda pendiente de si se construyen URLs de categoría — no es una decisión que deba tomar yo unilateralmente.

---

## Notas menores (no ameritan severidad propia)

- El `title` del layout raíz está en inglés ("Exclusive Streetwear & Sneakers") pese a que el sitio es `lang="es-MX"` y la audiencia es mexicana — cosmético, lo menciono porque se toca de todos modos al arreglar el hallazgo #5.
- Sold-out: hoy un producto agotado se sigue sirviendo en su URL normal con `availability: OutOfStock` en el JSON-LD — es el comportamiento que Google recomienda (no lo cambies a 404 solo por agotarse). Un producto **eliminado/oculto por el admin** sí cae en 404 real. No encontré un caso de "redirect" mal usado — no hay ningún redirect de producto en el proyecto hoy.

No apliqué ningún fix — quedo a la espera de tu aprobación para decidir cuáles de estos 7 se corrigen y en qué orden antes de pasar a Fase 5 (Analítica).
