# Fase 2 — Privacidad de funciones sociales (QR, seguir, bóveda pública)

Rama: `audit/fase-2-privacidad`. **Solo diseño — cero código.** Ninguna de las tres funciones (compartir por QR, seguir a otros usuarios, bóveda pública) existe hoy en el repo (confirmado en Fase 0 vía grep: cero referencias a QR/follow/seguir). Este documento es la pizarra en blanco que hay que acordar antes de escribir la primera línea.

## Decisión previa (ya tomada contigo)

**¿Se permiten cuentas de menores en estas funciones?** Sí, permitidas, sin verificación dura. Mecanismo: el registro pide **fecha de nacimiento** (no un checkbox de "soy mayor de edad" — la fecha permite recalcular la edad automáticamente con el tiempo, así que un usuario de 17 años pasa a las reglas de adulto el día que cumple 18 sin que nadie tenga que hacer nada). No hay escaneo de identificación oficial ni proveedor externo de verificación — es autodeclarado, con las consecuencias de diseño que eso implica: alguien puede mentir sobre su edad. Por eso todo lo demás en este documento está pensado para que, aunque alguien mienta, el daño posible siga siendo bajo (todo nace privado por defecto, para todos, no solo para quien se declara menor).

---

## 1. Los tres problemas del brief, resueltos de raíz

### 1.1 La bóveda NO es el historial de compra

**Regla:** ninguna compra entra a la bóveda pública automáticamente. Nunca. El checkout de Shopify y la bóveda pública son dos sistemas sin conexión automática — el puente entre ambos es un acto humano deliberado, no un webhook.

**Cómo se ve en la práctica:**
- Cada producto que un cliente compró (dato que sí tenemos, vía Shopify) aparece en una sección privada tipo "Mis compras" — visible **solo para el dueño**, nunca pública, nunca con toggle de visibilidad (no es contenido social, es historial de cuenta).
- Para que una pieza aparezca en la bóveda pública, el dueño tiene que entrar a "Mis compras" (o subir una pieza que no compró aquí — alguien puede querer mostrar tenis que ya tenía) y tocar explícitamente "Agregar a mi bóveda". Un solo compra no produce ningún cambio visible a nadie más que al comprador.
- Cada pieza en la bóveda tiene su propio interruptor, no hay un "hacer pública toda mi colección" de un clic — agregar 10 piezas requiere 10 decisiones, a propósito. La fricción es la protección: reduce la bóveda a lo que alguien de verdad quiso curar, no a un volcado accidental.

### 1.2 Riesgo físico del QR — nunca se muestra lo que permite calcular vulnerabilidad

**Regla dura, sin excepción y sin toggle de usuario (no es una preferencia de privacidad, es una regla del sistema):**

- **Nunca** se muestra valor estimado de colección, ni total ni por pieza.
- **Nunca** se muestra el precio pagado por ninguna pieza (ni siquiera si el dueño quisiera presumirlo — no existe el campo en ninguna vista pública).
- **Nunca** se muestra ubicación, ciudad, colonia ni nada geolocalizable.
- **Nunca** se muestra "última vez activo/a", "en línea ahora" ni cualquier señal de presencia en tiempo real — eso es exactamente lo que permite deducir "está aquí ahora" o "no está en su casa ahora mismo".
- **Nunca** se muestra la fecha exacta en que se agregó una pieza a la bóveda con precisión de reloj (fecha aproximada tipo "hace 2 meses" está bien; "martes 14:32" no, porque cruzado con "lo until vi en la tienda el martes a esa hora" es una correlación real).

Lo único que la bóveda pública puede mostrar: foto de la pieza, modelo/nombre, marca, y opcionalmente una nota de texto libre que el dueño escriba (con el mismo riesgo que cualquier red social de texto libre — responsabilidad del dueño, no algo que el sistema pueda prevenir de raíz, pero sí se puede moderar/reportar).

### 1.3 Menores

Ver sección 4 completa — resumen: perfil privado por defecto, excluido de descubrimiento público y de generación de QR compartible hasta que el usuario confirme que es mayor de edad (recalculado automáticamente en su cumpleaños 18), bloqueo/reporte accesible directo desde el perfil, sin DM entre desconocidos.

---

## 2. Modelo de datos de privacidad — qué es visible, para quién, por defecto

Regla general que aplica a **todo** lo de esta tabla: el default siempre es el más restrictivo posible, y todo widening (hacer algo más visible) es una acción explícita del dueño, nunca un comportamiento que "simplemente pasa".

