// src/db/schema.ts
//
// Esquema de la base de datos real (Neon Postgres, conectada por Dante vía
// el marketplace de Vercel) — primera vez que este proyecto tiene una base
// de datos de verdad (antes todo era JSON en filesystem, ver CLAUDE.md).
// Implementa el modelo de privacidad completo acordado en
// docs/audit/FASE-2-PRIVACIDAD.md — no se inventó nada nuevo aquí, esto es
// la traducción a tablas de lo que ya se diseñó y aprobó.
//
// Identidad: no hay un ID interno de usuario propio — `customerId` es
// siempre el GID real de Shopify Customer (mismo que ya usa el resto del
// proyecto vía getCustomerProfile()). Así no se duplica ni se desincroniza
// la identidad real del cliente.

import { pgTable, text, timestamp, boolean, integer, date, numeric, jsonb, primaryKey, index, uniqueIndex } from 'drizzle-orm/pg-core';

// Perfil social — uno por cliente que haya activado alguna función social.
// No existe fila = la persona nunca activó nada social, tratar como
// "no existe perfil público" (equivalente a todo en lo más restrictivo).
export const socialProfiles = pgTable('social_profiles', {
  customerId: text('customer_id').primaryKey(), // GID de Shopify Customer
  username: text('username').unique(), // handle público, ej. /profile/juan — null hasta que se elige uno
  dateOfBirth: date('date_of_birth'), // autodeclarada al activar funciones sociales — ver Fase 2
  // Público / solo-seguidores / privado — ver tabla de la Fase 2. SIEMPRE
  // nace en 'private', sin excepción — el default más restrictivo posible.
  profileVisibility: text('profile_visibility', { enum: ['public', 'followers', 'private'] }).notNull().default('private'),
  showTier: boolean('show_tier').notNull().default(false), // tier/XP visible — oculto por defecto
  vaultVisibility: text('vault_visibility', { enum: ['public', 'followers', 'private'] }).notNull().default('private'),
  showFollowLists: boolean('show_follow_lists').notNull().default(false), // lista de seguidores/seguidos — oculta por defecto
  showFollowerCount: boolean('show_follower_count').notNull().default(false), // ni el número — oculto por defecto
  bio: text('bio'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  usernameIdx: index('social_profiles_username_idx').on(table.username),
}));

// Relación de seguir. `status`: 'pending' si el perfil destino es privado
// (necesita aprobación explícita del dueño, ver Fase 2 sección 5),
// 'accepted' si ya se aprobó o si el perfil destino era público (no hay
// nada que aprobar).
export const follows = pgTable('follows', {
  followerId: text('follower_id').notNull(),
  followeeId: text('followee_id').notNull(),
  status: text('status', { enum: ['pending', 'accepted'] }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.followerId, table.followeeId] }),
  followeeIdx: index('follows_followee_idx').on(table.followeeId),
}));

// Bloqueos — bloquear implica automáticamente: deja de seguir, no puede
// volver a solicitar seguir, no aparece en descubrimiento (ver Fase 2
// sección 5). La aplicación de esas reglas vive en el código, no aquí —
// esta tabla solo registra el hecho.
export const blocks = pgTable('blocks', {
  blockerId: text('blocker_id').notNull(),
  blockedId: text('blocked_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.blockerId, table.blockedId] }),
}));

