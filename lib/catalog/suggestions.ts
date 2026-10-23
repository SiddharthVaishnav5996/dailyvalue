import type { AIItem, Product } from "@/lib/types";
import { PRODUCTS, PRODUCT_BY_ID } from "@/lib/catalog/products";

/*
 * "People also bought" — complementary products for the current search.
 * ---------------------------------------------------------------------------
 * The checkout page used to show the same four hand-picked cards no matter what
 * the shopper had searched for, which read as decoration rather than a
 * suggestion: a cheesecake basket and a mattress basket both offered baking
 * paper.
 *
 * So the picks are derived from the search itself. The shopping list says which
 * catalog CATEGORIES this trip is about; the suggestions come from those same
 * categories, minus anything the shopper already has. A cheesecake search
 * suggests more Dairy/Pantry/Bakery; a mattress search suggests Furniture/Home.
 *
 * Deliberately NOT random. The same search always produces the same four cards,
 * so they don't shuffle under the shopper on a re-render or a refresh - they
 * only change when the search does.
 */

/**
 * How many cards the strip shows.
 *
 * Six, because the grid is three across (see .suggestionGrid in
 * app/results/order/page.module.css) and a count that is not a multiple of
 * three strands the remainder alone on the last row. Four used to be right
 * when the grid was two across.
 */
const DEFAULT_COUNT = 6;

/**
 * Which shopping "world" each catalog category belongs to.
 *
 * A one-item search ("queen mattress") can't fill four cards from its own
 * category, so the strip widens to that category's neighbours instead. Without
 * this it widened to the grocery aisles and offered brown rice and soda next to
 * a mattress, which is the same nonsense the static cards used to produce.
 */
const CATEGORY_WORLD: Record<string, string> = {
  Dairy: "food",
  Produce: "food",
  Bakery: "food",
  Meat: "food",
  Pantry: "food",
  Beverages: "food",
  Snacks: "food",
  Frozen: "food",
  Alcohol: "food",
  // Easy to miss when a category is added to the catalog: an unmapped category
  // has no world, so its searches skip the neighbour tier and drop straight to
  // FILLER_CATEGORIES. These two did, which cost a breakfast search its Dairy
  // and Bakery neighbours.
  Breakfast: "food",
  Deli: "food",
  Household: "home",
  Home: "home",
  Furniture: "home",
  Seasonal: "home",
  Garden: "home",
  Hardware: "home",
  Appliances: "home",
  Automotive: "home",
  // General merchandise rather than a world of its own: "Electronics" is the
  // only tech category, so on its own it has no neighbours and a laptop search
  // fell all the way through to the grocery fillers.
  Electronics: "home",
  "Personal Care": "personal",
  Beauty: "personal",
  Health: "personal",
  Baby: "family",
  "Baby Gear": "family",
  Toys: "family",
  Pet: "family",
  "Pet Supplies": "family",
  Sports: "lifestyle",
  "School & Office": "lifestyle",
  Clothing: "lifestyle",
};

/** Last resort, for a search with no recognisable category at all. */
const FILLER_CATEGORIES = ["Pantry", "Snacks", "Beverages", "Bakery", "Produce"];

/**
 * Every other category sharing a world with one of these.
 *
 * Seeded by the query rather than sorted alphabetically, which otherwise made
 * "Appliances" and "Automotive" the permanent runners-up for every home search.
 */
function neighbourCategories(ranked: string[], seed: string): string[] {
  const worlds = new Set(ranked.map((c) => CATEGORY_WORLD[c]).filter(Boolean));
  if (!worlds.size) return [];
  return Object.keys(CATEGORY_WORLD)
    .filter((c) => worlds.has(CATEGORY_WORLD[c]) && !ranked.includes(c))
    .sort((a, b) => rankHash(seed, a) - rankHash(seed, b));
}

/**
 * Stable per-product ordering seed.
 *
 * FNV-1a over the query + product id. It gives each product a fixed pseudo-
 * random rank *for this query*, which is what makes two different searches in
 * the same category surface different products while either one on its own
 * stays put. Hashing beats "take the first four alphabetically", which would
 * show the same Pantry items for every Pantry search.
 */