| Campo / sección | Niveles posibles | Default | Quién puede cambiarlo |
|---|---|---|---|
| Perfil completo (existencia + visibilidad general) | Público / Solo seguidores / Privado | **Privado** | Dueño, en cualquier momento |
| Nombre para mostrar + avatar | (hereda del nivel de perfil) | — | — |
| Bio / descripción | (hereda del nivel de perfil) | — | — |
| Tier/XP de gamificación | Público / Solo seguidores / Oculto | **Oculto** | Dueño |
| Bóveda (galería de piezas) | Público / Solo seguidores / Oculta | **Oculta** (sin piezas publicadas) | Dueño, y además pieza por pieza (ver 1.1) |
| Lista de "sigo a" / "me siguen" | Público / Solo seguidores / Oculta | **Oculta** | Dueño |
| Contador de seguidores (solo el número) | Público / Oculto | **Oculto** | Dueño — un número grande también es una señal de "cuenta relevante/valiosa", se trata igual que el resto |
| Compras reales (historial) | Solo el dueño, sin excepción, sin toggle | — | Nadie puede hacerlo público — no es contenido social |
| Ubicación / ciudad | No existe como campo visible en ningún perfil | — | — |
| Valor de colección / precios pagados | No existe como campo visible en ningún perfil | — | — |
| Actividad reciente / "en línea" | No se construye esta función | — | — |
| Código QR de perfil | Existe / No existe (se genera bajo demanda) | **No existe hasta que el dueño lo genera** | Dueño — genera y revoca cuando quiera (ver sección 3) |
| Mensajes directos | Abiertos a cualquiera / Solo por solicitud previa aprobada / Cerrados | **Cerrados** entre desconocidos (ver sección 5) | Dueño, dentro de los límites de la sección 5 |

**Nota sobre "Privado" vs "Solo seguidores":** privado significa que ni siquiera aparece en resultados de búsqueda/descubrimiento del sitio ni es alcanzable por URL directa salvo para el propio dueño — es el equivalente a no tener función social activada. "Solo seguidores" sí es descubrible (puede aparecer en búsqueda) pero el contenido detrás requiere que el dueño haya aprobado a quien lo sigue (ver sección 6, seguir no es automático).

---

## 3. Código QR — qué es, cómo se revoca

**Decisión de diseño (a validar contigo):** el QR no es simplemente "un código que apunta a `/profile/usuario`". Si lo fuera, "revocar el QR" no significaría nada — la URL del perfil seguiría existiendo y cualquiera que la haya visto (o la foto del QR) seguiría teniendo acceso indefinidamente, porque un QR es literalmente solo una foto de una URL.

En vez de eso: el QR codifica un **token de acceso temporal y revocable**, distinto de la URL pública del perfil. Al escanearlo, quien escanea ve una vista del perfil (respetando todo lo de la sección 2), pero el token en sí:

- Tiene fecha de expiración por default (propuesta: 24 horas — pensado para "lo muestro en un evento/tienda hoy", no para llevarlo tatuado en una playera para siempre).
- El dueño puede generar un QR de larga duración si de verdad lo quiere (ej. para ponerlo en redes sociales), pero es una elección explícita distinta al QR de "muéstraselo a la persona que tengo enfrente ahora".
- El dueño puede revocar **cualquier** token activo en cualquier momento desde su perfil, con un botón, sin explicación ni confirmación de nadie más — la próxima vez que alguien escanee ese código físico específico, ve un "este código ya no es válido", no el perfil.
- Cada token queda asociado a un contador simple de veces escaneado (sin guardar quién escaneó, solo el número) — así el dueño tiene una señal de "esto se ha usado X veces" para decidir si revocarlo, sin construir un sistema de tracking de terceros.

**Qué ve alguien que escanea un QR:** exactamente lo mismo que vería si el perfil fuera "Solo seguidores" y a esa persona se le hubiera aprobado seguir — ni más ni menos, sin importar que el dueño tenga el perfil en "Público". Es la vista más conservadora de las tres, aplicada siempre al contexto QR, porque escanear en persona (tienda/evento) es la situación de mayor riesgo físico descrita en el brief — un desconocido físicamente presente es un caso distinto a un follower que decidió seguir a alguien después de verlo en el sitio.

---

## 4. Menores — reglas concretas

- Al registrarse, se pide fecha de nacimiento. Si la cuenta corresponde a alguien menor de 18 (recalculado en cada sesión, no solo al registrarse — así el sistema "se entera" solo el día del cumpleaños):
  - El perfil nace y permanece en **Privado** — no hay forma de subirlo a "Público" ni a "Solo seguidores" mientras la cuenta sea de un menor. El control de nivel de perfil (sección 2) queda deshabilitado, no solo con un default distinto.
  - **Excluido de todo descubrimiento público**: no aparece en búsqueda de usuarios, no aparece en ningún listado, no es indexable (esto también es un requisito de la Fase 4 de SEO — noindex).
  - **No puede generar un QR compartible.** La función simplemente no está disponible en su perfil — no es que el QR generado sea más restrictivo, es que no hay botón para generarlo.
  - **Sin mensajes directos de ningún tipo con desconocidos** — ni siquiera "solo por solicitud previa" (ver sección 5); si se habilita mensajería en general, para cuentas de menores queda cerrada por completo salvo, como mucho, con cuentas que ya siguen mutuamente desde antes de que ambas partes se identifiquen como conocidas (decisión conservadora a propósito).
  - **Bloquear y reportar accesibles directamente desde el perfil de cualquier otra persona** — un botón visible en la cabecera del perfil (no dentro de un menú de "..." de tres niveles, no dentro de Configuración), disponible para cualquier usuario que visite ese perfil, sin importar si la cuenta reportada es de un menor o no. Esto no es exclusivo de proteger a menores — es una función general que además cubre el caso de menores.
