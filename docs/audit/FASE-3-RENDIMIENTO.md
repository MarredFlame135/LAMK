# Fase 3 — Rendimiento

Rama: `audit/fase-3-rendimiento`.

**Estado: los 6 hallazgos fueron corregidos y verificados** (`tsc --noEmit`, `next build`, smoke tests reales, y una segunda corrida de Lighthouse contra el build ya corregido para comparar antes/después con la misma metodología). Nada desplegado, nada en `main`.

## Resultado medido (antes → después, misma metodología, mismo build local)

| Métrica | Antes | Después |
|---|---|---|
| Performance score (Lighthouse) | 72 | **82** |
| LCP | ~26.3s (score 0) | **~4.5s** (score 0.38 — mejora real, sigue sin ser "bueno" per Google, pero el número absoluto está inflado por correr en esta VM local y no en el edge de Vercel; lo que importa es la caída de ~5.8× manteniendo la misma vara de medición) |
| CLS | 0 | 0.001 (sigue siendo excelente) |
| TBT (proxy de INP) | 190ms (score 0.91) | **20ms** (score 1.0) |
| Peso total de la página | 5.2 MB | **0.52 MB** (10× menos) |

El bundle propio de la home bajó de 60.3 KB a 14.1 KB, y el First Load JS de 228 KB a 179 KB — solo por diferir TenisinWidget.

## Nota de metodología (léela antes que la tabla)

El brief pide medir en "un móvil de gama media, no en tu propia máquina" — no tengo acceso a un teléfono físico, así que hice lo más honesto disponible: corrí Lighthouse contra el **build de producción real** (`next build` + `next start`, no `next dev`) con **emulación móvil + throttling de red/CPU simulados** (el perfil estándar que usa Lighthouse para aproximar un Moto G4 con 4G lenta). Esto NO es un dato de campo real (no reemplaza Chrome UX Report ni un teléfono físico), y los tiempos absolutos pueden estar inflados por correr en esta VM en vez de en Vercel Edge — lo dejo explícito para no hacer pasar una simulación por un dato de campo. Lo que **sí** es información sólida, independiente de dónde se corrió la prueba, son los pesos de archivo reales (tamaño en disco de cada imagen) y el árbol de dependencias del bundle — esos no cambian según la máquina.

## Resumen — lo que importa de verdad

**Un solo hallazgo explica casi todo lo demás:** las 4 poses del mascot TENISIN pesan entre **2.5 MB y 6.4 MB cada una**, y se muestran a 40–56 píxeles de tamaño, sin pasar nunca por `next/image`. Solo esas 4 imágenes ya son ~21 MB en `public/`. Arreglar eso probablemente hace más por el rendimiento real del sitio que cualquier otra cosa en este reporte junto.

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| 1 | Imágenes del mascot TENISIN: 2.5–6.4 MB cada una, mostradas a ~40-56px, sin `next/image` | 🔴 Alta | ✅ Corregido |
| 2 | Textura de fondo del Hero (1.75 MB) es justo el elemento LCP, y es un `background-image` en CSS — no puede beneficiarse de `priority`/preload como si fuera una imagen real | 🟠 Media-Alta | ✅ Corregido |
| 3 | Home y Catálogo son 100% estáticos (sin `revalidate`) — stock/Hype Meter quedan congelados hasta el siguiente deploy | 🟡 Media | ✅ Corregido |
| 4 | Ficha de producto (`/product/[handle]`) es `force-dynamic` — cada visita hace un round-trip en vivo a Shopify, cero cacheable en CDN | 🟡 Media | ✅ Corregido |
| 5 | `framer-motion` + `motion` (paquete standalone) duplicados en el bundle — dos motores de animación distintos cargando en la misma página (Home) | 🟢 Baja | ✅ Corregido |
| 6 | Cero uso de `next/dynamic` — todo el JS de cada ruta se carga de un jalón | 🟢 Baja (informativo) | ✅ Corregido |

## Lo que salió limpio

