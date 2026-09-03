# Auditoría Integral — LAMK Essential Evolution

**Fecha:** 2026-09-02
**Rama:** `feature/social-qr-follow-vault`
**Commit:** `41f4599`
**Desplegado en:** producción (`lamk.vercel.app`), desde esta rama
**Alcance:** seguridad y sesiones, persistencia serverless, webhook transaccional
de Shopify, experiencia "Closet Digital", motion, y auditoría de secretos/pruebas.

---

## 1. Resumen en una página

Se ejecutaron las cuatro fases del brief. De los puntos que venían en el encargo,
**uno resultó no ser un problema real** (los atributos de la cookie de admin ya
estaban correctos desde la Fase 1) y **el resto sí**, más **cinco hallazgos que no
estaban en el brief** y que salieron al verificar en vez de asumir.

| | |
|---|---|
| Archivos tocados | 259 (`+8,236 / −665`) |
| Tablas nuevas en Postgres | 7 (6 de stores + columnas en `vault_items` y `product_events`) |
| Pruebas | 59 en 9 archivos → **117 en 13 archivos** |
| Build | `next build` limpio, cero errores de TypeScript |
| Secretos en el bundle del cliente | 0 |
| Deuda técnica cerrada | #2 (`mock-users.ts`) y #3 (webhook) de `CLAUDE.md` |

**Lo más importante que salió de aquí:** tres sistemas que se veían completos en el
código estaban muertos o eran incorrectos en producción — la analítica (bloqueada por
la CSP), el número de serie de cada pieza (cambiaba solo), y la verificación de
teléfono antes de pagar (devuelve el código en la respuesta). Ninguno de los tres
estaba en el encargo.

---

## 2. Lo que se verificó y resultó estar bien

Vale documentarlo con el mismo cuidado que los hallazgos: parte del trabajo de una
auditoría es descartar, y saber qué NO hay que volver a tocar ahorra la siguiente
ronda.

### 2.1 La cookie de sesión de admin ya era correcta

El encargo pedía configurarla con `path:'/'`, `SameSite:'Lax'`, `HttpOnly` y
`Secure` en producción. **Los cuatro atributos ya estaban puestos desde la Fase 1.**

Verificación hecha, no supuesta — trazado de cookies contra dev y contra producción:

```
Set-Cookie: lamk_admin_session=...; Path=/; Expires=...; Max-Age=43200;
            Secure; HttpOnly; SameSite=lax
GET /admin  con esa cookie → 200   (dev y producción)
GET /admin  sin cookie      → 307 → /admin/login?redirect=%2Fadmin
GET /api/admin/leads sin cookie → 401
```

También se reprodujo el recorrido completo en un navegador real (login → panel
operativo → volver al Panel de Mando con el link "← Panel de Mando"): la sesión
**no** se pierde. El bucle reportado no ocurre por los atributos de la cookie.

### 2.2 El Collector Pass ya estaba completo

Generación y revocación del token QR, modo presentación de alto contraste y
exportación de tarjeta vertical 1080×1920 para Stories: los tres existen y funcionan
(`/vault/pass`, `PassManager.tsx`, `api/vault/pass/story-image`). No se tocó nada.

### 2.3 Haptic feedback, parcialmente presente

Ya estaba en añadir al carrito (`ProductCard`, `ProductDetail`, `CrossSellModule`)
y en subir de rango (`CollectorVault`). **Faltaba el de escanear un QR** — que es
justo donde más falta hace, porque la persona está apuntando la cámara y no viendo
la pantalla. Se agregó.

### 2.4 Sin secretos en el bundle del cliente

Se escaneó `.next/static/` contra los valores reales de `ADMIN_PASSWORD`,
`ADMIN_SESSION_SECRET`, `DATABASE_URL`, `LINKED_ACCOUNT_ENCRYPTION_KEY` y
`NEXTAUTH_SECRET`, más los patrones `shpat_`, `shpss_` y `sk-…`. **Cero coincidencias.**
Las únicas dos variables `NEXT_PUBLIC_` del proyecto son el dominio de la tienda y el
Storefront Access Token, que es público por diseño en Shopify — y ni siquiera ese
terminó en el bundle, porque en la práctica solo se usa del lado servidor.

---

## 3. Hallazgos

Severidad: **Alta** = afecta datos, dinero o privacidad reales hoy · **Media** = un
sistema construido no cumple su función · **Baja** = calidad, no consecuencia directa.

