# Fase 3 — Rendimiento

Rama: `audit/fase-3-rendimiento`. Solo reporte — cero cambios de código en esta fase (misma regla que las anteriores: entrego hallazgos, espero aprobación antes de tocar código).

## Nota de metodología (léela antes que la tabla)

El brief pide medir en "un móvil de gama media, no en tu propia máquina" — no tengo acceso a un teléfono físico, así que hice lo más honesto disponible: corrí Lighthouse contra el **build de producción real** (`next build` + `next start`, no `next dev`) con **emulación móvil + throttling de red/CPU simulados** (el perfil estándar que usa Lighthouse para aproximar un Moto G4 con 4G lenta). Esto NO es un dato de campo real (no reemplaza Chrome UX Report ni un teléfono físico), y los tiempos absolutos pueden estar inflados por correr en esta VM en vez de en Vercel Edge — lo dejo explícito para no hacer pasar una simulación por un dato de campo. Lo que **sí** es información sólida, independiente de dónde se corrió la prueba, son los pesos de archivo reales (tamaño en disco de cada imagen) y el árbol de dependencias del bundle — esos no cambian según la máquina.

## Resumen — lo que importa de verdad

**Un solo hallazgo explica casi todo lo demás:** las 4 poses del mascot TENISIN pesan entre **2.5 MB y 6.4 MB cada una**, y se muestran a 40–56 píxeles de tamaño, sin pasar nunca por `next/image`. Solo esas 4 imágenes ya son ~21 MB en `public/`. Arreglar eso probablemente hace más por el rendimiento real del sitio que cualquier otra cosa en este reporte junto.

| # | Hallazgo | Severidad |
|---|---|---|
| 1 | Imágenes del mascot TENISIN: 2.5–6.4 MB cada una, mostradas a ~40-56px, sin `next/image` | 🔴 Alta |
| 2 | Textura de fondo del Hero (1.75 MB) es justo el elemento LCP, y es un `background-image` en CSS — no puede beneficiarse de `priority`/preload como si fuera una imagen real | 🟠 Media-Alta |
| 3 | Home y Catálogo son 100% estáticos (sin `revalidate`) — stock/Hype Meter quedan congelados hasta el siguiente deploy | 🟡 Media |
| 4 | Ficha de producto (`/product/[handle]`) es `force-dynamic` — cada visita hace un round-trip en vivo a Shopify, cero cacheable en CDN | 🟡 Media |
| 5 | `framer-motion` + `motion` (paquete standalone) duplicados en el bundle — dos motores de animación distintos cargando en la misma página (Home) | 🟢 Baja |
| 6 | Cero uso de `next/dynamic` — todo el JS de cada ruta se carga de un jalón | 🟢 Baja (informativo) |

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

**Parche propuesto:** redimensionar y comprimir las 4 poses a algo como 160×160px (2x de su tamaño de display más grande) en WebP — debería quedar cada una por debajo de 20-30 KB, no varios MB — y servirlas con `next/image` en vez de `<img>` plano. Aplica también como regla general: cualquier imagen nueva generada con Higgsfield necesita un paso de redimensionado/compresión antes de entrar a `public/`, no se puede asumir que el archivo generado ya viene listo para producción.

---

### 2. Textura del Hero es el elemento LCP y es un `background-image` de CSS — 🟠 Media-Alta

**Qué encontraste:** el elemento que Lighthouse identificó como LCP (Largest Contentful Paint) en la home es `obsidian-texture.png` (1.75 MB, 2048×1152px), aplicado como `background-image` en un `<div>` con `style={{ backgroundImage: "url(...)" }}` al 25% de opacidad.

**Dónde:** `src/components/home/HeroSection.tsx:63-67`.

**Por qué importa:** un `background-image` de CSS no lo descubre el navegador hasta que procesa el CSSOM — no puede recibir `priority`/preload como sí puede la imagen real del sneaker de fondo (que ya está bien hecha, con `next/image` + `priority`). Combinado con que el archivo pesa 1.75 MB sin comprimir ni convertir a WebP, es de los elementos más lentos en aparecer, y es justo el que Lighthouse marca como "contenido más grande visible".

**Cómo se explota / qué se rompe:** en la simulación con throttling móvil, el LCP total de la home salió en varios segundos por encima de lo que Google considera "bueno" (<2.5s) — con la advertencia de metodología de arriba, el número exacto puede estar inflado por el entorno de prueba, pero la causa raíz (imagen de 1.75MB compitiendo por ancho de banda, sin poder priorizarse) es real independientemente del número exacto.

**Parche propuesto:** dos cambios independientes, cualquiera de los dos ayuda:
  1. Comprimir/convertir `obsidian-texture.png` a WebP (una textura abstracta a 25% de opacidad tolera compresión agresiva sin que se note).
  2. Convertirla en un `<Image fill>` con `loading="lazy"` en vez de CSS puro — así al menos entra al sistema de optimización de Next (WebP automático, tamaños responsive) aunque siga siendo decorativa.

---

### 3. Home y Catálogo 100% estáticos, sin `revalidate` — 🟡 Media

**Qué encontraste:** ni `src/app/(routes)/page.tsx` (Home) ni `src/app/(routes)/catalog/page.tsx` exportan `revalidate` — Next los trata como completamente estáticos, generados una sola vez en build (confirmado: ambos salen como `○ Static` en la salida de `next build`).

