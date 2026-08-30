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

import { pgTable, text, timestamp, boolean, integer, date, primaryKey, index, uniqueIndex } from 'drizzle-orm/pg-core';

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
}, (table) => ({
  customerIdx: index('vault_items_customer_idx').on(table.customerId),
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  productTypeIdx: index('product_events_product_type_idx').on(table.productId, table.type),
  createdAtIdx: index('product_events_created_at_idx').on(table.createdAt),
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
