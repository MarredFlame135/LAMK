# Fase 4 — SEO

Rama: `audit/fase-4-seo`.

**Estado: los 7 hallazgos fueron corregidos y verificados** (`tsc --noEmit`, `next build`, y smoke tests reales: `robots.txt` sirviendo las directivas correctas, `sitemap.xml` con productos reales del catálogo, `noindex` confirmado en `/profile/[username]`, título/descripción únicos confirmados en una ficha de producto real, y los 3 JSON-LD — Organization, Product, BreadcrumbList — bien formados en la página). Nada desplegado, nada en `main`.

## Resumen — tabla por severidad

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| 1 | Metadata (title/description) única por producto — no existe | 🔴 Alta | ✅ Corregido |
| 2 | `/profile/[username]` indexable — debería ser `noindex` | 🔴 Alta | ✅ Corregido |
| 3 | Sin `robots.txt` ni `sitemap.xml` | 🔴 Alta | ✅ Corregido |
| 4 | Catálogo usa "Cargar más" client-side — productos más allá del primero PAGE_SIZE=24 no tienen URL propia que Google pueda seguir | 🟡 Media | ✅ Corregido (vía sitemap, ver nota) |
| 5 | Sin `metadataBase` ni Open Graph — links compartidos no muestran preview, y Next no puede generar canónicas absolutas | 🟡 Media | ✅ Corregido |
| 6 | Sin `Organization` JSON-LD en la raíz | 🟢 Baja | ✅ Corregido |
| 7 | Sin `BreadcrumbList` — bloqueado por la misma decisión del #4 (categorías no son URLs reales todavía) | 🟢 Baja / pendiente de decisión de producto | ✅ Corregido (el que no dependía de esa decisión — breadcrumb de producto) |

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

**Parche aplicado:** `generateMetadata()` en `product/[handle]/page.tsx` — título `"{producto.title} | {marca} — Look At My Kicks MX"`, descripción real (mismo texto que ya usa el JSON-LD), `openGraph.images` con la primera imagen real. Verificado con `curl` contra un producto real: `<title>TENIS SAMBA OG LEOPARD PACK | SAMBA OG LEOPARD PACK — Look At My Kicks MX</title>`. De paso, envolví el fetch del producto en `cache()` de React (dentro del propio archivo de la página) para que `generateMetadata()` y el componente de página compartan el mismo resultado en vez de duplicar el round-trip a Shopify.

---

### 2. `/profile/[username]` indexable — 🔴 Alta

**Qué encontraste:** `profile/[username]/page.tsx` no exporta `metadata` ni `generateMetadata()` — no hay ningún `noindex`.

**Dónde:** `src/app/(routes)/profile/[username]/page.tsx`.

**Por qué importa:** el brief lo marca como requisito explícito, y conecta directo con el modelo de privacidad de la Fase 2 (perfiles nacen privados por defecto) — no tendría sentido diseñar un sistema entero para que un perfil nazca privado si Google puede indexarlo de todos modos apenas exista una URL pública. Hoy los perfiles corren sobre `mock-users.ts` (ficticios), pero la ruta ya es rastreable — el día que se conecten datos reales (Fase 2), el hueco ya estaría ahí desde antes.

**Cómo se explota / qué se rompe:** no es un exploit — es exactamente el escenario que motivó la Fase 2 (alguien buscando el nombre de una persona en Google terminando en su perfil de coleccionista), solo que a través del buscador en vez de un QR físico.

**Parche aplicado:** `export const metadata: Metadata = { robots: { index: false, follow: false } }` en `profile/[username]/page.tsx`, más `/profile/` agregado a `disallow` en el `robots.ts` nuevo (refuerzo, no sustituto — un `disallow` no saca del índice algo ya indexado, el `noindex` en meta sí). Verificado con `curl`: `<meta name="robots" content="noindex"/>` presente en la respuesta real.

---

### 3. Sin `robots.txt` ni `sitemap.xml` — 🔴 Alta

