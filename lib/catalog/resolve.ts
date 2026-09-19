import Fuse from "fuse.js";
import type { AIItem, Offer, Product, ResolvedProduct } from "@/lib/types";
import { PRODUCTS } from "@/lib/catalog/products";
import { findCurated, seedOfferFor } from "@/lib/catalog/curated";
import { STORES, STORE_BY_ID, CATALOG_STORE_IDS, storesForDepartment } from "@/data/stores";
import {
  originalPriceAt,
  priceAt,
  ratingAt,
  reviewCountAt,
} from "@/lib/catalog/pricing";

/*
 * Turning a shopping list into things you can actually buy.
 * ---------------------------------------------------------------------------
 * The AI gives us a list of SPECIFICATIONS ("cream cheese, dairy, 250 g,
 * about $4.49"). This file turns each one into a real product with real
 * offers from real stores. It tries three sources, best first:
 *
 *   1. THE CURATED SET (lib/catalog/curated.ts). About 36 products that were
 *      photographed and laid out by hand, each image fitted to the card frame.
 *      These are the best cards in the app, so if a search lands on one it
 *      keeps its own photo, its own product copy, and - where a Product-pop
 *      defines them - its own hand-written store prices and alternatives.
 *
 *   2. THE CATALOG (data/products.json). 39 seeded grocery products with
 *      genuine per-store prices. Stable, deliberately chosen, but no photos.
 *
 *   3. GENERATION. Nothing in either list resembles an air conditioner, so
 *      anything they cannot cover is built on the fly, priced deterministically
 *      (see lib/catalog/pricing.ts) across whichever stores stock that
 *      department, with a stock photo attached afterwards.
 *
 * This is why a mattress query works at all, while cream cheese still costs
 * what it costs and still looks like the card you designed.
 */

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Exact lookup: every catalog product name and alias, normalized. */
const EXACT: Map<string, Product> = (() => {
  const map = new Map<string, Product>();
  for (const p of PRODUCTS) {
    for (const term of [p.name, ...p.searchTerms]) {
      const key = normalize(term);
      if (!map.has(key)) map.set(key, p);
    }
  }
  return map;
})();

/** Fuzzy index, for messy names the exact table misses. */
const fuse = new Fuse(PRODUCTS, {
  keys: ["name", "searchTerms"],
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.4,
  minMatchCharLength: 2,
});

/**
 * The catalog is 100% groceries. Anything from another department must not be
 * matched against it.
 *
 * Without this gate, fuzzy matching does real damage: "queen memory foam
 * mattress" scored close enough to "tomatoes" to match it, and the resolver
 * then cheerfully offered tomatoes at Lowe's. A fuzzy matcher will always
 * find SOMETHING - the fix is to stop asking it questions it cannot answer.
 */
const GROCERY_DEPARTMENTS = new Set([
  "grocery", "produce", "dairy", "bakery", "meat",
  "pantry", "beverages", "frozen", "snacks",
]);

/** Catalog category -> the department that category belongs to. */
const CATEGORY_DEPARTMENT: Record<string, string> = {
  Dairy: "dairy",
  Produce: "produce",
  Bakery: "bakery",
  Meat: "meat",
  Pantry: "pantry",
  Beverages: "beverages",
};

/** The department a catalog product really sits in, from its own category. */
function departmentOf(product: Product): string {
  return CATEGORY_DEPARTMENT[product.category] ?? "grocery";
}