### H-01 · Alta · Vercel Analytics nunca envió un solo evento

**Encontrado en:** una línea roja en la consola del navegador, no leyendo código.

La CSP introducida en la Fase 1 dejaba `script-src` en `'self'`. El navegador
rechazaba el loader de Vercel Analytics:

```
Refused to load the script 'https://va.vercel-scripts.com/v1/script.debug.js'
because it violates the following Content Security Policy directive:
"script-src 'self' 'unsafe-inline'"
```

Consecuencia: **todo lo que la Fase 5 dejó instrumentado** —el embudo de compra, los
clics de carrusel por posición, las búsquedas— llevaba desde su instalación sin
registrar nada. El código de analítica se veía completo y correcto; simplemente
nunca llegó a ejecutarse.

**Corregido:** se abrieron los dos hosts que usa y nada más — `va.vercel-scripts.com`
en `script-src` y `vitals.vercel-insights.com` en `connect-src`.

> **Lección:** instrumentar analítica y no verificar **en el navegador** que el script
> carga deja un sistema que se ve completo en el repositorio y está muerto en producción.

### H-02 · Alta · El número de serie de cada pieza cambiaba solo

`getCustomerProfile()` calculaba el serial al vuelo a partir de la **posición** de la
pieza en el arreglo de pedidos (`#${idx+1}/${total}`). Es decir: cada compra nueva
le reasignaba el número de serie a piezas que el cliente ya tenía.

Un número de serie que cambia no es un número de serie — y es la pieza sobre la que
descansa toda la promesa de autenticidad de la Bóveda y del Collector Pass.

**Corregido:** el serial se asigna **una sola vez, en el momento en que el pedido se
paga** (webhook `orders/paid`) y se guarda en `vault_items.serial_number`. Formato
`#LK-007/26` = séptima unidad de ESE modelo registrada en LAMK, en 2026. Las piezas
compradas antes del webhook conservan el posicional como respaldo.

Dos decisiones dentro de esto:

- **La secuencia es por producto, no global.** Para un coleccionista significa algo
  ser el #007 de un par concreto; ser el #4821 de la tienda entera, no.
- **El sufijo es el año, no el total de la edición.** No sabemos cuántas unidades
  existen de nada (Shopify no lo dice), y un denominador que crece con cada venta
  reintroduce exactamente el defecto que este campo viene a corregir.
- **Se calcula dentro del `INSERT`** (subconsulta), no en Node: con dos compras
  simultáneas del mismo par, leer-y-luego-escribir le daría el mismo número a ambas.

### H-03 · Alta · El reintento del webhook inflaba el Índice

**Encontrado probando, no leyendo.** La primera versión del webhook pasaba la prueba
de firma y la de "no duplicar piezas en la bóveda", pero al reenviar el mismo pedido
volvía a registrar sus ventas:

```
3. firma VÁLIDA  → 200 {"vaultItemsCreated":1,"salesRecorded":2}
4. REINTENTO     → 200 {"vaultItemsCreated":0,"salesRecorded":2}   ← mal
```

Shopify reintenta un webhook **hasta 19 veces en 48 horas** si no recibe un 200. Sin
esto, un solo pedido podía contarse como veinte ventas y el término de velocidad del
Índice se inflaría solo, sin que se hubiera vendido nada más.

**Corregido:** idempotencia en dos capas —índice único `(order_id, product_id,
customer_id)` en `vault_items` para las piezas, y una columna `dedupe_key` en
`product_events` (`<pedido>#<producto>#<unidad>`) para las ventas. Verificado:

```
4. REINTENTO     → 200 {"vaultItemsCreated":0,"salesRecorded":0}   ← correcto
```

### H-04 · Alta · Siete rutas de API iban a devolver `{}` en producción

Al migrar los cinco stores a Postgres, sus funciones pasaron de síncronas a `async`.
Siete rutas quedaron serializando Promises sin `await`:

```ts
return NextResponse.json({ leads: getLeads() });   // Promise, no arreglo
```

**TypeScript no lo detecta** porque `NextResponse.json()` acepta `any`. El
type-check pasaba limpio y el panel de admin habría mostrado listas vacías —
indistinguible de "todavía no hay nada".

**Corregido:** las siete rutas (`admin/leads`, `admin/layaway`, `admin/sales`,
`admin/hidden-products`, `admin/product-drafts`, `admin/inventory`, `reviews`) más
`admin/customers`, `catalog-source` y `SocialProofSection`.