// Reportes — accesible directo desde cualquier perfil, sin importar si la
// cuenta reportada es de un menor (ver Fase 2 sección 4). No se autoresuelve
// nada aquí — un admin revisa manualmente vía el panel (fuera de alcance de
// esta ronda, ver "Pendiente" en el doc de cierre de esta feature).
export const reports = pgTable('reports', {
  id: text('id').primaryKey(), // uuid generado en la app
  reporterId: text('reporter_id').notNull(),
  reportedId: text('reported_id').notNull(),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Código QR — token temporal y revocable, NUNCA la URL directa del perfil
// (ver Fase 2 sección 3: revocar debe significar algo de verdad). Escanear
// un QR siempre muestra la vista MÁS conservadora del perfil (equivalente a
// "solo seguidores"), sin importar la visibilidad configurada — el riesgo
// físico de un desconocido escaneando en persona es distinto al de un
// follower que encontró el perfil en el sitio.
export const qrTokens = pgTable('qr_tokens', {
  token: text('token').primaryKey(), // aleatorio, generado en la app
  customerId: text('customer_id').notNull(),
  expiresAt: timestamp('expires_at'), // null = sin expiración (QR "de larga duración", elección explícita del dueño)
  revokedAt: timestamp('revoked_at'), // no-null = revocado manualmente, deja de funcionar de inmediato
  scanCount: integer('scan_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  customerIdx: index('qr_tokens_customer_idx').on(table.customerId),
}));

// Piezas de la bóveda pública — CURADURÍA EXPLÍCITA, nunca historial de
// compra automático (ver Fase 2 sección 1.1). Una fila aquí existe SOLO
// porque el dueño tocó "agregar a mi bóveda" para esa pieza específica.
// Deliberadamente NO tiene columnas de precio/valor — ver Fase 2 sección
// 1.2, esos datos nunca deben poder mostrarse en ningún perfil público.
export const vaultItems = pgTable('vault_items', {
  id: text('id').primaryKey(), // uuid generado en la app
  customerId: text('customer_id').notNull(),
  productId: text('product_id'), // GID real de Shopify si es una pieza del catálogo — null si es una pieza propia no comprada aquí
  title: text('title').notNull(),
  imageUrl: text('image_url').notNull(),
  note: text('note'), // texto libre opcional del dueño
  addedAt: timestamp('added_at').notNull().defaultNow(),

  // --- Añadido con el webhook orders/paid (2026-09-02) ---
  // Número de serie ESTABLE, asignado una sola vez en el momento de la
  // compra. Antes el serial se calculaba al vuelo en getCustomerProfile()
  // como , es decir a partir de la POSICIÓN de la
  // pieza en el arreglo de pedidos: comprar un par más le cambiaba el
  // número de serie a piezas que el cliente ya tenía. Un serial que cambia
  // no es un serial. Null en piezas registradas antes de esto y en las
  // declaradas a mano (vault_purchase_claims), que nunca tuvieron uno.
  serialNumber: text('serial_number'),
  // GID del pedido de Shopify que trajo esta pieza. Es la clave de
  // idempotencia: Shopify REINTENTA los webhooks (hasta 19 veces en 48h si
  // no recibe 200), así que sin esto un solo pedido podía sembrar la misma
  // pieza varias veces en la bóveda. Null = pieza agregada a mano por el
  // dueño, no vino de un pedido.
  orderId: text('order_id'),
}, (table) => ({
  customerIdx: index('vault_items_customer_idx').on(table.customerId),
  // Un pedido no puede traer dos veces la misma pieza para el mismo dueño.
  // Es lo que hace que el reintento de Shopify sea inofensivo.
  orderProductUnique: uniqueIndex('vault_items_order_product_idx').on(table.orderId, table.productId, table.customerId),
}));

// --- Añadido en Fase A (auditoría "Prompt Maestro v4", 2026-08-29) ---
// Las tres tablas de abajo cierran los hallazgos #2 (índice), #3
// (consentimiento) y #4 (login social) de esa auditoría. No tocan ninguna
// tabla de arriba (Fase 2 / social) — son aditivas.

// Consentimiento LFPDPPP — una fila por cada vez que alguien acepta el aviso
// de privacidad (o lo revoca). Se guarda versión+fecha+IP a propósito: es la
// evidencia si algún día hay un reclamo. `marketingOptIn` es SIEMPRE una
// decisión separada del aviso obligatorio (checkbox distinta en el form) —
// nunca se infiere aceptación de marketing solo por haberse registrado.
export const consentLog = pgTable('consent_log', {
  id: text('id').primaryKey(), // uuid generado en la app
  customerId: text('customer_id').notNull(), // GID de Shopify Customer
  privacyVersion: text('privacy_version').notNull(), // ej. "2026-08-29" — versión del Aviso de Privacidad aceptado
  marketingOptIn: boolean('marketing_opt_in').notNull().default(false), // WhatsApp/correo de drops y restocks
  ip: text('ip'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  customerIdx: index('consent_log_customer_idx').on(table.customerId),
}));

// Eventos reales de producto — base del Índice (hallazgo #2). Nunca se lee
// fila por fila en el request de una página: un job agregado (ver
// lib/hype-index.ts) calcula el score y lo cachea. `wishlist` queda modelado
// desde ya aunque Most Wanted (Fase B) todavía no exista — el día que se
// active esa función, el tipo de evento ya está listo, no hace falta migrar
// nada; hasta entonces simplemente no se genera ese tipo de fila.
export const productEvents = pgTable('product_events', {
  id: text('id').primaryKey(), // uuid generado en la app
  productId: text('product_id').notNull(), // GID de Shopify Product
  type: text('type', { enum: ['view', 'cart', 'wishlist', 'sale'] }).notNull(),
  // Clave de deduplicación (2026-09-02, con el webhook orders/paid). Shopify
  // REINTENTA los webhooks, y sin esto cada reintento del mismo pedido volvía
  // a insertar sus ventas: el término de velocidad del Índice se inflaba solo,
  // sin que hubiera vendido nada más. Para ventas vale
  // `<pedido>#<producto>#<unidad>`; para vistas/carrito/wishlist va NULL, y en
  // Postgres los NULL no chocan entre sí en un índice único, así que esos
  // eventos se siguen registrando todas las veces (que es lo correcto: ver un
  // producto diez veces SON diez vistas).
  dedupeKey: text('dedupe_key'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  productTypeIdx: index('product_events_product_type_idx').on(table.productId, table.type),
  createdAtIdx: index('product_events_created_at_idx').on(table.createdAt),
  dedupeIdx: uniqueIndex('product_events_dedupe_idx').on(table.dedupeKey),
}));

// Vinculación de cuentas OAuth (Google/Apple) a la cuenta real de Shopify
// Customer (hallazgo #4). El login social NO reemplaza a Shopify Customer
// Accounts — Shopify no soporta OAuth social nativo en la Storefront API que
// usa este proyecto (ver decisión con Dante, 2026-08-29). En vez de migrar
// todo el auth, se usa un puente: NextAuth maneja el OAuth, y esta tabla
// vincula `providerAccountId` a un `customerId` real de Shopify creado o
// encontrado vía Admin API. Solo se vincula automáticamente cuando el
// proveedor confirma `email_verified: true` — si no, se trata como cuenta
// nueva y se le pide confirmar su correo, para no fusionar dos personas
// distintas que comparten un correo no verificado.
//
// `encryptedPassword` (añadido 2026-08-29, ver src/lib/social-auth/): la
// Admin API de Shopify (verificado contra la doc 2026-01) ya no expone un
// campo para fijar/resetear la contraseña de un customer existente — y
// Multipass (que sí resolvería esto de forma nativa) es exclusivo de
// Shopify Plus, y LAMK MX está en plan estándar (confirmado con Dante).
// La única forma de mantener una sesión real de Storefront API para un
// login social es que NOSOTROS generemos la contraseña al crear la cuenta
// puente, y la reusemos para volver a autenticar en cada login futuro —
// nunca en texto plano, cifrada con AES-256-GCM (ver crypto.ts), y nunca
// expuesta al cliente ni mostrada al usuario.
// Most Wanted (Fase B, brief B.3 punto 5) — lista real de deseos, distinta
// de vaultItems (que es lo que YA se posee y se eligió mostrar). Doble
// propósito: al coleccionista le sirve de wishlist; agrupado por
// `productId` (COUNT) es la señal de demanda de inventario no satisfecha
// que el brief pide para el admin (Fase D, todavía sin construir) — el
// schema ya queda listo para esa consulta sin tener que migrar nada.
export const wishlistItems = pgTable('wishlist_items', {
  id: text('id').primaryKey(), // uuid generado en la app
  customerId: text('customer_id').notNull(),
  productId: text('product_id').notNull(), // GID real de Shopify Product
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  customerIdx: index('wishlist_items_customer_idx').on(table.customerId),
  productIdx: index('wishlist_items_product_idx').on(table.productId), // para el futuro GROUP BY de demanda (Fase D)
  uniquePair: uniqueIndex('wishlist_items_customer_product_idx').on(table.customerId, table.productId),
}));

// Borrado de cuenta (Fase B, brief B.4 + ventana de arrepentimiento
// propuesta en docs/audit/FASE-2-PRIVACIDAD.md sección 7) — una fila =
// una solicitud pendiente. Cancelar es simplemente borrar la fila (nunca
// se ejecutó nada todavía). `processDueDeletions()` en
// lib/account-deletion.ts es lo único que borra de verdad, cuando
// `scheduledFor` ya pasó.
//
// Límite real verificado contra la Admin API (doc 2026-01, campo
// `Customer.canDelete`): Shopify NO permite borrar un customer que ya
// tiene pedidos — que es el caso normal de alguien con una Bóveda real.
// Por eso "eliminar cuenta" no puede prometer borrar el registro de
// Shopify en todos los casos: si tiene pedidos, se borra todo lo propio
// de este proyecto (perfil social, bóveda, wishlist, QR, vínculos OAuth,
// consentimiento de marketing) y el historial de compra se conserva en
// Shopify por obligación fiscal — excepción estándar y razonable de la
// LFPDPPP para registros contables, no un incumplimiento del derecho ARCO.
export const accountDeletionRequests = pgTable('account_deletion_requests', {
  customerId: text('customer_id').primaryKey(),
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  scheduledFor: timestamp('scheduled_for').notNull(),
});

export const linkedAccounts = pgTable('linked_accounts', {
  id: text('id').primaryKey(), // uuid generado en la app
  customerId: text('customer_id').notNull(), // GID de Shopify Customer al que quedó vinculada
  provider: text('provider', { enum: ['google', 'apple'] }).notNull(),
  providerAccountId: text('provider_account_id').notNull(), // "sub" del proveedor OAuth
  email: text('email').notNull(),
  encryptedPassword: text('encrypted_password').notNull(), // ver nota arriba — AES-256-GCM, formato iv:authTag:ciphertext (base64)
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  providerAccountIdx: index('linked_accounts_provider_account_idx').on(table.provider, table.providerAccountId),
  customerIdx: index('linked_accounts_customer_idx').on(table.customerId),
}));

