// src/lib/product-brand.ts
//
// La MARCA real de una pieza, para poder filtrar por marca como lo hacía la
// tienda anterior (lookatmykicksmx.com tenía un menú de marcas por categoría:
// Jordan, Nike, Yeezy, Bape, Adidas, Supreme, SP5DER…).
//
// --- Por qué no sirve lo que ya había ---
//
// `guessBrandFromTitle()` (lib/shopify/index.ts) recorta la palabra de
// categoría del principio del título y devuelve TODO lo que queda antes de la
// primera comilla. Para "TENIS JORDAN 4 x OFF-WHITE 'SAIL'" devuelve
// "JORDAN 4 x OFF-WHITE", que sirve para pintar una etiqueta en la ficha pero
// no para filtrar: cada pieza produciría su propia "marca" y saldrían 200
// pastillas de una pieza cada una. Se conserva tal cual para lo que ya hace;
// esto es la otra mitad.
//
// --- Cómo funciona ---
//
// Lista ordenada de marcas conocidas; gana la PRIMERA que reconoce el título.
// El orden importa por las colaboraciones: en "JORDAN 4 x OFF-WHITE" la marca
// es Jordan y Off-White es el colaborador, así que las casas de calzado van
// antes que los colaboradores.
//
// Medido contra el catálogo vivo el 2026-09-03 (265 piezas): 252 reconocidas
// en 54 marcas, 13 sin marca — casi todas gorras con título puramente
// descriptivo ("GORRA 'CONCRETE JUNGLE'", "GORRA 'PURP'"). Esas devuelven null
// y no aparecen bajo ninguna marca; NO se les inventa una, misma regla de
// "nunca inventar datos" que sigue el resto del repo.

import { Product } from '@/types/product';