/** Find the catalog product for an item, or null. */
function findInCatalog(item: AIItem): Product | null {
  // Gate 1: is this even a grocery?
  if (!GROCERY_DEPARTMENTS.has(item.department)) return null;

  const candidates = [item.name, ...(item.searchTerms ?? [])]
    .filter(Boolean)
    .map(normalize);

  // 1) Exact or alias hit. Also try stripping a trailing "s" so "lemons"
  //    finds "lemon".
  for (const c of candidates) {
    const hit = EXACT.get(c) ?? EXACT.get(c.replace(/s$/, ""));
    if (hit) return hit;
  }

  // 2) Fuzzy fallback across every candidate phrase, best score wins.
  //    In Fuse, LOWER is better: 0 is a perfect match, 1 is no match at all.
  let best: Product | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const [top] = fuse.search(c, { limit: 1 });
    if (top && typeof top.score === "number" && top.score < bestScore) {
      bestScore = top.score;
      best = top.item;
    }
  }

  if (!best || bestScore > 0.32) return null;

  // Gate 2: a fuzzy hit must also land in the right department. "Cornflour"
  // scoring near "flour" is fine; scoring near a dairy product is not.
  const wanted = item.department;
  if (wanted !== "grocery" && departmentOf(best) !== wanted) return null;

  return best;
}

/* ---------------------------------------------------------------------------
 * Choosing the default offer
 * ------------------------------------------------------------------------ */

/**
 * Score one offer against the others so we can pick a winner.
 *
 * The brief is "cheapest and most stars first", and those two can disagree -
 * the cheapest shop is sometimes the worst reviewed. So we score both and
 * weight price higher, because price comparison is what this app is FOR.
 *
 * Returns 0 to 1, higher is better.
 */
function scoreOffer(offer: Offer, cheapest: number, dearest: number): number {
  // Where this price sits between the cheapest and dearest offer. 1 = cheapest.
  const spread = dearest - cheapest;
  const priceScore = spread > 0 ? (dearest - offer.price) / spread : 1;

  // Ratings only ever run 3.4 to 5.0 here, so stretch that band across 0 to 1.
  const ratingScore = Math.min(1, Math.max(0, (offer.rating - 3.4) / 1.6));

  return priceScore * 0.65 + ratingScore * 0.35;
}

/** Sort offers best-first. The winner becomes the card's default store. */
export function rankOffers(offers: Offer[]): Offer[] {
  if (offers.length <= 1) return offers;

  const prices = offers.map((o) => o.price);
  const cheapest = Math.min(...prices);
  const dearest = Math.max(...prices);

  return [...offers].sort(
    (a, b) => scoreOffer(b, cheapest, dearest) - scoreOffer(a, cheapest, dearest),
  );
}

/* ---------------------------------------------------------------------------
 * Building offers
 * ------------------------------------------------------------------------ */

/** Loyalty lines a few stores show in the comparison dropdown. */
const STORE_PROMOS: Record<string, string> = {
  superstore: "200 PC Optimum Points",
  freshco: "200 Scene+ Points",
  sobeys: "150 Scene+ Points",
  metro: "100 Moi Points",
  canadiantire: "Canadian Tire Money",
};

/** Build one store's offer for a product. */
function makeOffer(
  storeId: string,
  productKey: string,
  price: number,
  isFirst: boolean,
): Offer | null {
  const store = STORE_BY_ID[storeId];
  if (!store) return null;

  return {
    id: storeId,
    storeName: store.name,
    storeLogoSrc: store.logoSrc,
    storeDistanceKm: store.distanceKm,
    price,
    originalPrice: originalPriceAt(price, productKey, storeId),
    rating: ratingAt(productKey, storeId),
    reviewCount: reviewCountAt(productKey, storeId),
    promo: STORE_PROMOS[storeId],
    // Only the leading offer carries a red card badge, so the grid does not
    // turn into a wall of badges.
    cardBadge: isFirst ? undefined : undefined,
  };
}

/**
 * Offers for a catalog product.
 *
 * The four seeded stores use their real prices from products.json. Any other
 * store that stocks this department gets a generated price anchored to the
 * average of those real ones, so the wider comparison stays believable.
 */
function offersForCatalogProduct(product: Product, department: string): Offer[] {
  const realPrices = CATALOG_STORE_IDS.map((id) => product.prices[id]).filter(
    (p): p is number => typeof p === "number",
  );
  const base =
    realPrices.length > 0
      ? realPrices.reduce((a, b) => a + b, 0) / realPrices.length
      : 3.99;

  const offers: Offer[] = [];

  for (const store of STORES) {
    const real = product.prices[store.id];
    const stocksIt = store.departments.includes(department);

    // Skip stores that do not carry this kind of thing and have no real price.
    if (typeof real !== "number" && !stocksIt) continue;

    const price =
      typeof real === "number"
        ? real
        : priceAt(base, product.id, store.id, store.priceIndex);

    const offer = makeOffer(store.id, product.id, price, false);
    if (offer) offers.push(offer);
  }

  return offers;
}