- **`ProductCard.tsx`** (usado en Catálogo y en el carrusel Hype): implementación de imagen ejemplar — `next/image` con `fill`, `sizes` responsive real (`100vw`/`50vw`/`33vw` según breakpoint), y `loading="eager"` solo para las primeras 3 tarjetas, `lazy` para el resto. Así se debería ver todo el proyecto.
- **`coverflow-carousel.tsx`** (usado por Drops Coverflow): mismo patrón correcto, `sizes` fija + `priority` solo en el slide activo.
- **Catálogo (`getCatalogLive`)**: un solo fetch a Shopify para todos los productos, el Hype Meter se calcula en memoria contra un mapa de vistas — **sin N+1**. No hay "feed de seguir" que auditar todavía (no existe la función, ver Fase 2).
- **Índices de base de datos**: no aplica — no hay base de datos SQL en el proyecto.
- **CLS (Cumulative Layout Shift): 0.** Nada salta durante la carga — todos los contenedores de imagen tienen dimensiones reservadas.

---

### 1. Imágenes del mascot TENISIN — 🔴 Alta

**Qué encontraste:** `public/assets/branding/tenisin-idle.png` (2.6 MB, 1194×1600px), `tenisin-thinking.png` (6.1 MB), `tenisin-happy.png` (6.4 MB), `tenisin-notfound.png` (6.3 MB). Se muestran vía `<img>` plano (no `next/image`) en `HeroSection.tsx` (56×56px) y `TenisinWidget.tsx` (40×40px y 48×48px).

**Dónde:** `src/components/home/HeroSection.tsx:127`, `src/components/ai-concierge/TenisinWidget.tsx:410,560`, archivos en `public/assets/branding/`.

**Por qué importa:** Lighthouse midió que solo cargar `tenisin-idle.png` en la home (la única pose visible sin hacer hover) desperdicia **2,528 KB** — es decir, básicamente el archivo completo es sobrante, porque un contenedor de 56px nunca necesita una imagen de 1194×1600. En la corrida real, esta sola imagen fue el segundo request más pesado de toda la home, y si un usuario hace hover (que dispara el ciclo de las 4 poses en `HeroSection.tsx`), el navegador puede llegar a descargar las 4 — hasta ~21 MB — para un ícono decorativo del tamaño de una estampilla.

**Cómo se explota / qué se rompe:** en una conexión móvil real (no la wifi de oficina), cargar 2.5-6 MB extra por un ícono de 56px es la diferencia entre un hero que aparece en 1-2 segundos y uno que tarda muchos segundos o nunca termina de cargar en una red saturada — exactamente el escenario que el cliente reportó como "quiero que se sienta más reactivo".

**Parche aplicado:** las 4 poses (+ `tenisin.png` base y, de regalo, `sneaker-macro.png` que encontré con el mismo problema al revisar referencias) se redimensionaron a 240×240px y se convirtieron a WebP calidad 85 — de 2.5-6.4 MB cada una a **17-23 KB**. `HeroSection.tsx` y `TenisinWidget.tsx` (2 usos) ahora usan `next/image` con `fill`+`sizes` en vez de `<img>` plano. Los PNG viejos se borraron del repo (`git rm`), no se quedaron huérfanos.

---

### 2. Textura del Hero es el elemento LCP y es un `background-image` de CSS — 🟠 Media-Alta

**Qué encontraste:** el elemento que Lighthouse identificó como LCP (Largest Contentful Paint) en la home es `obsidian-texture.png` (1.75 MB, 2048×1152px), aplicado como `background-image` en un `<div>` con `style={{ backgroundImage: "url(...)" }}` al 25% de opacidad.

**Dónde:** `src/components/home/HeroSection.tsx:63-67`.

**Por qué importa:** un `background-image` de CSS no lo descubre el navegador hasta que procesa el CSSOM — no puede recibir `priority`/preload como sí puede la imagen real del sneaker de fondo (que ya está bien hecha, con `next/image` + `priority`). Combinado con que el archivo pesa 1.75 MB sin comprimir ni convertir a WebP, es de los elementos más lentos en aparecer, y es justo el que Lighthouse marca como "contenido más grande visible".