// --- Añadido 2026-08-30, pedido directo de Dante (no del brief) ---
// Reclamos de compra manual — un cliente puede tener piezas de LAMK que
// compró antes de que existiera esta app, o fuera de Shopify (tienda
// física, reventa, etc.): no hay pedido real detrás, así que no pueden
// entrar a `collection` como el resto de piezas (que salen 100% de
// pedidos reales vía getCustomerProfile()). En vez de inventar un pedido
// falso o dejar que cualquiera se autoasigne piezas, el cliente declara
// la pieza (modelo + foto) y un admin la aprueba o rechaza a mano —
// instrucción explícita de Dante: "solo él sabe quiénes son sus clientes
// reales". Solo al aprobarse aparece en la Bóveda (ver
// getApprovedClaimsAsCollectionItems en lib/vault-claims.ts), siempre
// marcada como verificada manualmente — nunca mezclada en silencio con
// las piezas que sí vienen de un pedido real.
//
// customerEmail/customerName son una copia (snapshot) tomada al momento
// del envío, no una referencia viva — así el panel de admin puede mostrar
// quién envió cada reclamo sin depender de la Admin API de Shopify (que
// hoy no está configurada, ver CLAUDE.md). Foto guardada como data URL
// (mismo patrón ya usado por ReviewForm/reviews-store, con límite de
// tamaño validado en la API — ver api/vault/claims/route.ts).
export const vaultPurchaseClaims = pgTable('vault_purchase_claims', {
  id: text('id').primaryKey(), // uuid generado en la app
  customerId: text('customer_id').notNull(), // GID de Shopify Customer
  customerEmail: text('customer_email').notNull(),
  customerName: text('customer_name').notNull(),
  productTitle: text('product_title').notNull(), // modelo exacto, texto libre del cliente
  imageUrl: text('image_url').notNull(), // foto de la pieza subida por el cliente
  note: text('note'), // contexto opcional ("comprado en 2023 en tienda física", etc.)
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  reviewNote: text('review_note'), // motivo del admin si rechaza — opcional
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  customerIdx: index('vault_purchase_claims_customer_idx').on(table.customerId),
  statusIdx: index('vault_purchase_claims_status_idx').on(table.status),
}));

