# Fase 6 — Diseño

Rama: `audit/fase-6-diseno`.

**Estado: los 5 hallazgos con severidad se corrigieron y se verificaron** (`tsc --noEmit`, `next build`, smoke tests reales). El punto #6 sigue sin poder verificarse — no tengo navegador real en este entorno, así que no lo marco como resuelto porque sería inventar una comprobación que no hice. Además, corregí un problema de contraste real que reportaste aparte (el menú móvil se sentía "transparente"). Nada desplegado, nada en `main`.

Nota de método: los skills `design:design-critique`/`design:accessibility-review` que menciona el brief no están instalados bajo ese nombre en este entorno — la revisión de abajo es directa sobre el código real (mismo criterio que las fases anteriores), no una simulación de esos skills.

## Resumen — tabla por severidad

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| 1 | Cursor a medida en todo el sitio — exactamente el anti-patrón que el propio brief nombra ("se lee como portafolio de práctica, no como producto") | 🔴 Alta | ✅ Corregido |
| 2 | Contraste de texto secundario (`zinc-500` sobre fondo oscuro): 4.33:1, por debajo del 4.5:1 que exige AA para texto normal | 🟡 Media | ✅ Corregido |
| 3 | Carrusel "Curaduría LAMK": avance automático se pausa con hover/foco/drag, pero no hay un botón visible de pausa | 🟡 Media | ✅ Corregido |
| 4 | `HypeCarousel` usa scroll horizontal con JS/flex en vez de `scroll-snap` nativo | 🟢 Baja | ✅ Corregido |
| 5 | Un botón destructivo sin confirmación (borrar borrador de producto en Inventario) | 🟢 Baja | ✅ Corregido |
| 6 | Foco de teclado: no hay supresión global de outline (estructuralmente limpio), pero no pude verificarlo con un navegador/lector de pantalla real | ⚪ Sigue sin verificar |
| — | **Reportado por ti aparte:** menú móvil se sentía "transparente", letras difíciles de percibir | 🟡 Media | ✅ Corregido |

## Las dos preguntas de producto sobre el carrusel — ya respondidas por el código

**¿"Hyped" es manual o calculado?** Ya es calculado — `computeHypeMeter()` (`src/lib/hype.ts`) usa `vistas24h / stockRestante`, con las vistas registradas en cada visita real a una ficha de producto. Tanto `HypeCarousel` como `DropsCoverflow` ordenan por ese `hypeMeter.score` real, no por una lista que alguien tenga que actualizar a mano. Esto ya es exactamente lo que el brief pedía si hubiera sido manual — no hace falta ningún cambio aquí, es limpio.

**¿El carrusel convierte de verdad?** Todavía no hay datos para responder — la instrumentación (`carousel_impression`/`carousel_click` por posición) se construyó recién en la Fase 5, y nada de esto está desplegado todavía. En cuanto haya tráfico real post-despliegue, esos eventos van a responder la pregunta con datos, no con opinión. Vale la pena que, antes de invertir más en rediseñar visualmente este carrusel, se despliegue lo que ya existe y se revisen esos números — rediseñar a ciegas la misma pregunta que la Fase 5 ya dejó lista para responder sería repetir el problema que el brief señaló.

---

### 1. Cursor a medida — 🔴 Alta

**Qué encontraste:** `CustomCursor.tsx` reemplaza el cursor del sistema en todo el sitio (un punto + un anillo que crece al pasar sobre elementos interactivos) — montado una sola vez en el layout raíz, así que aplica a cada página.

**Dónde:** `src/components/ui/CustomCursor.tsx`, montado en `src/app/(routes)/layout.tsx`.

**Por qué importa:** el propio brief lo nombra explícitamente como ejemplo de lo que NO comunica seriedad: *"scroll secuestrado, cursores personalizados y parallax agresivo se leen como portafolio de práctica, no como producto"*. Un cursor a medida no comunica nada sobre sneakers, streetwear ni la marca — es cromo genérico que cualquier plantilla de portafolio también tiene. La regla del brief es clara: *"cualquier animación nueva debe justificarse por lo que comunica — si es puramente decorativa, no la construyas"*. Esta no pasa esa prueba.

