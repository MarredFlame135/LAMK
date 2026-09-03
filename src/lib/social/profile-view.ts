// src/lib/social/profile-view.ts
//
// El corazón del modelo de privacidad de la Fase 2: dado un perfil y quién
// lo está viendo (el dueño, alguien que lo sigue, un desconocido, o alguien
// que acaba de escanear un QR), decide exactamente qué es visible. Nunca
// hay una ruta donde el cliente pueda pedir "dame todo" — este archivo es
// el único lugar que arma la respuesta pública de un perfil, a propósito,
// para que la regla no se pueda saltar llamando otra función por error.
//
// Reglas que vienen directo de docs/audit/FASE-2-PRIVACIDAD.md, no
// inventadas aquí:
//  - Un perfil de menor (isMinor) nunca puede ser público ni de seguidores,
//    sin importar lo que diga la columna guardada — se fuerza en runtime,
//    no solo se deshabilita el control en la UI (eso solo sería una
//    barrera de UI, exactamente el tipo de hueco que ya se auditó en
//    Fase 1 bajo "nunca confiar en que la UI sea la única barrera").
//  - Escanear un QR SIEMPRE ve la versión más conservadora del perfil
//    (equivalente a "solo seguidores"), sin importar que el perfil esté en
//    público — un desconocido físicamente presente es un riesgo distinto
//    a un follower que encontró el perfil en el sitio.
//  - Bloqueo es absoluto: en cualquier dirección, no hay nada que ver.
//  - No existen columnas de precio/valor/ubicación en todo el esquema —
//    no es una regla de código que se pueda olvidar, es estructuralmente
//    imposible devolverlas porque no están en la base de datos.

import { eq, and } from 'drizzle-orm';
import { getDb } from '@/db';
import { socialProfiles, vaultItems, follows, blocks } from '@/db/schema';
import { isMinor } from './age';
import { getCatalogLive } from '@/lib/catalog-source';

type Relation = 'owner' | 'follower' | 'stranger';

export interface ProfileView {
  customerId: string;
  username: string | null;
  bio: string | null;
  // El tier/XP real vive en Shopify (getCustomerProfile()), no en esta base
  // de datos — este archivo solo decide SI el caller tiene permiso de
  // mostrarlo, no trae el valor.
  canShowTier: boolean;
  followerCount: number | null; // solo si showFollowerCount
  // Solo si la relación alcanza vaultVisibility. Desde el "Closet Digital"
  // (2026-09-02) lleva también productId, serie y categoría, que es lo que
  // necesitan las tres zonas (lib/vault-zones.ts) para repartir las piezas.
  // Sigue SIN llevar precio ni valor de ningún tipo — Fase 2, sección 1.2.
  vault: {
    id: string;
    title: string;
    imageUrl: string;
    note: string | null;
    productId: string | null;
    serialNumber: string | null;
    category: string;
  }[];
  isOwner: boolean;
}

async function getRelation(targetId: string, viewerId: string | null): Promise<Relation> {
  if (viewerId && viewerId === targetId) return 'owner';
  if (!viewerId) return 'stranger';
  const db = getDb();
  const [row] = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, viewerId), eq(follows.followeeId, targetId), eq(follows.status, 'accepted')))
    .limit(1);
  return row ? 'follower' : 'stranger';
}

export function canView(effectiveVisibility: 'public' | 'followers' | 'private', relation: Relation, isQrScan: boolean): boolean {
  if (relation === 'owner') return true;
  if (isQrScan) {
    // Quien escanea un QR es, por definición, un desconocido anónimo — no
    // hay relación de "seguidor" que verificar contra la base de datos. La
    // regla de la Fase 2 es sobre el CONTENIDO que se muestra (nunca más
    // que lo que vería un seguidor), no sobre exigir que ya sea uno: si el
    // perfil no está en privado, se muestra la misma vista que vería un
    // seguidor — nunca más, aunque el perfil esté en público.
    return effectiveVisibility !== 'private';
  }
  if (effectiveVisibility === 'public') return true;
  if (effectiveVisibility === 'followers') return relation === 'follower';
  return false; // private
}

export async function getProfileView(
  targetCustomerId: string,
  viewerCustomerId: string | null,
  options: { isQrScan?: boolean } = {}
): Promise<ProfileView | null> {
  const db = getDb();
  const isQrScan = options.isQrScan ?? false;

  const [profile] = await db.select().from(socialProfiles).where(eq(socialProfiles.customerId, targetCustomerId)).limit(1);
  if (!profile) return null; // nunca activó nada social — no hay perfil público que mostrar

  const relation = await getRelation(targetCustomerId, viewerCustomerId);

  // Bloqueo, en cualquier dirección — corta todo, sin importar la relación.
  if (viewerCustomerId && relation !== 'owner') {
    const [blockedRow] = await db
      .select()
      .from(blocks)
      .where(
        and(
          eq(blocks.blockerId, targetCustomerId), eq(blocks.blockedId, viewerCustomerId)
        )
      )
      .limit(1);
    const [blockingRow] = await db
      .select()
      .from(blocks)
      .where(and(eq(blocks.blockerId, viewerCustomerId), eq(blocks.blockedId, targetCustomerId)))
      .limit(1);
    if (blockedRow || blockingRow) return null;
  }

  const targetIsMinor = isMinor(profile.dateOfBirth);
  // Fuerza el default más restrictivo si es menor, sin importar lo guardado.
  const effectiveProfileVisibility = targetIsMinor ? 'private' : profile.profileVisibility;
  const effectiveVaultVisibility = targetIsMinor ? 'private' : profile.vaultVisibility;

  if (!canView(effectiveProfileVisibility, relation, isQrScan)) return null;

  const showVault = canView(effectiveVaultVisibility, relation, isQrScan);
  let vault: ProfileView['vault'] = [];
  if (showVault) {
    const rows = await db.select().from(vaultItems).where(eq(vaultItems.customerId, targetCustomerId));

    // La categoría (productType de Shopify) no vive en vault_items — vive en
    // el catálogo. Se cruza por productId para poder repartir las piezas en
    // zonas. Si el catálogo no responde, la bóveda se muestra igual: las
    // piezas caen todas en la vitrina (el default de mapCategory), que es
    // menos afirmativo que meterlas en Sneakers sin saber.
    let categoryById = new Map<string, string>();
    if (rows.length > 0) {
      try {
        const { products } = await getCatalogLive({ includeHidden: true });
        categoryById = new Map(products.map((p) => [p.id, p.category]));
      } catch (err) {
        console.error('No se pudo cruzar el catálogo para las zonas de la bóveda pública:', err);
      }
    }

    vault = rows.map((v) => ({
      id: v.id,
      title: v.title,
      imageUrl: v.imageUrl,
      note: v.note,
      productId: v.productId,
      serialNumber: v.serialNumber,
      category: (v.productId && categoryById.get(v.productId)) || '',
    }));
  }

  let followerCount: number | null = null;
  if (profile.showFollowerCount || relation === 'owner') {
    const rows = await db.select().from(follows).where(and(eq(follows.followeeId, targetCustomerId), eq(follows.status, 'accepted')));
    followerCount = rows.length;
  }

  return {
    customerId: targetCustomerId,
    username: profile.username,
    bio: profile.bio,
    canShowTier: profile.showTier || relation === 'owner',
    followerCount,
    vault,
    isOwner: relation === 'owner',
  };
}