// ---------------------------------------------------------------------------
// Migración de los 5 stores de filesystem (2026-09-02)
//
// Estas 6 tablas reemplazan a `data/*.json` + `fs.writeFileSync`. El motivo no
// es estética: el filesystem de una función serverless de Vercel es efímero y
// no se comparte entre instancias, así que cada venta en piso, apartado, lead
// de TENISIN o reseña podía desaparecer sin dejar rastro ni error — el
// `catch` de los stores viejos escribía a consola y devolvía `[]`, que desde
// la UI se lee igual que "todavía no hay nada".
//
// Dinero: `numeric(12,2)`, nunca float. Drizzle devuelve numeric como string,
// y cada store lo convierte a `number` en la frontera para no cambiar el
// contrato de los tipos en src/types/admin.ts (que ya eran `number`).
// ---------------------------------------------------------------------------

// Ventas en piso / deudas (antes data/offline-sales.json).
export const offlineSales = pgTable('offline_sales', {
  id: text('id').primaryKey(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  itemsSummary: text('items_summary').notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).notNull(),
  pendingBalance: numeric('pending_balance', { precision: 12, scale: 2 }).notNull(),
  dueDate: date('due_date').notNull(),
  paymentStatus: text('payment_status', { enum: ['PAID', 'PARTIAL_DEBT', 'OVERDUE'] }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  createdIdx: index('offline_sales_created_idx').on(table.createdAt),
}));