/**
 * Offers for a product the AI invented, priced from a base.
 *
 * `basePrice` overrides the AI's estimate and is passed whenever we have a
 * better number - specifically, a curated card's own price. That matters more
 * than it sounds: the model sometimes omits its estimate entirely, and the old
 * fallback of $9.99 produced an iPhone 17 Pro priced at nine dollars, which
 * then won the "cheapest" ranking and became the default offer.
 */
function offersForGeneratedProduct(
  item: AIItem,
  productKey: string,
  basePrice?: number,
): Offer[] {
  const stores = storesForDepartment(item.department);

  // If the department was unrecognised, fall back to the big-box stores that
  // sell almost everything rather than showing no offers at all.
  const pool =
    stores.length > 0
      ? stores
      : STORES.filter((s) => s.id === "walmart" || s.id === "costco");

  const base = basePrice ?? item.estimatedPrice ?? 9.99;

  return pool
    .map((store) =>
      makeOffer(store.id, productKey, priceAt(base, productKey, store.id, store.priceIndex), false),
    )
    .filter((o): o is Offer => o !== null);
}

/* ---------------------------------------------------------------------------
 * Emoji tiles for generated products
 * ------------------------------------------------------------------------ */

const DEPARTMENT_EMOJI: Record<string, string> = {
  produce: "🥬", dairy: "🥛", bakery: "🍞", meat: "🥩", pantry: "🥫",
  beverages: "🧃", frozen: "🧊", snacks: "🍿", alcohol: "🍷",
  household: "🧻", home: "🏠", furniture: "🛋️", appliances: "🔌",
  electronics: "💻", hardware: "🔧", garden: "🌱", baby: "🍼",
  pet: "🐾", pharmacy: "💊", sports: "⚽", automotive: "🚗",
  grocery: "🛒",
};

/** Words that hint at a better tile than the department alone would give. */
const KEYWORD_EMOJI: [RegExp, string][] = [
  [/mattress|bed\b|pillow|duvet|blanket/, "🛏️"],
  [/air condition|\bac\b|cooler|fan\b/, "❄️"],
  [/heater|furnace/, "🔥"],
  [/wine|merlot|riesling|icewine|cabernet/, "🍷"],
  [/beer|lager|ale\b|cider/, "🍺"],
  [/whisky|whiskey|vodka|gin\b|rum\b|tequila/, "🥃"],
  [/coffee|espresso/, "☕"],
  [/\btea\b|chai/, "🍵"],
  [/tv|television|monitor/, "📺"],
  [/phone|iphone|android/, "📱"],
  [/laptop|macbook|computer/, "💻"],
  [/sofa|couch|chair|table|desk/, "🪑"],
  [/cake|dessert|pastry/, "🍰"],
  [/chocolate|cocoa/, "🍫"],
  [/rice|grain/, "🍚"],
  [/soap|detergent|cleaner|bleach/, "🧴"],
];

function emojiFor(item: AIItem): string {
  const haystack = `${item.name} ${item.category}`.toLowerCase();
  for (const [pattern, emoji] of KEYWORD_EMOJI) {
    if (pattern.test(haystack)) return emoji;
  }
  return DEPARTMENT_EMOJI[item.department] ?? "🛒";
}

/* ---------------------------------------------------------------------------
 * The resolver
 * ------------------------------------------------------------------------ */

/** A readable id from a name, e.g. "Air Conditioner" -> "air-conditioner". */
function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "item";
}

/**
 * Build the display name shown on the card.
 *
 * The brand is prepended only when the name does not already contain it,
 * otherwise you get "Inniskillin Inniskillin Icewine" - which is exactly what
 * the first run produced, because the AI puts the brand in both fields.
 */
