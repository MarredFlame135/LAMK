# Fase 1 — Auditoría de Seguridad (mentalidad atacante)

Rama: `audit/fase-1-seguridad`. Formato por hallazgo: qué encontraste · dónde · por qué importa · cómo se explota o qué se rompe · parche propuesto · severidad.

**Estado: los 5 hallazgos fueron corregidos y verificados** (`tsc --noEmit`, `next build`, y smoke tests reales contra `npm run dev`: login con rate limit disparando 429 en el 6º intento, `social-push`/`image-pipeline` devolviendo 401 sin sesión, flujo de OTP completo con ticket firmado aceptando el código correcto y rechazando uno incorrecto, headers de seguridad presentes en la respuesta real). Nada de esto se desplegó ni se subió a `main` — vive en esta rama, a la espera de que Dante decida cuándo desplegar.

## Corrección importante al hallazgo #4 (encontrada al implementar el fix)

Al construir el parche descubrí que mi reporte original subestimaba el impacto: dije que la verificación OTP era "código muerto" porque `SpecialCartDrawer.tsx` solo destructuraba `verificationStatus` sin usarlo. Al leer el archivo completo (no solo esa línea) confirmé que **sí bloqueaba el checkout de verdad** — `verifyOtpCode(otpInput)` debía devolver `true` antes de llamar a `handleGoToShopifyCheckout()`. Es decir, el bypass client-side sí era explotable contra un control real, no decorativo. Corrijo el registro aquí en vez de dejarlo como estaba — es exactamente el tipo de cosa que "no inventes hallazgos" también exige corregir cuando se descubre después.

## Tabla resumen (por severidad)

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| 1 | Secreto de sesión de admin con fallback público conocido | 🔴 Alta | ✅ Corregido |
| 2 | Sin rate limiting en login de cliente ni de admin | 🔴 Alta | ✅ Corregido |
| 3 | `/api/image-pipeline` y `/api/social-push` sin autenticación | 🔴 Alta (latente) | ✅ Corregido |
| 4 | Verificación OTP por WhatsApp 100% client-side / auto-revelada | 🟡 Media (sí bloqueaba el checkout real, ver corrección arriba) | ✅ Corregido |
| 5 | Sin headers de seguridad (CSP/HSTS/X-Content-Type-Options/Referrer-Policy) | 🟡 Media | ✅ Corregido |

---

### 1. Secreto de sesión de admin con fallback público conocido — 🔴 Alta

**Qué encontraste:** si `ADMIN_SESSION_SECRET` no está configurada, el servidor no falla — sigue funcionando usando un secreto hardcodeado en el propio código fuente.

**Dónde:** `src/lib/session.ts:26-37` (función `getSecret()`).

**Por qué importa:** ese secreto es el único mecanismo que hace infalsificable la cookie `lamk_admin_session`. Si alguna vez se te olvida configurar la variable en un entorno (un preview de Vercel, un ambiente de staging nuevo, o incluso producción por descuido), el sitio sigue "funcionando" — no hay ningún error visible — pero el secreto real es literalmente el string `'lamk-dev-only-insecure-secret-change-me'`, que ahora está publicado en el repo y en este mismo chat.

**Cómo se explota:** con ese secreto conocido, cualquiera puede construir a mano un token `payload_base64url.firma_base64url` para `{ email: "cualquiera@ejemplo.com", issuedAt: Date.now() }`, calcular el HMAC-SHA256 con el secreto público, y pegarlo como cookie `lamk_admin_session` — entra al panel de admin completo (ventas, leads, clientes, apartados, inventario) sin credenciales.

**Parche aplicado:** `getSecret()` en `src/lib/session.ts` ahora es fail-closed en producción — si `ADMIN_SESSION_SECRET` no está definida y `NODE_ENV === 'production'`, la request truena con un error explícito en vez de aceptar sesiones falsificables. En desarrollo se mantiene el fallback con advertencia (para no bloquear `npm run dev` en un clon nuevo sin `.env.local`).