**Cómo se explota / qué se rompe:** en la simulación con throttling móvil, el LCP total de la home salió en varios segundos por encima de lo que Google considera "bueno" (<2.5s) — con la advertencia de metodología de arriba, el número exacto puede estar inflado por el entorno de prueba, pero la causa raíz (imagen de 1.75MB compitiendo por ancho de banda, sin poder priorizarse) es real independientemente del número exacto.

**Parche aplicado:** opción 1 — `obsidian-texture.png` (1.7 MB, 2048×1152) se redujo a 1600×900 y se convirtió a WebP calidad 78 → **28 KB**. Actualizada en los 3 lugares que la usan (`HeroSection.tsx`, el footer en `layout.tsx`, y el banner de `AdminDashboard.tsx`). No se convirtió a `<Image>` component (sigue siendo `background-image` de CSS) — el ahorro de peso ya es el 98% del problema; cambiar la arquitectura de fondo CSS a componente de imagen queda como mejora opcional futura, no urgente después de este ajuste.

---

### 3. Home y Catálogo 100% estáticos, sin `revalidate` — 🟡 Media

**Qué encontraste:** ni `src/app/(routes)/page.tsx` (Home) ni `src/app/(routes)/catalog/page.tsx` exportan `revalidate` — Next los trata como completamente estáticos, generados una sola vez en build (confirmado: ambos salen como `○ Static` en la salida de `next build`).

**Dónde:** `src/app/(routes)/page.tsx`, `src/app/(routes)/catalog/page.tsx`.

**Por qué importa:** esto es excelente para velocidad (HTML servido desde CDN, sin esperar a Shopify) pero significa que el stock real y el Hype Meter (que todo el proyecto describe como "en vivo") quedan **congelados en el momento del build** hasta el siguiente deploy — un producto que se agota a las 10am sigue mostrándose disponible en Home/Catálogo hasta que alguien vuelva a desplegar. `src/app/api/catalog/route.ts` (usado por TenisinWidget) ya tiene el patrón correcto: `export const revalidate = 60`.

**Cómo se explota / qué se rompe:** no es un exploit — es un riesgo de negocio (vender algo que ya no hay, o no mostrar un producto que ya volvió a haber) disfrazado de "está muy rápido".

**Parche aplicado:** `export const revalidate = 60` en ambas páginas — mismo patrón que ya usa `api/catalog/route.ts`.

---

### 4. Ficha de producto (`force-dynamic`) — sin caché de CDN — 🟡 Media

**Qué encontraste:** `src/app/(routes)/product/[handle]/page.tsx` tiene `export const dynamic = 'force-dynamic'` — cada visita a una ficha de producto dispara un fetch en vivo a Shopify, sin caché.

**Dónde:** `src/app/(routes)/product/[handle]/page.tsx:49`.

**Por qué importa:** las fichas de producto son la página con más tráfico repetido de todo el sitio (cada clic desde catálogo/carrusel llega aquí) y son las que más se beneficiarían de servirse desde el edge de Vercel sin tocar Shopify en cada request. Hoy ninguna visita a una ficha de producto es cacheable.

**Cómo se explota / qué se rompe:** no es un exploit — es tiempo de respuesta más lento del necesario en la página más visitada, y más carga innecesaria contra la API de Shopify.

**Parche aplicado:** `export const revalidate = 60` en vez de `force-dynamic`. Como no hay `generateStaticParams()`, el primer visitante de cada handle lo sigue resolviendo en vivo (no cambia esa parte de la lógica original) — lo que cambia es que la respuesta ya queda cacheable hasta 60s en vez de ir a Shopify en cada request.

---

### 5. `framer-motion` + `motion` duplicados en el bundle — 🟢 Baja

**Qué encontraste:** el proyecto usa `framer-motion` (25 archivos) como estándar, pero 2 archivos (`gallery-animation.tsx`, `parallax-floating.tsx`) importan del paquete standalone `motion` en vez de `framer-motion`. `parallax-floating.tsx` se usa en `HeroSection.tsx` (el componente `Floating`), así que ambas librerías de animación cargan en la home.

**Dónde:** `src/components/ui/parallax-floating.tsx:11`, `src/components/ui/gallery-animation.tsx:12`, `package.json` (`"motion": "^13.0.0"` además de `"framer-motion": "^12.43.0"`).