// Apartados capturados por TENISIN (antes data/layaway.json).
//
// `paymentNotes` va en jsonb y no en tabla aparte a propósito: es un historial
// que solo se lee completo junto con su apartado, nunca se consulta ni agrega
// por sí solo. El append se hace con el operador `||` de jsonb en SQL (ver
// addPaymentNote), así que dos abonos simultáneos no se pisan — que era el
// único motivo real para normalizarlo.
export const layawayReservations = pgTable('layaway_reservations', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  productTitle: text('product_title').notNull(),
  productImage: text('product_image').notNull().default(''),
  requestedSize: text('requested_size').notNull().default('N/A'),
  totalPrice: numeric('total_price', { precision: 12, scale: 2 }).notNull(),
  percentage: integer('percentage').notNull(),
  depositAmount: numeric('deposit_amount', { precision: 12, scale: 2 }).notNull(),
  hypeScore: integer('hype_score').notNull().default(0),
  customerPhone: text('customer_phone').notNull(),
  note: text('note').notNull().default(''),
  paymentNotes: jsonb('payment_notes').notNull().default([]),
  status: text('status', { enum: ['PENDING', 'CONTACTED', 'CONFIRMED', 'CANCELLED'] }).notNull().default('PENDING'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  phoneIdx: index('layaway_phone_idx').on(table.customerPhone),
  statusIdx: index('layaway_status_idx').on(table.status),
}));