---

### 2. Sin rate limiting en login de cliente ni de admin — 🔴 Alta

**Qué encontraste:** ni `/api/auth/login` ni `/api/admin/login` tienen ningún límite de intentos, bloqueo temporal ni CAPTCHA.

**Dónde:** `src/app/api/auth/login/route.ts`, `src/app/api/admin/login/route.ts`.

**Por qué importa:** el login de admin es la puerta a todos los datos de negocio (ventas reales, clientes, leads). El login de cliente protege cuentas reales de compradores.

**Cómo se explota:** credential stuffing / fuerza bruta directa contra cualquiera de los dos endpoints — sin fricción, sin alerta, sin bloqueo. Con una lista de contraseñas filtradas conocidas, un bot puede probar miles de combinaciones por minuto contra `ADMIN_EMAIL` (que además, al ser único y probablemente predecible por dominio, reduce el problema a solo adivinar la contraseña).

**Parche aplicado:** `src/lib/rate-limit.ts` (nuevo) — límite de 5 intentos / 10 min por IP+email en ambos endpoints. Es en memoria por instancia (sin agregar Redis/Upstash ni ninguna dependencia nueva, por la regla de "no dependencias pesadas sin justificar") — cierra el hueco real de "intentos infinitos sin ningún costo" de hoy, pero **no es un rate limit distribuido**: en Vercel cada instancia serverless tiene su propia memoria, así que el contador se reinicia en cada cold start y no se comparte entre instancias bajo tráfico alto concurrente. Documentado en el propio archivo. Si más adelante quieren un límite robusto de verdad, el siguiente paso natural es Vercel KV / Upstash Redis vía el marketplace de Vercel — decisión de infraestructura que dejo para acordar contigo, no la tomé unilateralmente.

---

### 3. `/api/image-pipeline` y `/api/social-push` sin autenticación — 🔴 Alta (impacto latente, hoy contenido)

**Qué encontraste:** ambos endpoints están fuera de `/api/admin/*`, así que el middleware no los protege, y ninguno de los dos handlers verifica sesión por su cuenta — pero ambos solo se usan hoy desde paneles de admin (`InventoryManager.tsx` para subir un producto nuevo, `OfflineSalesModule.tsx` para el botón "Publicar Drop en Redes").

**Dónde:** `src/app/api/image-pipeline/route.ts`, `src/app/api/social-push/route.ts`.

**Por qué importa:** hoy ambos son *stubs* (no procesan imágenes reales ni publican de verdad en Meta — `image-pipeline` regresa la misma URL o un placeholder de Unsplash; `social-push` solo arma el texto y responde `success: true` sin llamar a ninguna API externa), así que el impacto real hoy es cero. Pero el diseño ya asume que solo un admin los llama, y el día que se conecten a Photoroom/Remove.bg o a la API real de Meta Graph, cualquiera que conozca la URL — sin sesión, sin ser admin — podría:
  - Gastar cuota/dinero de una API de pago de terceros llamando `image-pipeline` en bucle.
  - Publicar contenido arbitrario en el Instagram/Facebook reales de la marca vía `social-push` (el `caption` se arma con `productTitle`/`price`/`productLink` que vienen del body sin validar — control total del texto publicado).

**Cómo se explota:** `curl -X POST https://lamk.vercel.app/api/social-push -d '{"productTitle":"...", "imageUrl":"..."}'` sin ninguna cookie — responde 200 hoy mismo (aunque no hace nada real todavía).

**Parche aplicado:** agregué la misma verificación `verifyAdminSession` al inicio de cada handler (en vez de mover las rutas bajo `/api/admin/*`, para no romper las URLs que ya llaman `InventoryManager.tsx`/`OfflineSalesModule.tsx` sin necesidad). Verificado con `curl` real: ambas rutas responden 401 sin cookie de sesión.

---

### 4. Verificación OTP por WhatsApp 100% client-side / auto-revelada — 🟡 Media