function describe(item: AIItem, product: Product | null): string {
  const name = product?.name ?? item.name;
  const size = (product?.size ?? item.packSize ?? "").trim();
  const brand = (product?.brand || item.brandHint || "").trim();

  // Strip punctuation and spaces before comparing, so "10,000 BTU" is
  // recognised inside "…air conditioner 10000 BTU".
  const flatten = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const flatName = flatten(name);

  const hasBrand = brand !== "" && flatName.includes(flatten(brand));
  const hasSize = size !== "" && flatName.includes(flatten(size));

  return [hasBrand ? "" : brand, name, hasSize ? "" : size]
    .filter(Boolean)
    .join(" ");
}

export interface ResolveResult {
  products: ResolvedProduct[];
  /** Item names that produced no buyable offer at all. */
  unresolved: string[];
}

/**
 * Resolve every item on the shopping list.
 *
 * Items that land on the same catalog product are merged, so a recipe listing
 * sugar three times produces one card covering three table rows - which is
 * exactly how the existing cheesecake page behaves.
 */
export function resolveItems(items: AIItem[]): ResolveResult {
  const byId = new Map<string, ResolvedProduct>();
  const unresolved: string[] = [];

  for (const item of items) {
    // Three sources, best first.
    //
    // A curated product is always preferred, because it carries a real
    // photograph fitted to the card frame and real product copy. Those are the
    // best-looking cards in the app, so a search that lands on one should look
    // exactly as it already does rather than being rebuilt from scratch.
    const curated = findCurated([item.name, ...(item.searchTerms ?? [])]);
    const product = findInCatalog(item);

    const id = curated
      ? curated.id
      : product
        ? `p-${product.id}`
        : `g-${slug(item.name)}`;

    // Already built this product from an earlier item? Merge instead.
    const existing = byId.get(id);
    if (existing) {
      existing.rowIds.push(...item.rowIds);
      existing.quantity = Math.max(existing.quantity, item.quantity);
      continue;
    }

    const productKey = product ? product.id : slug(item.name);

    let rawOffers: Offer[];
    if (curated?.storeOffers) {
      // A Product-pop defines this product's shops by hand. Those prices were
      // chosen deliberately, so use them rather than generating over the top.
      rawOffers = curated.storeOffers;
    } else if (product) {
      // Use the product's OWN department, not the AI's guess. Otherwise a
      // mislabelled item can list milk at a hardware store.
      rawOffers = offersForCatalogProduct(product, departmentOf(product));
    } else {
      // A curated card's own price is the most trustworthy number we have for
      // it, so it anchors the other shops rather than the model's guess.
      rawOffers = offersForGeneratedProduct(item, productKey, curated?.price);
    }

    // Keep the shop and price the curated card was designed around, by putting
    // it into the comparison rather than letting a generated price replace it.
    if (curated && !curated.storeOffers) {
      const seed = seedOfferFor(curated);
      if (seed) rawOffers = [seed, ...rawOffers.filter((o) => o.id !== seed.id)];
    }

    if (rawOffers.length === 0) {
      unresolved.push(item.name);
      continue;
    }

    const offers = rankOffers(rawOffers);

    byId.set(id, {
      id,
      rowIds: [...item.rowIds],
      description: curated?.description ?? describe(item, product),
      brand: product?.brand || item.brandHint || "",
      category: product?.category || item.category,
      department: item.department,
      packSize: product?.size || item.packSize || "",
      emoji: product?.emoji || emojiFor(item),
      // The curated photo and its exact fit, untouched. Nothing else in the
      // pipeline may override these - see attachImages, which skips any
      // product that already has an image.
      imageSrc: curated?.imageSrc,
      imageAlt: curated?.imageAlt,
      imageFit: curated?.imageFit ?? "contain",
      source: curated ? "curated" : product ? "catalog" : "generated",
      offers,
      quantity: item.quantity,
    });
  }

  return { products: [...byId.values()], unresolved };
}