> **Lección:** cuando algo se vuelve `async`, hay que revisar TODAS sus llamadas a
> mano. Aquí el compilador no ayuda.

### H-05 · Alta · Los cinco stores en filesystem

Ya estaba documentado como deuda técnica #1, pero conviene dejar clara la
consecuencia: el filesystem de una función serverless de Vercel es efímero y no se
comparte entre instancias. Cada **venta en piso, apartado, lead de TENISIN y reseña**
podía desaparecer sin dejar rastro ni error — el `catch` de los stores viejos
escribía a consola y devolvía `[]`, que desde la UI se lee igual que "no hay nada".

El caso más grave era **ocultar un producto**: al perderse el archivo, los productos
que el admin había desactivado volvían a aparecer solos en el catálogo público.

**Corregido:** migración completa a Postgres (ver §4.2).

### H-06 · Media · Checkout y búsqueda social sin rate limiting

De los cuatro caminos críticos del encargo, **dos no tenían tope**:

- **`/api/cart/checkout`** — cada llamada crea un carrito REAL en Shopify vía
  Storefront API. Sin límite, una sola IP puede quemar la cuota de API de la tienda
  y dejar sin poder pagar a los clientes reales. → **20 / 10 min**.
- **`/api/social/profile/[username]`** — responde por username, así que sin tope es
  una máquina de **enumerar handles**: se le disparan miles de nombres y los 404
  contra los 200 dibujan la lista de quién tiene cuenta en LAMK. El archivo ya
  cuidaba no delatar la diferencia entre "no existe" y "es privado" (mismo 404 para
  ambos); el límite es la otra mitad de esa misma protección, porque sin él basta
  con preguntar suficientes veces. → **60 / 5 min**.

OTP y login ya estaban cubiertos desde la Fase 1.

### H-07 · Media · La verificación de teléfono antes de pagar es decorativa hoy

Sin `WHATSAPP_API_TOKEN` configurado —que es el estado actual en producción—
`/api/otp` responde con el código **en el cuerpo de la respuesta**:

```json
{ "success": true, "message": "Código enviado (Modo Desarrollo Simulado)",
  "ticket": "...", "devCode": "482913" }
```

Cualquiera que abra las herramientas de red puede leer el código y "verificar"
cualquier número de teléfono. La verificación en sí es real del lado servidor (ticket
firmado, no comparación en el navegador), pero el secreto se está entregando.

**No se corrigió, y es deliberado:** quitar `devCode` hoy dejaría a **todos** los
clientes sin poder completar el checkout, porque no hay forma real de enviarles el
código. El propio código lo documenta como una decisión consciente. La corrección
real es configurar las credenciales de WhatsApp (ver P1-2).

### H-08 · Media · Dos bugs de hidratación con `prefers-reduced-motion`

Estaban documentados en `CLAUDE.md` como preexistentes, sin corregir.

- **`ScrollMacroBackground.tsx`** — pasaba `useReducedMotion()` directo a los rangos
  de `useTransform`. Como ese hook devuelve `null` en el servidor y el valor real en
  el cliente, el `style` inicial no coincidía ("Prop `style` did not match").
- **`coverflow-carousel.tsx`** — decidía qué renderizar leyendo la preferencia en el
  JSX. Un desajuste de **estructura** (no solo de estilo) hace que React tire la
  hidratación de la **página entera**.