**Qué encontraste:** el código de verificación se genera en el navegador (`Math.floor(1000 + Math.random()*9000)` en `CartContext.tsx`), se guarda en estado de React, y la comparación `enteredCode === otpCode` (función `verifyOtpCode`) también corre 100% en el cliente — el servidor nunca valida nada. Además, si `WHATSAPP_API_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` no están configuradas (confirmado que hoy no lo están, ver `CLAUDE.md`), `/api/otp` regresa el propio código en el campo `devCode` de la respuesta — se lo entrega de vuelta al mismo cliente que se supone debía "demostrar" haberlo recibido por WhatsApp.

**Dónde:** `src/context/CartContext.tsx` (`triggerWhatsAppVerification`, `verifyOtpCode`), `src/app/api/otp/route.ts`.

**Por qué importa:** revisé si esto realmente bloquea algo — no lo hace: `verificationStatus` se importa en `SpecialCartDrawer.tsx` pero nunca se usa para condicionar el botón de pagar ni la llamada a `/api/cart/checkout`. Hoy es código muerto/vestigial, así que el impacto inmediato en el checkout es cero. Pero es una verificación que aparenta ser un control de seguridad y no lo es — si en el futuro alguien la conecta para bloquear compras fraudulentas o exigir teléfono real, se puede saltar sin esfuerzo.

**Cómo se explota (si se llegara a usar como gate):** inspeccionar el estado de React (React DevTools) o leer la respuesta de red de `/api/otp` da el código directamente — no hace falta ni tener acceso al teléfono.

**Parche aplicado:**
  1. `src/lib/otp.ts` (nuevo) — el código de 4 dígitos ahora se genera **en el servidor**, nunca en el navegador. Lo que viaja al cliente es un "ticket" opaco: HMAC-firmado, con el HASH del código (no el código) + el teléfono + expiración de 5 minutos — mismo patrón "firmado, sin estado" que ya usa `session.ts` para la sesión de admin, así que no hace falta una base de datos ni un store compartido entre instancias serverless. Nuevo endpoint `src/app/api/otp/verify/route.ts` hace la comparación real del lado del servidor.
  2. **`devCode` se queda** en la respuesta cuando no hay credenciales de WhatsApp configuradas — decisión deliberada, no un descuido: hoy en producción `WHATSAPP_API_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` NO están configuradas (confirmado en Fase 0), así que quitar `devCode` habría dejado a cualquier cliente real sin ninguna forma de completar el checkout — el código nunca llegaría a ningún lado. Lo que sí se cerró es el bypass real: antes, aunque se revelara o no el código, la comparación ocurría en el cliente y era falsificable sin necesitar leer nada; ahora la comparación es 100% server-side y el ticket no se puede forjar sin el secreto del servidor. Cuando configuren credenciales reales de WhatsApp, `devCode` deja de aparecer automáticamente (la condición ya es `if (!token || !phoneId)`).
  3. Rate limiting agregado tanto en `/api/otp` (3 solicitudes / 10 min por IP+teléfono) como en `/api/otp/verify` (8 intentos / 10 min, para no permitir fuerza bruta contra los 10,000 códigos posibles de un mismo ticket).

---

### 5. Sin headers de seguridad (CSP/HSTS/X-Content-Type-Options/Referrer-Policy) — 🟡 Media

**Qué encontraste:** `next.config.js` no define `headers()` — no hay Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options ni Referrer-Policy propios (más allá de lo que Vercel agregue por defecto, que es mínimo).

**Dónde:** `next.config.js` (ausencia).

**Por qué importa:** no encontré ningún vector de XSS activo hoy (revisé todo el repo: el único `dangerouslySetInnerHTML` es JSON-LD vía `JSON.stringify()`, patrón seguro) — así que esto no es una vulnerabilidad explotable *hoy*, es una capa de defensa-en-profundidad ausente. Si en el futuro se introduce cualquier XSS (por ejemplo, al conectar `image-pipeline` a un proveedor real que devuelva HTML/SVG sin sanear, o al renderizar contenido generado por usuarios sin escapar), un CSP bien configurado habría limitado el daño; sin él, no hay ningún freno.

