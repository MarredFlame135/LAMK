// src/lib/vault-zones.ts
//
// Reparte la colección de un coleccionista en las tres zonas del "Closet
// Digital" (/vault y /vault/[handle]).
//
// La clasificación NO es propia: sale de mapCategory() en
// lib/product-category.ts, la misma tabla con la que el catálogo decide en
// qué categoría cae cada producto. Si una gorra sale en Accesorios en el
// catálogo, tiene que salir en la Vitrina aquí — no en un lugar distinto
// porque esta pantalla tenga su propio criterio.
//
// `CollectionItem.category` guarda el `productType` CRUDO de Shopify
// (CASUAL, ROPA, JOYERÍA...), no la categoría ya normalizada, por eso hay
// que pasarlo por mapCategory y no compararlo directo.

import { CollectionItem } from '@/types/user';
import { mapCategory, ProductCategory } from './product-category';

export type VaultZoneId = 'SNEAKER_VAULT' | 'APPAREL_WARDROBE' | 'LUXURY_VITRINE';

export interface VaultZone {
  id: VaultZoneId;
  letter: 'A' | 'B' | 'C';
  title: string;
  subtitle: string;
  items: CollectionItem[];
}

const ZONE_BY_CATEGORY: Record<ProductCategory, VaultZoneId> = {
  SNEAKERS: 'SNEAKER_VAULT',
  APPAREL: 'APPAREL_WARDROBE',
  // Gorras, bolsos, relojes y joyería comparten vitrina: son las piezas que
  // se exhiben detrás de cristal, no sobre un pedestal ni colgadas.
  ACCESSORIES: 'LUXURY_VITRINE',
  JEWELRY: 'LUXURY_VITRINE',
  COLLECTIBLES: 'LUXURY_VITRINE',
};

export function zoneForItem(item: CollectionItem): VaultZoneId {
  return ZONE_BY_CATEGORY[mapCategory(item.category)];
}

const ZONE_META: Record<VaultZoneId, { letter: 'A' | 'B' | 'C'; title: string; subtitle: string }> = {
  SNEAKER_VAULT: {
    letter: 'A',
    title: 'SNEAKER VAULT',
    subtitle: 'Calzado sobre pedestal, con luz dirigida',
  },
  APPAREL_WARDROBE: {
    letter: 'B',
    title: 'APPAREL WARDROBE',
    subtitle: 'Prendas colgadas en riel suspendido',
  },
  LUXURY_VITRINE: {
    letter: 'C',
    title: 'LUXURY VITRINE',
    subtitle: 'Gorras, bolsos y joyería tras cristal ahumado',
  },
};

const ZONE_ORDER: VaultZoneId[] = ['SNEAKER_VAULT', 'APPAREL_WARDROBE', 'LUXURY_VITRINE'];

// Devuelve SOLO las zonas que tienen piezas. Una vitrina vacía con un
// "no hay nada aquí todavía" repetido tres veces convierte una bóveda
// nueva en tres cajas tristes; el mismo criterio de esconder secciones sin
// datos reales que ya usan SocialProofSection e IGLiveMonitor.
export function groupIntoZones(collection: CollectionItem[]): VaultZone[] {
  const buckets = new Map<VaultZoneId, CollectionItem[]>();
  for (const item of collection) {
    const zone = zoneForItem(item);
    const list = buckets.get(zone) ?? [];
    list.push(item);
    buckets.set(zone, list);
  }

  return ZONE_ORDER.filter((id) => (buckets.get(id)?.length ?? 0) > 0).map((id) => ({
    id,
    ...ZONE_META[id],
    items: buckets.get(id)!,
  }));
}

// Año que se muestra en la placa de cada pieza. Es el año de ADQUISICIÓN
// (order.processedAt real), no el año de lanzamiento del modelo: Shopify no
// guarda en ningún lado cuándo salió al mercado un sneaker, y `publishedAt`
// es cuándo LAMK lo publicó en SU tienda, que no es lo mismo. Etiquetar eso
// como "lanzamiento" sería inventar un dato — se muestra como ADQUIRIDO.
export function acquisitionYear(item: CollectionItem): string | null {
  if (!item.purchaseDate) return null;
  const year = new Date(item.purchaseDate).getFullYear();
  return Number.isFinite(year) ? String(year) : null;
}