**Qué encontraste:** no existe ninguno de los dos — ni como archivo estático en `public/`, ni como ruta dinámica (`app/robots.ts`/`app/sitemap.ts`, el patrón nativo de Next 14 para generarlos).

**Dónde:** ausencia en todo el proyecto.

**Por qué importa:** sin `sitemap.xml`, Google tiene que descubrir cada ficha de producto solo seguíendo links desde el catálogo — y el catálogo, por el hallazgo #4, no expone todos los productos en URLs rastreables. Sin `robots.txt`, no hay ninguna directiva explícita que excluya `/admin/*` (páginas de login/dashboard que no aportan nada indexado y no deberían competir por presupuesto de rastreo) ni `/profile/*` (hallazgo #2).

**Cómo se explota / qué se rompe:** no es un exploit — es invisibilidad parcial en buscadores (productos que nunca se indexan porque nadie los enlaza) combinada con gasto de presupuesto de rastreo en páginas que no deberían indexarse.

**Parche aplicado:** `src/app/robots.ts` (disallow `/admin/`, `/api/`, `/profile/`; referencia al sitemap) + `src/app/sitemap.ts` con home, catálogo, aviso de privacidad, y **todas** las fichas de producto reales (`getCatalogLive()`, mismo dato que ya usa todo el proyecto). Verificado con `curl`: `/robots.txt` y `/sitemap.xml` sirven contenido real, con handles de productos reales del catálogo.

---

### 4. Catálogo sin paginación indexable — 🟡 Media

**Qué encontraste:** `CatalogGrid.tsx` implementa "Cargar más" con estado de React puro (`visibleCount`, `PAGE_SIZE = 24`) — nunca cambia la URL. No existe `?page=2` ni ninguna URL que represente "el resto del catálogo".

**Dónde:** `src/components/catalog/CatalogGrid.tsx`.

**Por qué importa:** Google no hace clic en botones — sigue links con `href` real. Si el catálogo real (Shopify) tiene más de 24 productos, todo lo que esté después del primer lote **no tiene ninguna URL que un crawler pueda seguir para llegar ahí** (a menos que ese producto individual ya esté enlazado desde otro lado, como un carrusel de home). Hoy el catálogo mock tiene 12 productos (no lo dispara), pero es una limitación estructural que sí importa en cuanto el catálogo real crezca.

**Cómo se explota / qué se rompe:** no es un exploit — es un techo de indexación silencioso que aparece justo cuando el negocio crece (más productos = más invisibles).