// [nombre a mostrar, patrón]. Sin `g` en las expresiones: se reutilizan entre
// llamadas y `lastIndex` haría que fallaran una de cada dos veces.
const BRAND_MATCHERS: Array<[string, RegExp]> = [
  // Casas de calzado primero: en una colaboración la marca es la casa.
  ['Jordan', /\bjordan\b/i],
  ['Yeezy', /\byeezy\b|\byzy\b/i],
  ['Nike', /\bnike\b|air force|air max|\bdunk\b/i],
  ['Adidas', /\badidas\b|\bsamba\b|\bgazelle\b|\bcampus\b|superstar|\bforum\b|adi2000/i],
  ['New Balance', /new balance|\bnb\s?\d/i],
  ['Asics', /\basics\b|\bgel-/i],
  ['Puma', /\bpuma\b/i],
  ['Vans', /\bvans\b/i],
  ['Converse', /converse/i],
  ['Crocs', /\bcrocs\b/i],
  ['Birkenstock', /birkenstock/i],
  ['On', /\boncloud|on cloud|cloudmonster|cloudtilt/i],
  ['Timberland', /timberland/i],
  ['UGG', /\bugg\b/i],
  ['Salomon', /salomon/i],
  ['Veja', /\bveja\b/i],
  ['Amiri', /\bamiri\b/i],
  ['Alexander McQueen', /mcqueen/i],
  ['Rick Owens', /rick owens/i],

  // Streetwear.
  ['Bape', /\bbape\b|bapesta|bapex|a bathing ape|baby milo|abc camo/i],
  ['Supreme', /\bsupreme\b/i],
  ['SP5DER', /sp5der|spider worldwide/i],
  ['Essentials', /essentials|fear of god/i],
  ['Anti Social Social Club', /anti ?social|\bassc\b/i],
  ['Denim Tears', /denim tears/i],
  ['Corteiz', /corteiz|\bcrtz\b/i],
  ['Stussy', /st(?:ü|u)ssy/i],
  ['Hellstar', /hellstar/i],
  ['Trapstar', /trapstar/i],
  ['Vlone', /\bvlone\b/i],
  ['Broken Planet', /broken planet/i],
  ['Syna World', /syna ?world/i],
  ['Youngla', /youngla|young la/i],
  ['Nude Project', /nude project/i],
  ['Kith', /\bkith\b/i],
  ['True Religion', /true religion/i],
  ['Uniqlo', /uniqlo/i],
  ['Liberty Walk', /liberty walk/i],
  ['Civil Regime', /civil regime/i],
  ['Carhartt', /carhartt/i],
  ['Stone Island', /stone island/i],
  ['The North Face', /north face/i],
  ['All Saints', /all ?saints/i],
  ['Electric Rage', /electric rage/i],
  ['WCC', /\bwcc\b/i],
  ['OVO', /\bovo\b/i],
  ['Off-White', /off-?white|virgil abloh/i],
  ['Palm Angels', /palm angels/i],
  ['Represent', /\brepresent\b/i],
  ['Moncler', /moncler/i],

  // Lujo y bolsos.
  ['Louis Vuitton', /louis vuitton/i],
  ['Gucci', /\bgucci\b/i],
  ['Balenciaga', /balenciaga/i],
  ['Dior', /\bdior\b/i],
  ['Prada', /\bprada\b/i],
  ['Marc Jacobs', /marc jacobs/i],
  ['Zadig & Voltaire', /zadig/i],
  ['Diesel', /\b1dr\b|\bdiesel\b/i],
  ['Van Cleef', /van cleef/i],
  ['Cartier', /cartier/i],
  ['Chrome Hearts', /chrome hearts/i],

  // Gorras — casi todas mexicanas, y son 74 piezas del catálogo: la sección
  // más grande después de sneakers y ropa. Sin estas, "filtrar por marca"
  // dejaría fuera a una de cada cuatro piezas de la tienda.
  ['31 Hats', /\b31 hats\b/i],
  ['Barbas Hats', /barbas hats/i],
  ['Rude Awakenings', /rude awakenings/i],
  ['Star Hats', /star hats/i],
  ['Dandy Hats', /dandy hats/i],
  ['Momm Hats', /\bmomm? hats\b|\bpg hats\b/i],
  ['Dreamer Hats', /dreamer hats/i],
  ['JJ Hats', /\bjj hats\b/i],
  ['DMG Brand', /\bdmg\b/i],
  ['Innedit', /innedit/i],
  ['Cashed Out', /cashed out/i],
  ['New Era', /new era/i],

  // Relojes.
  ['Laarvee', /laarvee/i],
  ['Seiko', /\bseiko\b/i],
  ['Rolex', /rolex/i],
  ['Casio', /casio|g-?shock/i],

  // Coleccionables y art toys.
  ['Bearbrick', /bearbrick|be@rbrick/i],
  ['KAWS', /\bkaws\b/i],
  ['Murakami', /murakami/i],
  ['Pop Mart', /pop ?mart|labubu|skullpanda/i],
  ['Pokémon', /pok(?:e|é)mon/i],
  ['Funko', /funko/i],

  // Artistas/colaboradores que en este catálogo SÍ encabezan la pieza — van al
  // final justo por eso: si el título también nombra una casa de calzado o de
  // ropa, gana la casa.
  ['Báez x Shifu', /b(?:á|a)ez/i],
  ['Bad Bunny', /bad bunny/i],
  ['Travis Scott', /travis scott|cactus jack/i],
];

// La marca de una pieza, o null si el título no nombra ninguna conocida.
// Devolver null y no un cajón "Otras" es deliberado: quien consume decide.
export function brandOf(product: Product): string | null {
  const title = product.title || '';
  for (const [name, re] of BRAND_MATCHERS) {
    if (re.test(title)) return name;
  }
  return null;
}

// Las marcas presentes en un conjunto de piezas, con su conteo real, de la
// que más tiene a la que menos. El conteo va en la pastilla por el mismo
// motivo que en las categorías: sin él, una marca con 27 piezas y otra con 1
// se ven igual de importantes.
export function brandsWithCounts(products: Product[]): Array<{ brand: string; count: number }> {
  const counts = new Map<string, number>();
  for (const p of products) {
    const b = brandOf(p);
    if (b) counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));
}
