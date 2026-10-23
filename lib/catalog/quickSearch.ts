import Fuse from "fuse.js";
import type { AIItem, Product } from "@/lib/types";
import { PRODUCTS } from "@/lib/catalog/products";

/*
 * Catalog quick search — the header bar's instant product lookup.
 * ---------------------------------------------------------------------------
 * The main search bar asks an AI to plan a whole shop. That is the right tool
 * for "what do I need for a cheesecake", and the wrong one for "milk": it
 * costs a model call and a page navigation to answer a question the catalog
 * already knows.
 *
 * So this is the other half of the product — the shopper who knows exactly
 * what they want. Type a word, match it straight against the 2,000-product
 * catalog, and hand back products the resolver can price across every store.
 * No AI, no navigation.
 *
 * Ranking is deliberately plain rather than clever. A shopper typing "milk"
 * expects "Milk" first and "Buttermilk" further down, which is just "does the
 * word start here or merely appear somewhere" - so that is all it measures.
 * Fuzzy matching is kept as a fallback for typos, where its guesses are an
 * improvement on an empty list rather than a reshuffle of a good one.
 */

/** Below this the query is too vague to be worth a lookup. */
export const MIN_QUERY_LENGTH = 2;

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Only products we can actually price are worth offering to buy. */
const SELLABLE = PRODUCTS.filter((p) => Object.keys(p.prices ?? {}).length > 0);

/** Typo tolerance only — see the note above on why it is the fallback. */
const fuse = new Fuse(SELLABLE, {
  keys: ["name", "searchTerms"],
  ignoreLocation: true,
  threshold: 0.35,
  minMatchCharLength: MIN_QUERY_LENGTH,
});

/**
 * Catalog category -> store department, so the resolver can widen past the
 * four grocery shops. A mattress should reach Canadian Tire; without this
 * every product is priced as though it were in the dairy aisle.
 */
const CATEGORY_DEPARTMENT: Record<string, string> = {
  Dairy: "dairy",
  Produce: "produce",
  Bakery: "bakery",
  Meat: "meat",
  Pantry: "pantry",
  Beverages: "beverages",
  Snacks: "snacks",
  Frozen: "frozen",
  Alcohol: "alcohol",
  Household: "household",
  Home: "home",
  Furniture: "furniture",
  Appliances: "appliances",
  Electronics: "electronics",
  Hardware: "hardware",
  Garden: "garden",
  Baby: "baby",
  "Baby Gear": "babygear",
  Pet: "pet",
  "Pet Supplies": "pet",
  Health: "pharmacy",
  "Personal Care": "pharmacy",
  Beauty: "pharmacy",
  Sports: "sports",
  Automotive: "automotive",
  "School & Office": "office",
  Toys: "toys",
  Clothing: "clothing",
};

export function departmentFor(product: Product): string {
  return CATEGORY_DEPARTMENT[product.category] ?? "grocery";
}

/**
 * How well a product answers the query. Lower is better; Infinity is "no".
 *
 * No regular expression on purpose: the query is whatever the shopper typed,
 * and a stray "(" would otherwise throw rather than simply not match.
 */
function rank(product: Product, query: string): number {
  let best = Infinity;
  for (const term of [product.name, ...(product.searchTerms ?? [])]) {
    const t = normalize(term);
    if (!t) continue;
    if (t === query) return 0; // nothing beats an exact name
    if (t.startsWith(query)) best = Math.min(best, 1);
    else if (t.includes(` ${query}`)) best = Math.min(best, 2); // starts a word
    else if (t.includes(query)) best = Math.min(best, 3);
  }
  return best;
}

/** The products a typed query should offer, best first. */
export function searchCatalog(query: string, limit = 3): Product[] {
  const q = normalize(query);
  if (q.length < MIN_QUERY_LENGTH) return [];

  const scored: { product: Product; score: number }[] = [];
  for (const product of SELLABLE) {
    const score = rank(product, q);
    if (score < Infinity) scored.push({ product, score });
  }

  scored.sort(
    (a, b) =>
      a.score - b.score ||
      // A shorter name containing the word is usually the plain version of it:
      // "Milk" over "Milk Chocolate Digestives".
      a.product.name.length - b.product.name.length ||
      a.product.name.localeCompare(b.product.name),
  );

  if (scored.length) return scored.slice(0, limit).map((s) => s.product);

  // Nothing matched literally, so the word is probably misspelled.
  return fuse.search(q, { limit }).map((r) => r.item);
}

/**
 * Catalog products as the shopping-list items `resolveItems` expects, so these
 * rows are built by exactly the same pipeline (photos, per-store offers, real
 * prices) as the AI search's own cards.
 */
export function catalogItems(products: Product[]): AIItem[] {
  return products.map((product) => ({
    rowIds: [],
    name: product.name,
    brandHint: product.brand || null,
    category: product.category,
    department: departmentFor(product),
    catalogId: product.id,
    searchTerms: product.searchTerms ?? [],
    quantity: 1,
    packSize: product.size || null,
    estimatedPrice: null,
  }));
}
