# Resumen para Dante — Auditoría completa de LAMK

*(2026-08-27 a 2026-08-28. Sin tecnicismos — para el detalle completo de cada punto, cada fase tiene su propio documento en esta misma carpeta.)*

## En una frase

Revisamos el sitio completo de seguridad, velocidad, buscadores, medición y diseño. Encontramos 26 problemas reales en total — los corregimos todos los que se podían corregir con código, y dejamos 1 función completa diseñada y lista para que decidas cuándo construirla. **Nada de esto está en línea todavía** — todo vive guardado y probado, esperando tu palabra para publicarse.

## Lo que se corrigió (con tu aprobación, fase por fase)

### 🔒 Seguridad
El hallazgo más serio: si alguna vez se nos olvidaba configurar una clave de seguridad en el servidor, el sitio seguía funcionando pero con una llave "de repuesto" que cualquiera podía ver en el código — eso hubiera permitido que alguien entrara al panel de administración sin contraseña. Ya no puede pasar: si esa llave falta, el sitio se niega a arrancar el panel de admin en vez de quedar vulnerable.

También cerramos: intentos ilimitados de adivinar contraseñas (ahora hay un límite), dos botones internos que podían usarse sin haber iniciado sesión, y arreglamos que la verificación por WhatsApp antes de pagar en verdad se comprobara en el servidor y no solo en el celular de quien compra (antes, alguien que supiera cómo, podía saltársela).

### ⚡ Velocidad
El mayor culpable de que el sitio se sintiera lento: la mascota TENISIN se cargaba en una versión de la imagen 100 veces más pesada de lo necesario para el tamaño en que se muestra (varios megabytes para un ícono de menos de un centímetro en pantalla). Ya se comprimieron esas imágenes y otras similares — el peso total de la página de inicio bajó **10 veces**. También hicimos que el catálogo y las fichas de producto se actualicen solos cada minuto en vez de quedarse congelados hasta el próximo despliegue.

### 🔍 Buscadores (Google)
Antes, todas las fichas de producto competían entre sí en Google con el mismo título genérico — ahora cada una tiene su propio título y descripción reales. Agregamos el archivo que le dice a Google exactamente qué productos existen (antes tenía que adivinarlo), y protegimos los futuros perfiles de coleccionista para que NO aparezcan en buscadores (relevante para lo que se explica más abajo, en Privacidad).

### 📊 Medición
Antes no había absolutamente ninguna forma de saber si el carrusel principal de la página de inicio (el que pediste que fuera "el más llamativo") de verdad conseguía que la gente comprara, ni qué buscaba la gente que no encontraba. Ahora sí se mide — de forma anónima, sin guardar nombres ni correos, y solo si la persona da su consentimiento real (con opción genuina de decir que no, no solo un botón de "aceptar" disfrazado).

### 🎨 Diseño
Quitamos un cursor personalizado que se había agregado en una ronda anterior — técnicamente estaba bien hecho, pero ese tipo de detalle es justo lo que hace que un sitio se sienta "plantilla genérica" en vez de "negocio real", según el propio criterio que definiste para esta auditoría. Subimos el contraste de textos secundarios en todo el sitio (algunos eran difíciles de leer), agregamos un botón de pausa visible al carrusel principal, y — el que reportaste tú directamente — arreglamos que el menú del celular se viera demasiado transparente.

### ✅ Confirmamos que ya estaba bien hecho (no todo eran problemas)
El "Hype Meter" que decide qué aparece primero en los carruseles **ya es un cálculo real** (vistas recientes contra qué tan poco stock queda), no una lista que alguien tenga que actualizar a mano — eso era justo lo que pedías verificar. El precio que se cobra en el pago siempre se calcula en el servidor de Shopify, nunca se puede manipular desde el navegador. Y el panel de administración ya tenía, mejor de lo esperado, mensajes claros cuando algo está vacío y confirmaciones de carga.

## Lo que queda pendiente — con una razón concreta cada uno, no un olvido

1. **Funciones sociales (compartir por QR, seguir coleccionistas, mostrar tu colección pública)** — no existían en el sitio, así que no había nada que corregir. Lo que sí hicimos: diseñamos el modelo completo de privacidad para el día que se construyan (qué es público, qué es privado por defecto, cómo revocar un QR ya compartido, reglas específicas para menores de edad) — documento listo para aprobar antes de escribir una sola línea de esa función.
2. **Confirmación real de "esta persona compró"** — hoy el sitio manda a la persona a pagar con Shopify pero nunca vuelve a enterarse si terminó de pagar. Arreglar esto necesita una pieza de conexión con Shopify (un "webhook") que es trabajo nuevo, no un ajuste — lo dejamos señalado para una conversación aparte, no lo mezclamos con el resto.
3. **Actualizar Next.js** (la base técnica del sitio) para cerrar 3 alertas de seguridad de nivel "alto" que reportó una herramienta automática — la actualización es a una versión mayor con cambios que pueden romper cosas, así que no se hizo sin hablarlo primero.
4. **Un solo punto de accesibilidad sin poder comprobar** — si alguien navega todo el sitio solo con el teclado, sin mouse, de principio a fin, funciona bien. No tuvimos forma de probarlo con un navegador de verdad en este ambiente de trabajo — lo dejamos marcado como pendiente en vez de asumir que está bien.

## Cómo verificar tú mismo que todo esto es real

Cada fase de esta auditoría vive en su propia rama de código (`audit/fase-0-inventario` hasta `audit/fase-7-cierre`), cada una con su documento de hallazgos en `docs/audit/`. Nada se subió a la versión principal del sitio ni se publicó — cuándo y cómo publicar cada cosa es tu decisión, no la tomamos por ti.

Si quieres, el siguiente paso natural es que revises estas ramas (o pidas que te las mostremos) y decidas qué se publica primero.