**Parche aplicado:** opción 2 (la recomendada) — no se tocó la UX de "cargar más", pero ahora **cada producto individual** está en `sitemap.xml` (fix del hallazgo #3), así que Google llega a cada ficha directo sin depender de recorrer el catálogo paginado. La opción 1 (paginación real con URL) queda como mejora futura si el catálogo real crece mucho — no se justificaba tocar la UX del catálogo solo para esto.

---

### 5. Sin `metadataBase` ni Open Graph — 🟡 Media

**Qué encontraste:** el objeto `metadata` del layout raíz no tiene `metadataBase`, `openGraph` ni `alternates`.

**Dónde:** `src/app/(routes)/layout.tsx:24-32`.

**Por qué importa:** sin `metadataBase`, Next no puede resolver URLs relativas de `og:image`/canónicas a absolutas — y sin `openGraph` configurado, compartir un link de LAMK en WhatsApp, Instagram o Facebook (el canal real de tráfico del negocio, según `CLAUDE.md`) no muestra ninguna tarjeta de preview (ni imagen, ni título, ni descripción) — se ve como un link pelón.

**Cómo se explota / qué se rompe:** no es un exploit — es una pérdida real de clics cuando alguien comparte un producto o la tienda en redes, que es exactamente el canal de adquisición principal del negocio.

**Parche aplicado:** `src/lib/site-url.ts` (nuevo) — punto único para resolver la URL pública del sitio, usado ahora por `metadataBase`, `robots.ts`, `sitemap.ts` y el JSON-LD de producto (antes cada uno improvisaba su propia lógica, o no tenía ninguna). `metadataBase` + bloque `openGraph` agregados al layout raíz; `openGraph.images` específico ya quedó cubierto en cada ficha de producto por el fix del hallazgo #1.

---

### 6. Sin `Organization` JSON-LD en la raíz — 🟢 Baja

**Qué encontraste:** el único JSON-LD de todo el sitio es el de producto — no hay `Organization` en el layout raíz.

**Dónde:** `src/app/(routes)/layout.tsx` (ausencia).

**Por qué importa:** `Organization` es lo que le da a Google contexto de marca (nombre, logo, redes sociales oficiales) para el panel de conocimiento y para que Google Shopping/rich results asocien correctamente los productos con la tienda. No es tan urgente como los hallazgos anteriores porque no bloquea nada, solo enriquece.

**Parche aplicado:** JSON-LD `Organization` en el layout raíz (nombre, URL, `sameAs` → Instagram real de la marca, `https://www.instagram.com/look_atmy_kicks/` — de paso, agregado a `SAAS_CONFIG.instagramUrl` como fuente única, ya que ese URL estaba duplicado como constante local en 2 componentes distintos).

---

### 7. Sin `BreadcrumbList` — 🟢 Baja / pendiente de una decisión de producto

**Qué encontraste:** no hay ningún breadcrumb, ni en JSON-LD ni visual.

**Dónde:** ausencia en todo el proyecto.

**Por qué importa:** el brief pide `BreadcrumbList` "en categorías" — pero hoy las categorías **no son URLs reales** (ver hallazgo #4: el filtro de categoría es un botón de estado de React, no una ruta tipo `/catalog/tenis`). No hay dónde colgar un breadcrumb de categoría hasta que exista esa URL. Si algún día se decide que las categorías sí merecen su propia URL (lo cual también ayudaría al hallazgo #4), ahí es donde tendría sentido agregar `BreadcrumbList`. Por ahora sí se puede agregar un breadcrumb simple Home → Catálogo → Producto en la ficha de producto, que no depende de esa decisión.

**Parche aplicado:** JSON-LD `BreadcrumbList` (Home → Catálogo → {producto}) agregado a la ficha de producto — no dependía de nada más. El breadcrumb por categoría sigue pendiente de si se construyen URLs de categoría — no es una decisión que deba tomar yo unilateralmente, se queda igual que en el reporte original.

---

## Notas menores (no ameritan severidad propia)

- El `title` del layout raíz está en inglés ("Exclusive Streetwear & Sneakers") pese a que el sitio es `lang="es-MX"` y la audiencia es mexicana — cosmético, lo menciono porque se toca de todos modos al arreglar el hallazgo #5.
- Sold-out: hoy un producto agotado se sigue sirviendo en su URL normal con `availability: OutOfStock` en el JSON-LD — es el comportamiento que Google recomienda (no lo cambies a 404 solo por agotarse). Un producto **eliminado/oculto por el admin** sí cae en 404 real. No encontré un caso de "redirect" mal usado — no hay ningún redirect de producto en el proyecto hoy.

## Archivos tocados

**Nuevos:** `src/lib/site-url.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`, este documento.
**Modificados:** `src/app/(routes)/product/[handle]/page.tsx` (`generateMetadata`, breadcrumb JSON-LD, `cache()` del fetch), `src/app/(routes)/profile/[username]/page.tsx` (`noindex`), `src/app/(routes)/layout.tsx` (`metadataBase`, Open Graph, Organization JSON-LD, título en español), `src/lib/saas-config.ts` (`instagramUrl` centralizado).

Nada tocó `main` ni se desplegó — todo vive en `audit/fase-4-seo`, verificado con `tsc --noEmit`, `next build` y smoke tests reales. Lista para Fase 5 (Analítica) cuando digas.