**Por qué importa:** son APIs casi idénticas (mismo equipo, `motion` es el sucesor del paquete `framer-motion`), así que hoy se paga el peso de dos motores de animación por una diferencia que probablemente ni se nota visualmente. Ya estaba documentado como deuda técnica conocida en `CLAUDE.md` desde la Fase 0.

**Parche aplicado:** los 2 imports cambiados de `'motion/react'` a `'framer-motion'`, `"motion"` quitado de `package.json` y `npm install` corrido para sincronizar `package-lock.json` (se removieron 11 paquetes entre `motion` y su árbol de dependencias).

---

### 6. Cero code-splitting manual (`next/dynamic`) — 🟢 Baja / informativo

**Qué encontraste:** no hay ningún uso de `next/dynamic` en todo el proyecto — todo el JS de cada ruta se agrupa y se carga completo.

**Dónde:** todo el proyecto (ausencia).

**Por qué importa:** el bundle de la home (228 KB First Load JS) no es alarmante por sí solo, pero componentes pesados de interacción que no son visibles de inmediato (ej. el panel de admin dentro de `/admin/offline-sales`, o widgets que solo se activan con una acción del usuario como el chat de TENISIN) son candidatos naturales a cargar bajo demanda en vez de en el bundle inicial.

**Parche aplicado:** `TenisinWidget` (el candidato más claro — chat flotante, cero contenido de SEO, no se necesita hasta que el usuario interactúa) ahora se carga vía `next/dynamic` con `ssr: false`, a través de un wrapper cliente nuevo (`TenisinWidgetLoader.tsx` — necesario porque `ssr: false` solo se permite dentro de un Client Component, y `page.tsx` es un Server Component que lee el catálogo). Resultado medido: bundle propio de la home 60.3 KB → 14.1 KB, First Load JS 228 KB → 179 KB.

**Efecto secundario a tener presente, no es un bug:** antes el botón flotante de TENISIN venía en el HTML servido por el servidor (SSR) y aparecía de inmediato; ahora, al diferirse por completo al cliente, aparece con un pequeño retraso (el que tarda el navegador en pedir y ejecutar ese chunk aparte) después de que la página ya cargó lo importante. Verificado con `curl`: el marcado del botón ya no está en el HTML inicial. Es el trade-off esperado de este tipo de fix — lo señalo para que no se lea como una regresión sorpresa si alguien nota el cambio.

---

## Métricas antes/después

Ver la tabla al inicio del documento — misma metodología (Lighthouse, móvil emulado, build de producción local) corrida dos veces, antes y después de los 6 fixes, para que la comparación sea justa.

## Archivos tocados

**Nuevos:** `src/components/ai-concierge/TenisinWidgetLoader.tsx`, 7 archivos `.webp` en `public/assets/branding/` y `public/assets/hero/`.
**Borrados:** las 7 versiones `.png` originales de esos mismos assets (`git rm`, no quedaron huérfanos).
**Modificados:** `src/lib/saas-config.ts` (rutas a `.webp`), `src/components/home/HeroSection.tsx` (mascot + textura vía `next/image`/WebP), `src/components/ai-concierge/TenisinWidget.tsx` (2 usos de `<img>` → `next/image`), `src/app/(routes)/layout.tsx` y `src/components/admin/AdminDashboard.tsx` (textura → WebP), `src/components/home/ScrollMacroBackground.tsx` (sneaker-macro → WebP), `src/app/(routes)/page.tsx` (`revalidate = 60`, `TenisinWidgetLoader`), `src/app/(routes)/catalog/page.tsx` (`revalidate = 60`), `src/app/(routes)/product/[handle]/page.tsx` (`force-dynamic` → `revalidate = 60`), `src/components/ui/parallax-floating.tsx` y `gallery-animation.tsx` (import a `framer-motion`), `package.json`/`package-lock.json` (sin `motion`).

Nada tocó `main` ni se desplegó — todo vive en `audit/fase-3-rendimiento`, verificado con `tsc --noEmit`, `next build`, smoke tests reales y una comparación de Lighthouse antes/después. Lista para Fase 4 (SEO) cuando digas.