**Dónde:** `src/app/(routes)/page.tsx`, `src/app/(routes)/catalog/page.tsx`.

**Por qué importa:** esto es excelente para velocidad (HTML servido desde CDN, sin esperar a Shopify) pero significa que el stock real y el Hype Meter (que todo el proyecto describe como "en vivo") quedan **congelados en el momento del build** hasta el siguiente deploy — un producto que se agota a las 10am sigue mostrándose disponible en Home/Catálogo hasta que alguien vuelva a desplegar. `src/app/api/catalog/route.ts` (usado por TenisinWidget) ya tiene el patrón correcto: `export const revalidate = 60`.

**Cómo se explota / qué se rompe:** no es un exploit — es un riesgo de negocio (vender algo que ya no hay, o no mostrar un producto que ya volvió a haber) disfrazado de "está muy rápido".

**Parche propuesto:** agregar `export const revalidate = 60` (o el intervalo que decidan) a ambas páginas — mismo patrón que ya usa `api/catalog/route.ts`. Sigue siendo servido desde caché/CDN la mayor parte del tiempo (ISR), solo se refresca cada 60s en vez de solo en cada deploy.

---

### 4. Ficha de producto (`force-dynamic`) — sin caché de CDN — 🟡 Media

**Qué encontraste:** `src/app/(routes)/product/[handle]/page.tsx` tiene `export const dynamic = 'force-dynamic'` — cada visita a una ficha de producto dispara un fetch en vivo a Shopify, sin caché.

**Dónde:** `src/app/(routes)/product/[handle]/page.tsx:49`.

**Por qué importa:** las fichas de producto son la página con más tráfico repetido de todo el sitio (cada clic desde catálogo/carrusel llega aquí) y son las que más se beneficiarían de servirse desde el edge de Vercel sin tocar Shopify en cada request. Hoy ninguna visita a una ficha de producto es cacheable.

**Cómo se explota / qué se rompe:** no es un exploit — es tiempo de respuesta más lento del necesario en la página más visitada, y más carga innecesaria contra la API de Shopify.

**Parche propuesto:** cambiar a `export const revalidate = 60` (igual que las otras páginas) en vez de `force-dynamic` — el stock/precio pueden tener hasta 60s de desfase, que es aceptable para una ficha de producto (el checkout real siempre vuelve a validar contra Shopify de todos modos, así que nunca se vendería algo a un precio desactualizado).

---

### 5. `framer-motion` + `motion` duplicados en el bundle — 🟢 Baja

**Qué encontraste:** el proyecto usa `framer-motion` (25 archivos) como estándar, pero 2 archivos (`gallery-animation.tsx`, `parallax-floating.tsx`) importan del paquete standalone `motion` en vez de `framer-motion`. `parallax-floating.tsx` se usa en `HeroSection.tsx` (el componente `Floating`), así que ambas librerías de animación cargan en la home.

**Dónde:** `src/components/ui/parallax-floating.tsx:11`, `src/components/ui/gallery-animation.tsx:12`, `package.json` (`"motion": "^13.0.0"` además de `"framer-motion": "^12.43.0"`).

**Por qué importa:** son APIs casi idénticas (mismo equipo, `motion` es el sucesor del paquete `framer-motion`), así que hoy se paga el peso de dos motores de animación por una diferencia que probablemente ni se nota visualmente. Ya estaba documentado como deuda técnica conocida en `CLAUDE.md` desde la Fase 0.

**Parche propuesto:** cambiar los 2 imports de `'motion/react'` a `'framer-motion'` (la API es compatible en los usos actuales) y quitar `motion` de `package.json`. Cambio pequeño y de bajo riesgo.

---

### 6. Cero code-splitting manual (`next/dynamic`) — 🟢 Baja / informativo

**Qué encontraste:** no hay ningún uso de `next/dynamic` en todo el proyecto — todo el JS de cada ruta se agrupa y se carga completo.

**Dónde:** todo el proyecto (ausencia).

**Por qué importa:** el bundle de la home (228 KB First Load JS) no es alarmante por sí solo, pero componentes pesados de interacción que no son visibles de inmediato (ej. el panel de admin dentro de `/admin/offline-sales`, o widgets que solo se activan con una acción del usuario como el chat de TENISIN) son candidatos naturales a cargar bajo demanda en vez de en el bundle inicial.

**Parche propuesto:** no es urgente — lo dejo como oportunidad, no como algo que haya medido con un impacto concreto hoy. Si se retoma, el candidato más claro es el propio `TenisinWidget` (chat flotante, no se necesita hasta que el usuario lo abre).

---

## Métricas de la corrida (con el caveat de metodología de arriba)

| Métrica | Valor medido (Lighthouse, móvil emulado, build de producción local) |
|---|---|
| Performance score | 72/100 |
| LCP | ~26s (elemento: la textura de fondo del Hero — ver hallazgo #2; número probablemente inflado por el entorno de prueba, pero la causa raíz del peso de imagen es real) |
| CLS | 0 (perfecto) |
| TBT (proxy de INP en laboratorio) | 190ms (score 0.91 — bueno) |
| Peso total de la página (Home) | 5.2 MB — de los cuales ~4.3 MB son las 2 imágenes de los hallazgos #1 y #2 |

No apliqué ningún fix — quedo a la espera de tu aprobación para decidir cuáles de estos 6 se corrigen y en qué orden antes de pasar a Fase 4 (SEO).