// Peticiones de demanda de TENISIN (antes data/leads.json).
export const productDemandRequests = pgTable('product_demand_requests', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  productTitle: text('product_title').notNull(),
  requestedSize: text('requested_size').notNull().default('N/A'),
  customerPhone: text('customer_phone').notNull().default(''),
  customerEmail: text('customer_email').notNull().default(''),
  notified: boolean('notified').notNull().default(false),
  rawQuery: text('raw_query').notNull().default(''),
  // Señal real de demanda insatisfecha: false = TENISIN no encontró el
  // producto. Es la fuente de "Demanda no atendida" en /admin/clientes.
  wasMatched: boolean('was_matched').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  matchedIdx: index('demand_matched_idx').on(table.wasMatched),
}));

// Reseñas con compra verificada (antes data/reviews.json).
// `customerId` es único: un cliente, una reseña — al dejar otra se reemplaza,
// que es la regla que ya aplicaba el store viejo al filtrar antes de escribir.
export const verifiedReviews = pgTable('verified_reviews', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().unique(),
  customerName: text('customer_name').notNull(),
  rating: integer('rating').notNull(),
  text: text('text').notNull(),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Productos reales de Shopify que el admin ocultó del catálogo PWA
// (antes data/hidden-products.json). No se borra nada en Shopify — RF-3.2.
export const hiddenProducts = pgTable('hidden_products', {
  productId: text('product_id').primaryKey(),
  hiddenAt: timestamp('hidden_at').notNull().defaultNow(),
});

// Borradores de producto capturados en el admin, en espera de que el token
// de Shopify tenga write_products (antes data/product-drafts.json).
export const productDrafts = pgTable('product_drafts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  brand: text('brand').notNull(),
  category: text('category', { enum: ['SNEAKERS', 'APPAREL', 'ACCESSORIES', 'COLLECTIBLES', 'JEWELRY'] }).notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  sizeOptions: text('size_options').notNull().default(''),
  description: text('description').notNull().default(''),
  imageUrl: text('image_url').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Reacciones a las piezas de una bóveda PÚBLICA (2026-09-02, pedido de Dante:
// "un botón de like y dislike por cada prenda o tenis de su colección").
//
// Cuatro decisiones que son de seguridad, no de producto:
//
//  1. La llave primaria es (vault_item_id, customer_id): UNA reacción por
//     persona por pieza. Sin eso, el mismo visitante puede pulsar mil veces y
//     el contador deja de significar nada.
//  2. Exige sesión de cliente — no hay reacción anónima. Es la diferencia
//     entre un contador y una máquina de brigading.
//  3. NUNCA se expone quién reaccionó, solo el total. Un "no me gusta" con
//     nombre y apellido sobre las pertenencias de alguien es acoso con otro
//     nombre; el número agregado no lo es.
//  4. Cuelga de `vault_items`, no de `product_id`: se reacciona al PAR
//     CONCRETO que esta persona tiene en su bóveda, no al modelo en abstracto
//     (para eso ya está la wishlist). Al borrar la cuenta, sus piezas se van y
//     estas filas dejan de tener a qué apuntar — ver account-deletion.ts.
export const vaultItemReactions = pgTable('vault_item_reactions', {
  vaultItemId: text('vault_item_id').notNull(),
  customerId: text('customer_id').notNull(), // quien reacciona
  // 1 = me gusta, -1 = no me gusta. Entero y no booleano para poder sumar el
  // saldo en SQL sin dos contadores separados.
  value: integer('value').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.vaultItemId, table.customerId] }),
  itemIdx: index('vault_item_reactions_item_idx').on(table.vaultItemId),
}));