**Cómo se explota:** no aplica un exploit concreto hoy — es ausencia de mitigación, no una vulnerabilidad activa.

**Parche aplicado:** `headers()` en `next.config.js` con CSP (permitiendo `cdn.shopify.com`/`images.unsplash.com`/`lookatmykicksmx.com`, los orígenes de imagen reales del proyecto), HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, y `X-Frame-Options: DENY` como respaldo de `frame-ancestors 'none'` para navegadores viejos. `script-src`/`style-src` necesitan `'unsafe-inline'` porque Next.js App Router inyecta scripts inline para hidratar RSC y varios componentes ya usan `style={{ backgroundImage: ... }}` para las texturas de Higgsfield — una CSP con nonces sería más estricta pero requiere generar el nonce en `middleware.ts`; queda como siguiente paso, documentado en el propio archivo. Verificado con `curl` real: los 5 headers llegan en la respuesta.

---

## Lo que salió limpio (verificado, no encontré nada)

- **Cálculo de precio/total del carrito:** `cart/checkout` solo manda `merchandiseId` + `quantity` a Shopify (`cartCreate`) — el precio lo calcula Shopify del lado servidor con el ID de variante real. El cliente no puede manipular el total.
- **Mass-assignment:** `register`/`login` desestructuran campos explícitos (`email`, `password`, `firstName`, `lastName`, `phone`) antes de pasarlos a Shopify — no hay spread del body crudo en ninguna mutación, así que no hay forma de inyectar un campo como `role` o `isAdmin`.
- **IDOR:** no encontré ningún endpoint que acepte un ID de otro usuario para leer/modificar su recurso — perfiles y productos resuelven por handle/slug público, y todo lo sensible por usuario (elegibilidad de reseña, apartados) se resuelve server-side contra la cookie de sesión, no contra un ID que mande el cliente.
- **SQL Injection:** no aplica — no hay base de datos SQL en el proyecto.
- **XSS:** un solo `dangerouslySetInnerHTML` en todo el repo (`product/[handle]/page.tsx:72`), y es JSON-LD vía `JSON.stringify()` — patrón seguro, no inyecta HTML arbitrario.
- **CORS:** no hay ningún `Access-Control-Allow-Origin` configurado — todo same-origin por default de Next.js.
- **Secretos:** `.env*` está en `.gitignore`; ninguna variable `NEXT_PUBLIC_*` expone un token privado (el Storefront token público es intencionalmente público, así funciona esa API; el Admin API token se queda server-only).
- **Webhooks:** no existe ningún endpoint de webhook todavía en el proyecto — no hay nada que auditar aquí hasta que se construya uno (relevante si en el futuro se conecta un webhook de Shopify para pedidos).

## Archivos tocados

**Nuevos:** `src/lib/rate-limit.ts`, `src/lib/otp.ts`, `src/app/api/otp/verify/route.ts`, este documento.
**Modificados:** `src/lib/session.ts` (fail-closed), `src/app/api/otp/route.ts` (código server-side), `src/context/CartContext.tsx` (ticket en vez de código en claro, `verifyOtpCode` ahora async), `src/components/cart/SpecialCartDrawer.tsx` (await del nuevo `verifyOtpCode`), `src/app/api/admin/login/route.ts` y `src/app/api/auth/login/route.ts` (rate limiting), `src/app/api/image-pipeline/route.ts` y `src/app/api/social-push/route.ts` (verificación de sesión), `next.config.js` (headers de seguridad).

Nada tocó `main` ni se desplegó — todo vive en `audit/fase-1-seguridad`, verificado con `tsc --noEmit`, `next build` y smoke tests reales. Lista para que decidas cuándo desplegar, o para pasar a Fase 2 (Privacidad de funciones sociales — diseño puro, sin código) mientras tanto.