Ambos solo se manifiestan para quien tiene la preferencia activada — que en Windows 11
es mucha más gente de la que uno cree (fue la causa del reporte "la animación del
tenis dejó de funcionar" de la ronda anterior).

**Corregido** con el patrón `mounted` que ya era obligatorio en el repo: los efectos
pueden leer la media query cruda; el JSX nunca.

### H-09 · Media · La Bóveda servía imágenes de hasta 3.6 MB

La rejilla de la colección usaba `<img>` crudo apuntando al CDN de Shopify. Los PNG
del catálogo pesan **hasta 3.6 MB** y se mostraban a ~200 px. Una bóveda de 12 piezas
podía descargar más de 30 MB.

**Corregido:** `next/image` con `sizes`, igual que ya hacía el catálogo. Como efecto
secundario, esto también era la causa de que las imágenes no cargaran bajo la CSP del
sitio, que enruta las imágenes por el optimizador de Next (mismo origen).

### H-10 · Baja · `mock-users.ts` alimentaba una pantalla real

`/profile/[username]` servía perfiles de coleccionistas **ficticios** mientras el
backend social real (Postgres) existía sin usarse. Deuda técnica #2.

**Corregido:** ver §4.5. Ya no queda ningún archivo del proyecto sirviendo datos
inventados a una pantalla real.

### H-11 · Baja · Funcionalidad construida y sin documentar

`api/vault/claims` + `api/admin/vault-claims` + `VaultClaimsPanel.tsx` +
`lib/vault-claims.ts` (registrar compras anteriores con aprobación de admin) existían
en el código desde el commit `6961815` pero nunca se escribieron en `CLAUDE.md`.

**Corregido:** documentado, incluida la razón de que esas piezas no reciban número de
serie ni insignia de rareza — sin pedido real detrás no se puede verificar ni escasez
ni autenticidad, así que llevan una insignia distinta ("Aprobada por admin") que no
debe confundirse con "Autenticidad verificada".

---

## 4. Cambios realizados

### 4.1 Sesión de admin — sliding window

El hueco real no eran los atributos de la cookie (§2.1) sino la **duración**: la
sesión valía 12 horas **desde que se emitió**, no desde el último uso. Quien abre el
panel en la mañana y sigue capturando en la tarde es expulsado a media tarea — y
visto desde fuera eso se lee exactamente como "se perdió la sesión al navegar".

- `shouldRefreshAdminSession()` + refresco en `middleware.ts`: cada request de admin
  que rebasó la hora re-firma el token con `issuedAt` nuevo.
- **El rol se re-firma tal cual venía.** Este camino nunca puede elevar de `staff` a
  `admin`; solo extender lo que ya se había otorgado.
- **Se refresca cada hora, no en cada request.** Esto corre en TODAS las rutas de
  `/admin` y `/api/admin`: reescribir `Set-Cookie` en cada una haría que ninguna
  respuesta del panel se pudiera cachear.
- Los atributos de la cookie se unificaron en `adminSessionCookieOptions()`
  (`lib/session.ts`), usada por login, logout y middleware. Estaban **copiados en dos
  archivos**: basta que una copia cambie `path` para que el logout deje viva una
  cookie que el middleware ya no encuentra — que es, literalmente, cómo una sesión
  "se pierde" sin que nadie entienda por qué.

**Pruebas nuevas:** 5 (umbral de refresco, conservación del rol, atributos de cookie).

### 4.2 Persistencia — seis tablas nuevas

`data/*.json` + `fs.writeFileSync` desaparecieron del proyecto.

| Tabla | Reemplaza a |
|---|---|
| `offline_sales` | `data/offline-sales.json` |
| `layaway_reservations` | `data/layaway.json` |
| `product_demand_requests` | `data/leads.json` |
| `verified_reviews` | `data/reviews.json` |
| `hidden_products` | `data/hidden-products.json` |
| `product_drafts` | `data/product-drafts.json` |

Decisiones que no son de estilo:

- **Dinero en `numeric(12,2)`, nunca `float`.** Drizzle devuelve `numeric` como
  string y cada store lo convierte a `number` en la frontera, así que
  `src/types/admin.ts` no cambió para ningún consumidor.
- **`paymentNotes` en `jsonb` con append atómico** — la concatenación ocurre dentro
  del `UPDATE` (operador `||` de Postgres), no leyendo-modificando-escribiendo desde
  Node. Así dos abonos capturados casi al mismo tiempo no se pisan.
- **`updateLead` y `updateLayaway` ya no hacen spread del patch completo.** Ahora es
  una lista explícita de campos; antes, cualquier cosa que llegara en el body del
  request se escribía tal cual en el registro.
- **Las dos ventas de ejemplo del store viejo no se migraron** ("Carlos Mendoza",
  "Sofía Guerrero"). Eran datos inventados, y la regla del repo es no simular
  contenido: una tabla vacía se muestra vacía.

**Verificado con datos reales:** alta de lead, alta de apartado, dos abonos
consecutivos (ambos conservados, en orden), y borrado. Los datos de prueba se
eliminaron de la base al terminar.

### 4.3 Webhook `orders/paid` — deuda técnica #3 cerrada

Archivos: `api/webhooks/shopify/orders-paid/route.ts`, `lib/shopify/webhook.ts`,
`lib/vault-purchase.ts`.

**Firma.** HMAC-SHA256 sobre el **cuerpo crudo** (`request.text()` — reserializar el
JSON cambia espacios y orden de llaves, y la firma deja de coincidir), comparación en
tiempo constante (`timingSafeEqual`), y **fail-closed**: sin `SHOPIFY_WEBHOOK_SECRET`
responde 503 y no procesa nada, ni en desarrollo.

**Verificación end-to-end** contra el servidor, con firmas reales:

| Caso | Esperado | Obtenido |
|---|---|---|
| Firma inválida | 401 | 401 |
| Sin cabecera de firma | 401 | 401 |
| Firma válida | 200, siembra pieza y ventas | 200, 1 pieza / 2 ventas |
| Reintento del mismo pedido | 200, sin duplicar nada | 200, 0 piezas / 0 ventas |
| Sin secreto configurado (producción) | 503 | 503 |

**Códigos de respuesta, elegidos a propósito:**

- **500** ante un error de base de datos → que Shopify reintente; la escritura es
  idempotente, así que un reintento no duplica nada y sí recupera una caída pasajera.
- **200** ante un cuerpo firmado pero ilegible → reintentar 19 veces algo que nunca
  va a funcionar no ayuda a nadie; se registra y se cierra.

**El XP se calcula pero no se guarda.** El XP de una pieza es su precio disfrazado, y
`vault_items` alimenta bóvedas **públicas** — la Fase 2 (sección 1.2) decidió que esa
tabla no tenga columnas de precio ni valor justamente para que no puedan filtrarse.
El XP del cliente se sigue derivando en vivo de sus pedidos con la misma
`calculateHypeXp()`, así que el número no se contradice; aquí se calcula solo para
dejarlo en el log y poder auditar cuánto rindió un pedido.

**El Índice ya no está capado en 80.** Con señal real de venta, el término de
velocidad (20 %) dejó de estar reservado en 0. Los cuatro términos tienen fuente y el
score puede llegar a 100. Cap de 10 ventas en 30 días — ventana más larga que las
demás señales a propósito: una venta es un evento mucho más raro que una vista, y en
7 días casi cualquier producto daría 0 por falta de ventana, no por falta de demanda.

### 4.4 La Bóveda como "Closet Digital"

`components/vault/VaultZones.tsx`, aplicado en `/vault` **y** `/vault/[handle]` —
la misma pieza en ambas, para que un coleccionista reconozca el mismo closet cuando
visita el de alguien más.

| Zona | Arquitectura |
|---|---|
| **A · Sneaker Vault** | Pedestal de museo: canto superior iluminado, cuerpo de piedra con volumen, sombra proyectada sobre el piso |
| **B · Apparel Wardrobe** | Un solo riel metálico cruzando la sala, con gancho por prenda (no un poste por pieza) |
| **C · Luxury Vitrine** | Marco de oro apagado, terciopelo vino, cristal ahumado en dos capas: tinte + reflejo diagonal |

**La restricción que mandó sobre todo el diseño.** Las fotos de Shopify vienen del
mismo pipeline de estudio: producto sobre fondo gris, **sin canal alfa** — lo mismo
que obligó a que la banda del carrusel de la home fuera clara. Un tenis no puede
"flotar" sobre un pedestal oscuro: se vería el recuadro gris de su propia foto.

La solución es la del museo real, no la del recorte: **sala oscura, nicho iluminado**.
El nicho es claro (dentro del rango tonal medido de las fotos, con viñeta radial que
se come la orilla) y la arquitectura de alrededor es oscura. Leído junto, es
exactamente una vitrina iluminada en un cuarto oscuro — y no hace falta recortar 265
fondos que además cambian según el Hype.

**El reparto en zonas no tiene tabla propia.** `lib/vault-zones.ts` usa
`mapCategory()`, que se extrajo de `lib/shopify/index.ts` (código de servidor) a
`lib/product-category.ts` para poder compartirla con un componente de cliente. Con
dos tablas, el día que Shopify devuelva un `productType` nuevo la misma gorra saldría
en Accesorios en el catálogo y en otra zona en la Bóveda. Un `productType`
desconocido cae en la vitrina, **nunca en Sneakers**: meterlo ahí sería afirmar que
es calzado sin saberlo.

**Placa cromada por pieza:** número de serie, año y sello de autenticidad. El año es
de **adquisición**, no de lanzamiento — Shopify no guarda cuándo salió al mercado un
modelo, y `publishedAt` es cuándo LAMK lo publicó en su tienda; etiquetar eso como
"lanzamiento" sería inventar un dato. El sello distingue una pieza que vino de un
pedido pagado ("Autenticidad verificada") de una declarada a mano y aprobada por un
admin ("Aprobada por admin"): no significan lo mismo y no deben verse igual.

**Un error propio, corregido en la revisión visual:** las zonas usaban `whileInView`,
así que la Zona C —la última— nacía debajo del pliegue y se quedaba en `opacity: 0`
hasta que alguien scrolleara. Se unificó con `animate="show"`, que es lo que ya usa
el resto de la Bóveda.

**Pruebas nuevas:** 11 (reparto por categoría, ninguna pieza perdida ni duplicada,
zonas vacías ocultas, orden A→B→C, año de adquisición).

### 4.5 `/profile/[username]` → redirección, y muerte de `mock-users.ts`

En vez de "conectarla a Postgres" como una segunda vista, `/profile/[username]` ahora
hace `permanentRedirect` (308) a `/vault/@usuario`.

**Por qué.** El perfil público real ya existe en `/vault/[handle]`, y ahí no solo se
leen datos: se aplica el modelo de privacidad completo de la Fase 2 —visibilidad
público/seguidores/privado según la relación real con quien visita, bloqueos en
ambos sentidos, reglas para cuentas de menores, y la vista forzadamente conservadora
cuando la visita viene de un QR escaneado.

Reimplementar todo eso en `/profile` para que se viera "igual pero con datos reales"
significaría **dos superficies distintas obligadas a aplicar las mismas reglas de
privacidad** — y el día que una cambie y la otra no, la que se quede atrás filtra la
bóveda de alguien. Una sola implementación es la única forma de que eso no pueda
pasar.

Se conserva el `noindex`: la URL vieja pudo quedar en el índice de algún buscador y
no debe volver a entrar.

### 4.6 Motion y haptics

- **Suavizado exponencial unificado en `0.16`** (`restante × 0.16` por frame) en la
  secuencia de despiece. El resultado se pinta directo al `<canvas>` dentro del propio
  `requestAnimationFrame`; nunca pasa por estado de React, así que ni un solo frame
  provoca un re-render. El carrusel de la home ya usaba valores de movimiento de
  framer-motion, que también viven fuera del ciclo de render de React.
- **Los dos bugs de hidratación** de H-08, corregidos.
- **Haptic al escanear un QR** (`haptics.success()`), que era el único de los tres
  casos del encargo que faltaba.

### 4.7 Modal de bienvenida

`components/ui/WelcomeModal.tsx`. TENISIN festejando a la izquierda, beneficios y CTA
a la derecha; estructura tomada de la referencia que trajo el cliente.

**La animación se forma desde las esquinas,** en tres tiempos: cuatro escuadras de
encuadre entran desde fuera de la pantalla, cada una por su diagonal, y se clavan en
las cuatro esquinas del modal; el panel se abre entre ellas con un `clip-path` que
crece desde el centro; el contenido entra en cascada.

Cuatro decisiones de comportamiento:

1. **No se le muestra a quien ya inició sesión** — el modal invita a hacerse miembro.
2. **No aparece encima del banner de privacidad.** Ese banner es una obligación legal
   y tiene que poder contestarse; taparlo con una promoción sería exactamente el
   patrón oscuro que el propio aviso dice no practicar. La primera versión sí se
   encimaba: la condición real del banner son **dos** decisiones (`noticeSeen &&
   analyticsDecided`) y solo se estaba mirando la primera. Se corrigió reusando
   `getAnalyticsConsent()` en vez de leer otra clave a mano.
3. **Una vez por sesión** (`sessionStorage`, no `localStorage`): reaparecer en cada
   carga es hostil; no volver nunca lo hace inútil para quien regresa otro día.
4. **Accesible:** Escape cierra, el foco va al botón de cerrar al abrir, y con
   `prefers-reduced-motion` no hay escuadras ni apertura — el modal simplemente
   aparece.

**La imagen es `tenisin-happy.webp`, la que ya existía en el proyecto.** Se intentó
generar una ilustración nueva en el estilo del personaje y **la cuenta de Higgsfield
está sin créditos**. La que se usó es la pose de celebración del mismo set, así que
el resultado es coherente, pero conviene saber que no es un asset nuevo.

**El copy no promete nada que el sitio no haga hoy:** los tres beneficios son la
Bóveda real, el número de serie que asigna el webhook, y el Collector Pass con QR.

---

## 5. Áreas de mejora, por prioridad

### P0 — Bloquean funcionalidad ya construida y pagada

Nada de esto requiere escribir código. Es configuración pendiente, y hasta que se
haga hay sistemas terminados que no hacen nada.

#### P0-1 · Dar de alta el webhook en Shopify

**Sin esto:** ninguna compra siembra piezas en la Bóveda, ningún cliente recibe
número de serie, y el término de velocidad del Índice sigue en 0. El endpoint
responde 503 (verificado en producción). Todo el código está listo y probado.

```
Shopify Admin › Configuración › Notificaciones › Webhooks
  Evento:  Pedido pagado (orders/paid)
  Formato: JSON
  URL:     https://lamk.vercel.app/api/webhooks/shopify/orders-paid
```

Después, copiar el secreto de firma que muestra Shopify a la variable
`SHOPIFY_WEBHOOK_SECRET` en Vercel (Production).

**Esfuerzo:** 10 minutos. **Responsable:** Dante.

#### P0-2 · Credenciales de la Admin API de Shopify

Falta `SHOPIFY_ADMIN_API_ACCESS_TOKEN` (+ `SHOPIFY_ADMIN_API_STORE_DOMAIN`), con el
scope `read_products` y el permiso **"View product costs"**.

**Sin esto se degradan a "—":** margen bruto, capital inmovilizado, días de
inventario, la proyección a 30 días de `/admin/finanzas`, y el tier en perfiles
públicos. El panel de finanzas de la Fase D está construido y funcionando a medias
por falta de permisos, no de código.

**Esfuerzo:** 20 minutos en el Admin de Shopify. **Responsable:** Dante.

### P1 — Riesgo real de seguridad o de datos

#### P1-1 · Actualizar Next.js (3 vulnerabilidades high)

`npm audit`: **7 vulnerabilidades (4 moderate, 3 high)**. Las tres high vienen de
`next` y de `postcss` anidado bajo él. El fix disponible instala `next@16.3.4`, que
es un **cambio de versión mayor y breaking**.

Requiere planear la migración (App Router cambió entre 14 y 16), no ejecutarse con
`npm audit fix --force`. Es la deuda técnica más cara del proyecto y la que más
tiempo lleva acumulándose.

**Esfuerzo:** 1–2 días, con revisión completa del sitio después.

#### P1-2 · Configurar WhatsApp (Meta) — cierra H-07

Mientras no existan `WHATSAPP_API_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`, la
verificación de teléfono antes de pagar entrega el código en la respuesta y por lo
tanto no verifica nada. La corrección es configurar las credenciales; una vez hechas,
**eliminar `devCode` de `api/otp/route.ts`** y añadir una prueba de regresión que
falle si alguien lo vuelve a introducir.

**Esfuerzo:** medio día (alta en Meta Business + prueba end-to-end).

#### P1-3 · Rate limiting distribuido

`lib/rate-limit.ts` vive en memoria por instancia: se resetea en cada cold start y no
se comparte entre instancias. Funciona hoy —cierra el hueco de "intentos
ilimitados"— pero bajo tráfico real o un ataque distribuido no da la garantía que
aparenta. Siguiente paso natural: Vercel KV o Upstash Redis, sin cambiar la interfaz
de `checkRateLimit()`.

**Esfuerzo:** medio día.

#### P1-4 · CSP con nonces

`script-src` y `style-src` siguen con `'unsafe-inline'`. Es defensa en profundidad
degradada: si algún día entra un XSS, la política no lo contiene. Requiere generar el
nonce en `middleware.ts` y propagarlo a cada request. Ahora que el middleware ya se
tocó para el sliding window, el siguiente cambio ahí es más barato que antes.

**Esfuerzo:** 1 día.

#### P1-5 · Sin token CSRF explícito

Las mutaciones dependen solo de `sameSite: 'lax'` en las cookies. Es una protección
real contra el caso común, pero no cubre todos los vectores (por ejemplo, navegación
de nivel superior con `GET` que dispare efectos, o un `POST` desde un subdominio
comprometido).

**Esfuerzo:** medio día.

### P2 — Funcionalidad incompleta

#### P2-1 · Probar el login social end-to-end

El puente NextAuth ↔ Shopify está construido y con pruebas unitarias (incluido el
cifrado de la contraseña puente), pero **nadie ha completado un login real** — faltan
credenciales de Google Cloud Console y Apple Developer. Probar especialmente dentro
del navegador in-app de Instagram, que es el caso que motivó la función.

#### P2-2 · Comparación entre coleccionistas y directorio público (C.3)

Sin construir: "tu índice vs el suyo", "piezas en común", "él tiene, tú no", y el
directorio público ordenable por índice. Es la pieza que convierte la Bóveda de un
objeto personal en algo social. Ahora que `/vault/[handle]` es la única superficie
de perfil público, tiene un solo lugar donde vivir.

#### P2-3 · Bitácora de auditoría del admin (D.7)

No se construyó porque el panel todavía no tiene ninguna función de editar precios o
inventario que auditar. Se vuelve necesaria en cuanto exista la primera.

#### P2-4 · Ficha 360° del cliente y cohortes de retención (D.5 parcial)

La segmentación RFM está completa y probada; faltan las cohortes de retención, la
afinidad de categoría y la ficha individual del cliente.

#### P2-5 · Fusionar la rama a `main`

**Producción sirve hoy `feature/social-qr-follow-vault`, no `main`.** Fue una
decisión consciente al desplegar, pero deja el historial dividido: `main` ya no
refleja lo que está en vivo. Conviene fusionar pronto para que vuelvan a coincidir,
antes de que la divergencia crezca.

### P3 — Calidad y mantenimiento

- **`generateStaticParams()` sin usar en `/product/[handle]`.** Cada handle se
  resuelve dinámicamente (con `revalidate = 60`). Es una decisión correcta con un
  catálogo vivo, pero significa que no hay páginas de producto pre-generadas.
- **Código muerto:** `coverflow-carousel.tsx` y `CustomCursor.tsx` ya no se montan en
  ningún lado. Se conservan por convención del repo; conviene decidir si se borran.
- **`api/image-pipeline` es un stub** — recibe una URL de imagen y la devuelve tal
  cual, simulando remoción de fondo. No hace nada.
- **`tsconfig.tsbuildinfo` está versionado en git.** Es un artefacto de build y
  genera ruido en cada diff; debería ir al `.gitignore`.
- **El feed de Instagram "en vivo" es un CTA al perfil real**, no un feed
  sincronizado. Es honesto y está documentado, pero sigue siendo una función a medias
  hasta que existan credenciales de Meta.

---

## 6. Estado de verificación

| Comprobación | Resultado |
|---|---|
| `npx tsc --noEmit` | Limpio |
| `npm run test` | **117 pruebas / 13 archivos**, todas pasan |
| `npm run build` | Build de producción completo, sin errores |
| Secretos en `.next/static/` | 0 coincidencias |
| Webhook: firma inválida / válida / reintento | 401 / 200 / sin duplicar |
| Stores en Postgres: alta, abonos, borrado | Correcto, montos exactos |
| `/profile/juan` en producción | 308 → `/vault/@juan` |
| `/admin` y `/vault` sin sesión | 307 → login |
| CSP en producción | Incluye `va.vercel-scripts.com` |
| Webhook en producción sin secreto | 503 (fail-closed correcto) |
| Closet Digital, modo claro y oscuro | Revisado en navegador |
| Modal de bienvenida en producción | Revisado en navegador |

**Pruebas nuevas de esta ronda:** `lib/shopify/webhook.test.ts` (6, con regresión
explícita del fail-closed), `lib/vault-zones.test.ts` (11), sliding-window y opciones
de cookie en `lib/session.test.ts` (5), término de velocidad en `lib/hype.test.ts` (4).

---

## 7. Nota de método

Tres de los hallazgos de mayor severidad —H-01 (analítica muerta), H-03 (reintento
duplicando ventas) y H-04 (rutas devolviendo `{}`)— **no se encontraron leyendo
código**. Salieron de abrir el navegador, de reenviar un webhook a propósito, y de
que el compilador no puede ver a través de un `any`.

Y el punto que venía en el encargo como bug crítico —los atributos de la cookie de
admin— **ya estaba resuelto desde hacía semanas**. Reproducirlo antes de tocarlo
evitó "arreglar" algo que funcionaba y llevó al hueco real, que era la duración de la
sesión.

La conclusión práctica para las próximas rondas: **verificar antes de corregir, y
verificar en el entorno donde el sistema realmente corre.**