function rankHash(seed: string, id: string): number {
  let h = 0x811c9dc5;
  const s = `${seed}::${id}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** A catalog id from a resolved product id: "p-cream-cheese" -> "cream-cheese". */
function catalogIdOf(resolvedId: string): string {
  return resolvedId.startsWith("p-") ? resolvedId.slice(2) : resolvedId;
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * The catalog categories this search is about, most-used first.
 *
 * Read from the products the list actually resolves to where possible, because
 * the model's own `category` is a display label ("Baking") that need not match
 * a catalog category ("Pantry").
 */
function searchCategories(items: AIItem[]): string[] {
  const byName = new Map<string, Product>();
  for (const p of PRODUCTS) byName.set(normalize(p.name), p);

  const counts = new Map<string, number>();
  for (const item of items) {
    const product =
      (item.catalogId ? PRODUCT_BY_ID[item.catalogId] : undefined) ??
      byName.get(normalize(item.name));

    const category = product?.category ?? item.category;
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category]) => category);
}

export interface SuggestionOptions {
  /** How many to return. Defaults to 4. */
  count?: number;
  /**
   * Resolved product ids the shopper already has - the search's own cards and
   * whatever is in the cart. Suggesting something already in the basket is the
   * fastest way to make the strip look broken.
   */
  exclude?: string[];
}

/**
 * Pick complementary catalog products for a shopping list, as AIItems ready for
 * `resolveItems` - so the cards are built by exactly the same pipeline (photos,
 * per-store offers, prices) as the search's own.
 */
export function suggestionItems(
  items: AIItem[],
  query: string,
  options: SuggestionOptions = {},
): AIItem[] {
  const count = options.count ?? DEFAULT_COUNT;

  // Everything the shopper already has, as catalog ids plus names - a curated
  // card ("cc-philadelphia") shares no id with its catalog entry, so the name
  // is what actually catches the duplicate.
  const takenIds = new Set<string>();
  const takenNames = new Set<string>();
  for (const id of options.exclude ?? []) takenIds.add(catalogIdOf(id));
  for (const item of items) {
    if (item.catalogId) takenIds.add(item.catalogId);
    takenNames.add(normalize(item.name));
  }

  const ranked = searchCategories(items);
  // The search's own categories first, then their neighbours in the same world,
  // then - only for a search we couldn't place at all - the grocery fillers.
  // Each tier only gets used once the one above it runs out.
  const neighbours = neighbourCategories(ranked, query);
  const categories = [
    ...ranked,
    ...neighbours,
    ...FILLER_CATEGORIES.filter((c) => !ranked.includes(c) && !neighbours.includes(c)),
  ];

  // Candidates per category, each ordered by the query-seeded hash.
  const pools = new Map<string, Product[]>();
  for (const category of categories) {
    const pool = PRODUCTS.filter(
      (p) =>
        p.category === category &&
        !takenIds.has(p.id) &&
        !takenNames.has(normalize(p.name)) &&
        // No prices means no offer, which means no card worth showing.
        Object.keys(p.prices ?? {}).length > 0,
    ).sort((a, b) => rankHash(query, a.id) - rankHash(query, b.id));

    if (pool.length) pools.set(category, pool);
  }

  // Round-robin across the categories so four suggestions aren't four yoghurts.
  // Falling through to a second pass lets one rich category fill the strip when
  // the others are exhausted.
  const picked: Product[] = [];
  const cursor = new Map<string, number>();
  let exhausted = false;
  while (picked.length < count && !exhausted) {
    exhausted = true;
    for (const category of categories) {
      if (picked.length >= count) break;
      const pool = pools.get(category);
      if (!pool) continue;
      const next = cursor.get(category) ?? 0;
      if (next >= pool.length) continue;
      picked.push(pool[next]);
      cursor.set(category, next + 1);
      exhausted = false;
    }
  }

  return picked.map((product) => ({
    // Not fulfilling any table row - these are extras, not part of the recipe.
    rowIds: [],
    name: product.name,
    brandHint: product.brand || null,
    category: product.category,
    department: "grocery",
    catalogId: product.id,
    searchTerms: product.searchTerms ?? [],
    quantity: 1,
    packSize: product.size || null,
    estimatedPrice: null,
  }));
}
