// src/lib/social/discover.ts
//
// Buscar coleccionistas por nombre de usuario, y calificar una colección
// completa.
//
// --- La regla que gobierna la búsqueda ---
//
// **Solo aparecen perfiles que su dueño puso en PÚBLICO.** No los de
// "solo seguidores", ni los privados, ni los de menores (que el sistema fuerza
// a privado). No es una decisión de producto sino la única lectura compatible
// con el modelo de privacidad de la Fase 2: un perfil de "solo seguidores" dice
// "primero sígueme, después ves"; si el buscador lo listara, ya estaría
// diciendo que existe y quién es, que es justo lo que esa persona no eligió.
//
// La consecuencia es que un buscador vacío es un resultado CORRECTO, no un
// error, mientras nadie haya hecho público su perfil.

import { and, eq, ilike, ne, notInArray, sql, inArray } from 'drizzle-orm';
import { getDb } from '@/db';
import { socialProfiles, vaultItems, blocks, follows, vaultCollectionRatings } from '@/db/schema';
import { isMinor } from './age';

export interface CollectorHit {
  username: string;
  bio: string | null;
  pieces: number;
  /** Promedio de calificación de su colección, null si nadie la ha calificado. */
  rating: number | null;
  ratingCount: number;
  /** Si quien busca ya lo sigue (o tiene solicitud aceptada). */
  following: boolean;
}

const MAX_RESULTS = 24;

// `query` vacío devuelve el directorio: los coleccionistas públicos con más
// piezas. Es lo que hace que la pantalla sirva sin escribir nada.
export async function searchCollectors(
  query: string,
  viewerCustomerId: string | null
): Promise<CollectorHit[]> {
  const db = getDb();
  const term = query.trim().toLowerCase().replace(/^@/, '');

  // Bloqueos en AMBOS sentidos: ni quien me bloqueó aparece, ni yo aparezco
  // para quien bloqueé. Si no, el buscador sería la puerta trasera que salta el
  // bloqueo que alguien puso a propósito.
  let excluded: string[] = [];
  if (viewerCustomerId) {
    const [blockedByMe, blockingMe] = await Promise.all([
      db.select({ id: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, viewerCustomerId)),
      db.select({ id: blocks.blockerId }).from(blocks).where(eq(blocks.blockedId, viewerCustomerId)),
    ]);
    excluded = [...blockedByMe.map((r) => r.id), ...blockingMe.map((r) => r.id)];
  }

  const conditions = [
    eq(socialProfiles.profileVisibility, 'public'),
    sql`${socialProfiles.username} IS NOT NULL`,
  ];
  if (term.length > 0) conditions.push(ilike(socialProfiles.username, `%${term}%`));
  if (viewerCustomerId) conditions.push(ne(socialProfiles.customerId, viewerCustomerId));
  if (excluded.length > 0) conditions.push(notInArray(socialProfiles.customerId, excluded));

  const rows = await db
    .select({
      customerId: socialProfiles.customerId,
      username: socialProfiles.username,
      bio: socialProfiles.bio,
      dateOfBirth: socialProfiles.dateOfBirth,
    })
    .from(socialProfiles)
    .where(and(...conditions))
    .limit(MAX_RESULTS);

  // La edad se recalcula en cada consulta, nunca se confía en lo guardado: una
  // cuenta de menor no debe poder aparecer aquí ni aunque su fila diga
  // 'public' por un estado viejo.
  const visibles = rows.filter((r) => r.username && !isMinor(r.dateOfBirth));
  if (visibles.length === 0) return [];

  const ids = visibles.map((r) => r.customerId);

  const [conteos, calificaciones, siguiendo] = await Promise.all([
    db
      .select({ customerId: vaultItems.customerId, n: sql<number>`count(*)::int` })
      .from(vaultItems)
      .where(inArray(vaultItems.customerId, ids))
      .groupBy(vaultItems.customerId),
    db
      .select({
        ownerId: vaultCollectionRatings.ownerId,
        avg: sql<number>`avg(${vaultCollectionRatings.stars})::float`,
        n: sql<number>`count(*)::int`,
      })
      .from(vaultCollectionRatings)
      .where(inArray(vaultCollectionRatings.ownerId, ids))
      .groupBy(vaultCollectionRatings.ownerId),
    viewerCustomerId
      ? db
          .select({ followeeId: follows.followeeId })
          .from(follows)
          .where(and(eq(follows.followerId, viewerCustomerId), inArray(follows.followeeId, ids)))
      : Promise.resolve([] as { followeeId: string }[]),
  ]);

  const piezas = new Map(conteos.map((c) => [c.customerId, c.n]));
  const rating = new Map(calificaciones.map((c) => [c.ownerId, { avg: c.avg, n: c.n }]));
  const sigo = new Set(siguiendo.map((f) => f.followeeId));

  return visibles
    .map((r) => ({
      username: r.username!,
      bio: r.bio,
      pieces: piezas.get(r.customerId) ?? 0,
      rating: rating.get(r.customerId)?.avg ?? null,
      ratingCount: rating.get(r.customerId)?.n ?? 0,
      following: sigo.has(r.customerId),
    }))
    // Sin término de búsqueda esto es un directorio: primero quien tiene más
    // piezas, que es el closet que vale la pena abrir.
    .sort((a, b) => b.pieces - a.pieces || a.username.localeCompare(b.username));
}

export interface CollectionRating {
  average: number | null;
  count: number;
  mine: number | null;
}

export async function getCollectionRating(
  ownerId: string,
  viewerCustomerId: string | null
): Promise<CollectionRating> {
  const db = getDb();

  const [[agg], mine] = await Promise.all([
    db
      .select({
        avg: sql<number>`avg(${vaultCollectionRatings.stars})::float`,
        n: sql<number>`count(*)::int`,
      })
      .from(vaultCollectionRatings)
      .where(eq(vaultCollectionRatings.ownerId, ownerId)),
    viewerCustomerId
      ? db
          .select({ stars: vaultCollectionRatings.stars })
          .from(vaultCollectionRatings)
          .where(
            and(
              eq(vaultCollectionRatings.ownerId, ownerId),
              eq(vaultCollectionRatings.raterId, viewerCustomerId)
            )
          )
          .limit(1)
      : Promise.resolve([] as { stars: number }[]),
  ]);

  return {
    average: agg?.n > 0 ? Number(agg.avg) : null,
    count: agg?.n ?? 0,
    mine: mine[0]?.stars ?? null,
  };
}

export async function rateCollection(
  ownerId: string,
  raterId: string,
  stars: number
): Promise<void> {
  await getDb()
    .insert(vaultCollectionRatings)
    .values({ ownerId, raterId, stars })
    .onConflictDoUpdate({
      target: [vaultCollectionRatings.ownerId, vaultCollectionRatings.raterId],
      set: { stars, createdAt: new Date() },
    });
}