- El día que la cuenta cumple 18 (según la fecha de nacimiento declarada), las restricciones se levantan automáticamente — el usuario entra a su perfil y ahora sí puede tocar los controles de la sección 2. No hace falta ninguna acción de un admin.
- **Limitación que hay que aceptar de frente:** como no hay verificación dura, alguien puede declarar una fecha de nacimiento falsa para saltarse estas reglas. La mitigación no es "impedirlo" (no es viable con los recursos de este proyecto) sino que **el sistema entero ya nace conservador para todos** (ver sección 2 — perfil privado por defecto, sin bóveda pública sin acción explícita, sin ubicación/valor en ningún caso) — así que el costo de que alguien mienta sobre su edad es menor: el peor caso no es "un menor con un perfil completamente expuesto", es "un menor con un perfil que, como el de cualquier adulto nuevo, empieza privado y solo se expone en la medida en que el propio usuario decida activarlo".

---

## 5. Seguir a otros usuarios

- Seguir a alguien **no es automático ni instantáneo por defecto** si el perfil de destino es "Solo seguidores" — es una solicitud que el dueño del perfil debe aprobar, igual que Instagram privado. Si el perfil de destino es "Público", seguir es inmediato (no hay nada que aprobar porque ya es público para cualquiera).
- El dueño de un perfil puede dejar de tener seguidores en cualquier momento (quitar a alguien de su lista de seguidores) sin que eso notifique a la otra persona ni requiera su consentimiento.
- Bloquear a alguien implica automáticamente: deja de seguirte si te seguía, no puede volver a solicitar seguirte, no puede verte en descubrimiento/búsqueda, y (si se construye mensajería) no puede escribirte.

## 6. Mensajería directa

**Propuesta:** no construir DM libre entre desconocidos en esta primera versión. Si se construye:
- Solo entre cuentas que se siguen mutuamente (ambas se siguen entre sí), o
- Un desconocido puede mandar **una** solicitud de mensaje (no una conversación abierta) que el destinatario ve por separado de sus mensajes normales y puede aceptar/rechazar/reportar sin que el remitente sepa cuál pasó.
- Para cuentas de menores: cerrado por completo salvo con cuentas que ya se siguen mutuamente desde antes (ver sección 4).

Esto es justo lo que pide el brief ("sin mensajería directa entre desconocidos, o solo por solicitud previa") — lo dejo como propuesta a aprobar, no como algo ya decidido, porque es la pieza con más superficie de abuso (acoso, spam) de las tres funciones y la que menos urgencia tiene frente a QR/vault/seguir.

## 7. Borrado de cuenta

Cuando un usuario borra su cuenta:
- El perfil social (bóveda, bio, avatar, listas de seguidores/seguidos) se borra por completo, no se archiva ni queda "desactivado pero recuperable" salvo una ventana corta de arrepentimiento (propuesta: 14 días en un estado no público antes del borrado definitivo — estándar razonable, a confirmar).
- Cualquier QR generado por esa cuenta deja de funcionar de inmediato (el token deja de resolver a nada).
- Las relaciones de "seguir" en ambas direcciones se eliminan — quien lo seguía deja de verlo en su lista de "sigo a", y viceversa.
- El historial real de compras (Shopify) **no se borra** por esto — es un sistema aparte con sus propias reglas legales/fiscales (facturación, garantías); el borrado de cuenta social no debe confundirse con el derecho ARCO sobre los datos de compra, que es un flujo distinto ya cubierto por el aviso de privacidad existente (`/aviso-de-privacidad`).

---

## 8. Qué NO se construye en esta fase

Este documento es la propuesta a acordar, no una lista de tareas ya aprobadas. Específicamente pendiente de tu aprobación antes de tocar código:

1. Si el QR debe ser de token temporal-revocable (mi recomendación, sección 3) o si prefieres algo más simple para la primera versión, aceptando que "revocar" entonces sea más simbólico.
2. Si se construye mensajería directa en esta ronda o se pospone (sección 6) — es la pieza de mayor superficie de abuso y no es estrictamente necesaria para que QR/seguir/bóveda funcionen.
3. La ventana de arrepentimiento de 14 días al borrar cuenta (sección 7) — número a confirmar, no es un estándar legal obligatorio aquí, es una propuesta de producto.
4. Qué pasa con un usuario que ya tenía compras "públicas" bajo el sistema viejo de `mock-users.ts` (perfiles ficticios usados hoy en `/profile/[username]`) — ese archivo tendría que jubilarse o convertirse en la base real de este sistema; lo dejo para decidir cuando se apruebe este diseño, porque toca código existente y esta fase es solo diseño.

No escribí ni un archivo de código en esta fase — solo este documento. A la espera de tu aprobación (total, parcial, o con cambios) antes de pasar a Fase 3 (Rendimiento) o de empezar a construir esto.