**Vale la pena reconocer:** la implementación en sí está bien hecha — se desactiva sola en touch (`pointer: fine`), respeta `prefers-reduced-motion`, usa un solo listener delegado en vez de tocar cada botón. El problema no es la calidad de la ejecución, es la elección misma.

**Cómo se explota / qué se rompe:** no es un exploit — es exactamente la señal que el brief pidió evitar: cuando alguien lo nota, lee "plantilla genérica de portafolio", no "equipo serio construyó esto para vender tenis".

**Parche aplicado:** `<CustomCursor />` quitado del layout raíz (`src/app/(routes)/layout.tsx`). El archivo `CustomCursor.tsx` no se borró — se queda documentado como retirado, no destruido, por si se decide retomarlo.

---

### 2. Contraste de `zinc-500` sobre fondo oscuro — 🟡 Media

**Qué encontraste:** calculé el contraste real (fórmula WCAG de luminancia relativa) de `text-zinc-500` (#71717A, usado extensamente para texto secundario/labels/timestamps en todo el proyecto) contra el fondo oscuro real del sitio (`#050507`): **4.33:1**. El mínimo AA para texto normal es 4.5:1 — este color no lo alcanza (sí alcanza el 3:1 que exige AA para texto grande ≥18px o componentes de UI, así que no todos los usos son un problema, solo el texto de tamaño normal/pequeño).

**Dónde:** patrón usado en decenas de componentes (`text-zinc-500`, frecuentemente en tamaños pequeños como `text-[10px]`/`text-[11px]` — captions, timestamps, metadata).

**Por qué importa:** es texto real con información (fechas, estados, ayuda contextual), no decoración — alguien con baja visión o en una pantalla con brillo bajo puede tener dificultad real para leerlo.

**Cómo se explota / qué se rompe:** no es un exploit — es una barrera de accesibilidad real y medible, no una opinión de gusto.

**Parche aplicado:** barrido completo — las 83 instancias de `text-zinc-500` en 33 archivos pasaron a `text-zinc-400` (#A1A1AA, contraste calculado: **8.19:1**, cómodamente por encima de AA y AAA). No toqué `zinc-500` cuando se usa como color de fondo/borde/icono (esos casos solo necesitan 3:1, y 4.33:1 ya lo cumple) — el cambio fue específico a la clase de color de texto.

---

### 3. Carrusel "Curaduría LAMK" sin botón de pausa visible — 🟡 Media

**Qué encontraste:** `CoverflowCarousel` avanza solo cada 4.2s, y se pausa con hover, foco de teclado o mientras se arrastra — pero no hay ningún botón visible de "pausar" independiente de esas interacciones. `prefers-reduced-motion` sí desactiva el avance automático por completo (eso está bien resuelto), pero alguien sin esa preferencia activada a nivel sistema, que igual prefiere que el carrusel no se mueva solo (sensibilidad vestibular sin haber cambiado la config del sistema, o simplemente preferencia), no tiene ningún control explícito.

**Dónde:** `src/components/ui/coverflow-carousel.tsx`.

**Por qué importa:** el brief lo pide explícito: *"sin autoplay (o pausable con un control visible)"*. Pausar-al-interactuar no es lo mismo que un control visible — cumple la letra a medias.

**Cómo se explota / qué se rompe:** no es un exploit — WCAG 2.2.2 (Pause, Stop, Hide) lo pide para contenido que se mueve automáticamente por más de 5 segundos.

**Parche aplicado:** botón pausa/play (`Pause`/`Play` de `lucide-react`) junto a los controles de flecha que ya existían, con `aria-pressed` — un estado `userPaused` independiente del `isPaused` automático (hover/foco/drag), así el botón no interfiere con la lógica existente. No se muestra si `prefers-reduced-motion` ya está activo o si solo hay una tarjeta (no hay nada que pausar en esos casos).

---

### 4. `HypeCarousel` sin `scroll-snap` nativo — 🟢 Baja

**Qué encontraste:** `flex gap-6 overflow-x-auto` sin `scroll-snap-type`/`scroll-snap-align` — el scroll horizontal funciona, pero no "engancha" en cada tarjeta.

**Dónde:** `src/components/home/HypeCarousel.tsx`.

**Por qué importa:** el brief prefiere `scroll-snap` nativo sobre una librería/JS para este tipo de carrusel — mejor rendimiento (nada de JS calculando posiciones) y mejor sensación táctil en móvil (el navegador hace el snap, no hay que simularlo). Nota aparte: esto NO aplica al `DropsCoverflow` — ese usa un efecto 3D (rotación + perspectiva) que `scroll-snap` físicamente no puede reproducir, así que ahí el JS es inherente a la elección visual, no un descuido.

**Parche aplicado:** `snap-x snap-mandatory` en el contenedor y `snap-start` en cada tarjeta — sin tocar ninguna lógica, solo CSS.

---

### 5. Borrar borrador de producto sin confirmación — 🟢 Baja

**Qué encontraste:** `handleDeleteDraft()` en el panel de Inventario dispara el `DELETE` apenas se hace clic — sin `window.confirm()` ni modal.

**Dónde:** `src/components/admin/InventoryManager.tsx:107-110`.

**Por qué importa:** es el único botón destructivo sin confirmación que encontré en todo el panel de admin (revisé Leads, Apartados, Clientes, Ventas — ninguno tiene botones de borrado con este mismo problema, de hecho no encontré más triggers de `DELETE` en el resto del panel). El impacto es bajo porque solo borra un borrador no publicado (no una venta real ni un cliente), pero sigue siendo el patrón que el brief pide revisar.

**Parche aplicado:** `window.confirm('¿Quitar este borrador? No se puede deshacer.')` antes del `fetch` de borrado — simple, no ameritaba un modal nuevo para un solo botón de bajo riesgo.

---

---

### Contraste del menú móvil — reportado por ti, fuera de la lista original — 🟡 Media

**Qué encontraste (tú, al usar el sitio):** el panel del menú móvil "se sentía transparente", las letras no se percibían bien.

**Qué encontré al revisar el código:** el panel usaba `bg-background` — técnicamente opaco (no hay ningún alfa en esa variable), pero en modo oscuro `--background` (#050507) y el velo detrás (`bg-black/80`) son prácticamente el mismo negro casi puro. El panel no se distinguía del fondo como una superficie sólida separada, así que aunque el contraste texto-contra-panel fuera correcto en el papel, la sensación visual era de "esto no tiene un fondo de verdad".

**Dónde:** `src/components/ui/MobileMenu.tsx`.

**Parche aplicado:** el panel pasa de `bg-background` a `bg-card` (`#0E0E13` en oscuro / `#FFFFFF` en claro) — un tono deliberadamente distinto del fondo de la página en ambos temas, no solo "más oscuro". El velo detrás sube de 80% a 90% de opacidad para reforzar la separación. Los divisores entre los links del menú (`border-border/60`, casi invisibles — el token `--border` ya es muy sutil por diseño, y el /60 los debilitaba más todavía) pasan a `border-border` completo.

---

## Lo que salió limpio / mejor de lo esperado

- **Vacíos del panel de admin, con contexto real:** revisé Leads, Apartados y Clientes — los estados vacíos no dicen solo "no hay datos", explican qué va a aparecer ahí y cuándo (ej. Apartados: *"Aún no hay apartados. En cuanto un cliente aparte un par con TENISIN, la solicitud... aparecerá aquí con su WhatsApp listo para contactar"*). Mejor que el promedio de lo que suele encontrarse en paneles internos.
- **Feedback de carga real:** "Cargando...", "Cargando clientes...", "Guardando..." — no hay pantallas en blanco silenciosas mientras algo carga, en los paneles que revisé.
- **Tablas reales, no divs disfrazados:** los 4 paneles con datos tabulares (`ClientsPanel`, `DemandRequestsPanel`, `LayawayPanel`, `OfflineSalesModule`) usan `<table>` de verdad — la navegación por teclado nativa entre celdas/enlaces/botones funciona sin necesitar JS extra, y no encontré ningún patrón riesgoso de `onClick` en una fila sin equivalente de teclado.
- **`prefers-reduced-motion` bien dirigido, no un blanket:** solo 4 componentes lo revisan explícitamente (`Lookbook`, `ScrollMacroBackground`, `count-up`, `coverflow-carousel`) — y son justo los correctos: el avance automático, el parallax de scroll, la animación de conteo y el cursor a medida (este último lo revisa aparte, con `matchMedia` directo). Los `whileHover`/`whileTap` del resto del sitio son micro-interacciones puntuales activadas solo por gesto deliberado — no necesitan el mismo tratamiento, y no lo tener no es un hueco.
- **Sin scroll secuestrado ni parallax agresivo:** revisé `ScrollMacroBackground.tsx` (el único efecto ligado a scroll del proyecto) — usa `useScroll`/`useTransform` de framer-motion, que modula opacidad/rotación de un fondo decorativo SIN interceptar el scroll nativo (nada de `preventDefault` en eventos de wheel/scroll). Es parallax normal, no secuestro — el brief los trata como cosas distintas y aquí no aplica la crítica.
- **Focus en inputs de texto:** todos los `<input>` que revisé usan `outline-none` siempre emparejado con `focus:border-{color}` — nunca until un `outline-none` suelto sin reemplazo.

## Perfil de usuario y bóveda — estado real

No hay nada nuevo que auditar aquí más allá de lo que ya cubrió la Fase 2: `/profile/[username]` sigue corriendo sobre `mock-users.ts` (perfiles ficticios), y el modelo de privacidad acordado (vault como curaduría explícita, QR revocable, defaults restrictivos) sigue siendo diseño, no código. Los "ajustes básicos, controles de privacidad, generación/revocación de QR" que pide esta fase para el perfil solo tienen sentido de auditar una vez que ese sistema exista de verdad — auditar hoy el mock sería revisar una maqueta, no el producto.

## Accesibilidad — lo que pude verificar sin navegador real

Soy honesto sobre el límite de este entorno: no tengo un navegador con lector de pantalla para hacer la prueba real que pide el brief ("screen-reader testing"). Lo que sí pude verificar por código:

- **Sin supresión global de outline** (`globals.css` no tiene ninguna regla `outline: none` a nivel global) — estructuralmente, el navegador debería seguir mostrando su indicador de foco nativo en botones/enlaces que no lo hayan quitado explícitamente. No encontré ningún `outline-none` fuera de los `<input>` de texto (que sí lo reemplazan por `focus:border`).
- **Lo que NO pude verificar:** si algún botón con `overflow-hidden` + `rounded-full`/`rounded-2xl` recorta visualmente el anillo de foco del navegador en la práctica (riesgo real en ciertos motores de render, no lo puedo confirmar sin abrir un navegador de verdad), ni el recorrido de tabulación completo de principio a fin, ni cómo se anuncia el contenido dinámico (toasts, contador del carrito, mensajes de TENISIN) a un lector de pantalla real.

Marco esto como pendiente, no como aprobado ni como reprobado — sería inventar un hallazgo pretender que sí lo probé.

## Archivos tocados

`src/app/(routes)/layout.tsx` (quitar `<CustomCursor />`), `src/components/ui/CustomCursor.tsx` (comentario de retiro, archivo no borrado), 33 archivos con `text-zinc-500`→`text-zinc-400`, `src/components/ui/coverflow-carousel.tsx` (botón de pausa), `src/components/home/HypeCarousel.tsx` (`scroll-snap`), `src/components/admin/InventoryManager.tsx` (`confirm()` antes de borrar), `src/components/ui/MobileMenu.tsx` (contraste del panel).

Nada tocó `main` ni se desplegó — todo vive en `audit/fase-6-diseno`, verificado con `tsc --noEmit`, `next build` y smoke tests reales. Sigue pendiente, honestamente, el punto #6 (verificación real de foco/lector de pantalla con un navegador — no disponible en este entorno). Lista para Fase 7 (Cierre) cuando digas.
