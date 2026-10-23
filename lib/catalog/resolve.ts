import Fuse from "fuse.js";
import type { AIItem, Offer, Product, ResolvedProduct } from "@/lib/types";
import { PRODUCTS, PRODUCT_BY_ID } from "@/lib/catalog/products";
import { findCurated, seedOfferFor } from "@/lib/catalog/curated";
import { STORES, STORE_BY_ID, CATALOG_STORE_IDS, storesForDepartment } from "@/data/stores";
import {
  findStoreBrand,
  productBrandAt,
  storeBrandFor,
  type StoreBrand,
} from "@/data/brands";
import { brandPhotoFor } from "@/lib/catalog/brandPhotos";
import { itemPhotoFor } from "@/lib/catalog/itemPhotos";
import { offerPhotoFor, verifiedPhotoFor } from "@/lib/catalog/imageDb";
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
 *   2. THE CATALOG (data/products.json). 1000 seeded grocery products.
 *      The original 39 carry hand-checked per-store prices; the rest are
 *      priced deterministically from a base (scripts/expand-catalog.mjs), so
 *      treat those numbers as plausible rather than real. Most now have a
 *      photo too - a store-brand packshot via brandPhotos.ts, or, for things
 *      sold loose like produce and fresh meat, one generic shot via
 *      itemPhotos.ts. Items with neither still fall back to the emoji tile.
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
  // Not groceries, but the catalog stocks them now. Gate 2 below still keeps
  // a fuzzy hit inside its own department, so a mattress can only ever match
  // furniture - never tomatoes.
  "electronics", "furniture",
  "appliances", "home", "hardware", "automotive", "garden", "sports",
  "alcohol", "office", "toys", "pharmacy", "pet", "babygear", "clothing",
]);

/** Catalog departments that are not food. See resolveItems for why it matters. */
const NON_GROCERY_CATEGORY_DEPTS = new Set([
  "electronics", "furniture",
  "appliances", "home", "hardware", "automotive", "garden", "sports",
  "alcohol", "office", "toys", "pharmacy", "pet", "babygear", "clothing",
]);

/** Catalog category -> the department that category belongs to. */
const CATEGORY_DEPARTMENT: Record<string, string> = {
  Dairy: "dairy",
  Produce: "produce",
  Bakery: "bakery",
  Meat: "meat",
  Pantry: "pantry",
  Beverages: "beverages",
  Electronics: "electronics",
  Furniture: "furniture",
  Appliances: "appliances",
  Home: "home",
  Hardware: "hardware",
  Automotive: "automotive",
  Garden: "garden",
  Sports: "sports",
  Alcohol: "alcohol",
  "School & Office": "office",
  Toys: "toys",
  Beauty: "pharmacy",
  Seasonal: "home",
  "Pet Supplies": "pet",
  "Baby Gear": "babygear",
  Clothing: "clothing",
  Health: "pharmacy",
};

/** The department a catalog product really sits in, from its own category. */
function departmentOf(product: Product): string {
  return CATEGORY_DEPARTMENT[product.category] ?? "grocery";
}

/*
 * Words that describe a product without saying WHICH product it is. "Ground"
 * is true of nutmeg, turmeric and coffee alike, so it must never be the thing
 * a fuzzy match is built on.
 */
const MODIFIERS = new Set([
  "ground", "fresh", "whole", "large", "small", "organic", "plain", "pure",
  "raw", "dried", "frozen", "canned", "sliced", "chopped", "unsalted",
  "salted", "light", "mini", "baby", "sweet", "instant", "natural", "free",
  "range", "extra", "fine", "coarse", "boneless", "skinless", "low", "half",
]);

/** The words in a name that actually identify the product. */
function distinctiveWords(name: string): string[] {
  return normalize(name)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !MODIFIERS.has(w));
}

/**
 * Does this product plausibly answer that name?
 *
 * A fuzzy score says "these strings look alike", which is not the same as
 * "this is the thing you asked for". "Ground nutmeg" scores 0.13 against
 * Ground Turmeric purely on the shared word "ground", and the model's own
 * hint "spice" scores a PERFECT 0.0 against Steak Spice - so no score
 * threshold can catch either. What catches them is insisting the match
 * carries one of the words that made the request specific: nutmeg.
 *
 * Substring either way, so "cornflour" still reaches "flour".
 */
function answersTo(product: Product, words: string[]): boolean {
  if (words.length === 0) return true; // nothing specific was asked for
  const hay = normalize([product.name, ...(product.searchTerms ?? [])].join(" "));
  const hayWords = hay.split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
  return words.some((w) => hay.includes(w) || hayWords.some((h) => w.includes(h)));
}

/** Find the catalog product for an item, or null. */
function findInCatalog(item: AIItem): Product | null {
  // 0) The item's own name is a catalog name or alias. Pure lookup, so it
  //    wins: "All-purpose flour" is the flour product even when the model's
  //    catalogId pointed at whole wheat flour.
  const own = normalize(item.name);
  const named = EXACT.get(own) ?? EXACT.get(own.replace(/s$/, ""));
  if (named) return named;

  // 1) The model picked an id from the catalog list (already validated in
  //    normalizeItem). This is what keeps a reworded name ("block of butter")
  //    on the same product from one run to the next.
  if (item.catalogId) return PRODUCT_BY_ID[item.catalogId] ?? null;

  // Gate 1: is this even a grocery?
  if (!GROCERY_DEPARTMENTS.has(item.department)) return null;

  const candidates = [item.name, ...(item.searchTerms ?? [])]
    .filter(Boolean)
    .map(normalize);

  // 2) Exact or alias hit on the model's aliases. Also try stripping a
  //    trailing "s" so "lemons" finds "lemon".
  for (const c of candidates) {
    const hit = EXACT.get(c) ?? EXACT.get(c.replace(/s$/, ""));
    if (hit) return hit;
  }

  // 3) Fuzzy fallback across every candidate phrase, best score wins.
  //    In Fuse, LOWER is better: 0 is a perfect match, 1 is no match at all.
  //
  //    The match must answer the item's NAME, not merely the hint phrase that
  //    found it: searchTerms may propose a candidate, the name has to approve
  //    it. Without that, the hint "spice" on an item named "Ground nutmeg"
  //    matched Steak Spice PERFECTLY (score 0.0000) and shipped it as a
  //    success - a missing product becoming a wrong one rather than a visible
  //    gap. No score threshold can catch that, because the right answers
  //    score 0.0000 too.
  //
  //    The approval is checked INSIDE the loop, per candidate, so that a
  //    rejected front-runner does not sink the whole lookup. Checking it
  //    afterwards on a single winner meant "Turmeric" with the hints
  //    ["turmeric", "spice"] resolved to nothing at all: "spice" won on
  //    score, failed approval, and Ground Turmeric - sitting right there in
  //    the catalog, found by the other hint - never got its turn.
  const wanted_ = distinctiveWords(item.name);
  let best: Product | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    for (const hit of fuse.search(c, { limit: 8 })) {
      if (typeof hit.score !== "number" || hit.score >= bestScore) continue;
      if (!answersTo(hit.item, wanted_)) continue;
      bestScore = hit.score;
      best = hit.item;
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

/**
 * Which brand this shop would actually be selling for this item.
 *
 * Three cases, and the middle one is the one that used to be wrong:
 *
 *   "Philadelphia cream cheese"  a NATIONAL brand. Every shop that stocks the
 *                                department sells it. Compare away.
 *
 *   "Great Value white bread"    a STORE brand. Walmart sells it; Costco
 *                                cannot. Rather than drop the other shops -
 *                                which would leave nothing to compare - each
 *                                one offers its own equivalent, at the same
 *                                tier where it has one. The shopper sees that
 *                                No Name is forty cents less AND that it is a
 *                                different loaf, which is the real decision.
 *
 *   "white bread"                no brand asked for. Each shop puts forward
 *                                its own, so the comparison reads Great Value
 *                                / Compliments / Selection instead of three
 *                                identical nameless rows.
 */
function brandForStore(storeId: string, department: string, wanted: string): string {
  if (wanted) {
    const owned = findStoreBrand(wanted);
    if (!owned) return wanted; // national brand: sold everywhere
    if (owned.storeIds.includes(storeId)) return owned.name; // its own shop
    const equivalent = storeBrandFor(storeId, department, owned.tier);
    return equivalent ? equivalent.name : "";
  }

  const own = storeBrandFor(storeId, department);
  return own ? own.name : "";
}

/** Build one store's offer for a product. */
function makeOffer(
  storeId: string,
  productKey: string,
  price: number,
  brand: string,
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
    brand: brand || undefined,
    isOwnBrand: brand ? findStoreBrand(brand)?.storeIds.includes(storeId) : undefined,
    promo: STORE_PROMOS[storeId],
  };
}

/**
 * Offers for a catalog product.
 *
 * The four seeded stores use their real prices from products.json. Any other
 * store that stocks this department gets a generated price anchored to the
 * average of those real ones, so the wider comparison stays believable.
 */
function offersForCatalogProduct(
  product: Product,
  department: string,
  wantedBrand: string,
  /**
   * Is this one of the hand-photographed cards?
   *
   * If so, hands off. A curated card is ONE specific package that somebody
   * photographed: a Great Value egg carton, a Becel tub. Two things must not
   * happen to it.
   *
   * It must not be given each shop's own brand, or the card ends up captioned
   * "No Name" under a photograph of a Great Value carton - which is exactly
   * what it did before this flag existed.
   *
   * And it must not be given a seeded packshot, because its own photograph was
   * fitted to the card frame by hand and outranks everything. See the ladder
   * in lib/catalog/brandPhotos.ts.
   */
  isCurated: boolean,
): Offer[] {
  // Every stored price anchors the rest: an LCBO-only bottle has no grocery
  // price, and must not fall back to the $3.99 default below.
  const realPrices = Object.values(product.prices).filter(
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

    // What this shop really sells for this product, when somebody has been
    // in the shop and written it down. It beats the aisle-level guess, and
    // brings a photograph of the exact package with it.
    const known = isCurated ? null : productBrandAt(product.id, store.id);

    const brand = isCurated
      ? ""
      : (known?.brand ?? brandForStore(store.id, department, wantedBrand));
    const offer = makeOffer(store.id, product.id, price, brand);
    if (offer) {
      if (known?.image) {
        offer.imageSrc = known.image;
      } else if (!isCurated) {
        /*
         * Two seeded sources, best first. Anything hand-picked was already
         * handled above by `known?.image` - see PRODUCT_BRAND_AT.
         *
         * 1. The store's OWN packshot, which is the whole point of the
         *    comparison: the Great Value tub and the Compliments tub are
         *    different products and should look it.
         * 2. One GENERIC photo, for things sold loose - produce, fresh meat -
         *    that carry no store brand at all. Without this those cards kept
         *    the emoji tile while a real photograph sat unused in
         *    data/itemPhotos.json.
         */
        const photo = brandPhotoFor(product.name, brand);
        if (photo) {
          offer.imageSrc = photo.image;
        } else {
          const generic = itemPhotoFor(product.id);
          if (generic) offer.imageSrc = generic.image;
        }
      }
      offers.push(offer);
    }
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
  basePrice: number | undefined,
  wantedBrand: string,
  /** Hand-photographed card? Then it keeps its own brand - see above. */
  isCurated: boolean,
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
      makeOffer(
        store.id,
        productKey,
        priceAt(base, productKey, store.id, store.priceIndex),
        isCurated ? "" : brandForStore(store.id, item.department, wantedBrand),
      ),
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
 * The brand used to be glued onto the front of this: "Philadelphia Cream
 * Cheese 250 g". It is not any more, because the brand moved onto the OFFER -
 * it changes from shop to shop - and the card prints it on its own line above
 * the name. Leaving it here as well printed it twice.
 *
 * Note that the AI puts the brand in both its fields, so a name often still
 * contains it ("Inniskillin Vidal Icewine"). That is fine and is left alone:
 * the card hides its brand line when the name already says it.
 */
/**
 * Take a store brand off the front of a name.
 *
 * The model names things like "Great Value Large Eggs" even when it was asked
 * not to, and that name then sits under a brand line reading "No Name" at No
 * Frills, because No Frills cannot sell Great Value. Two different brands on
 * one card is worse than either.
 *
 * So the name is made generic and the brand line carries the brand - which is
 * the point of moving it onto the offer in the first place. National brands
 * are left alone: "Philadelphia Cream Cheese" is that product everywhere.
 *
 * A prompt asking the model to stop doing this exists too. This is the part
 * that actually holds, because it does not depend on the model complying.
 */
function storeBrandInName(name: string): StoreBrand | null {
  const words = name.trim().split(/\s+/);
  // Longest first, so "Kirkland Signature" is found rather than nothing.
  // Never takes the whole name - something has to be left to call the product.
  for (let take = Math.min(3, words.length - 1); take >= 1; take--) {
    const brand = findStoreBrand(words.slice(0, take).join(" "));
    if (brand) return brand;
  }
  return null;
}

function withoutStoreBrand(name: string): string {
  const brand = storeBrandInName(name);
  if (!brand) return name;
  return name.trim().split(/\s+/).slice(brand.name.trim().split(/\s+/).length).join(" ");
}

function describe(item: AIItem, product: Product | null): string {
  const name = withoutStoreBrand(product?.name ?? item.name);
  const size = (product?.size ?? item.packSize ?? "").trim();

  // Strip punctuation and spaces before comparing, so "10,000 BTU" is
  // recognised inside "…air conditioner 10000 BTU".
  const flatten = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hasSize = size !== "" && flatten(name).includes(flatten(size));

  return [name, hasSize ? "" : size].filter(Boolean).join(" ");
}

/**
 * Keep the variant the shopper asked for. "Unsalted butter" resolves to the
 * one butter product, but the card should still say "Unsalted Butter 454 g".
 * Only a name listed in the product's own searchTerms counts as a variant, so
 * the catalog decides what is a variant and the model cannot invent one
 * ("all-purpose" is not a kind of whole wheat flour).
 */
function variantOf(item: AIItem, product: Product | null): string | null {
  if (!product?.searchTerms.map(normalize).includes(normalize(item.name))) return null;
  const asked = normalize(item.name).split(" ");
  const base = new Set(normalize(product.name).split(" "));
  const lead = asked.findIndex((w) => base.has(w));
  if (lead < 1 || lead > 2) return null;
  if (!asked.slice(lead).every((w) => base.has(w))) return null;
  return asked.slice(0, lead).join(" ");
}

function withVariant(description: string, variant: string | null): string {
  if (!variant || normalize(description).startsWith(variant)) return description;
  const qualifier = variant
    .split(" ")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  return `${qualifier} ${description}`;
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
    // A curated electronics or furniture card (the iPhones, the fans) is its
    // own product with its own prices. The generic catalog entry it happens
    // to resemble ("Unlocked Android Smartphone") must not price it - that
    // put an iPhone 17 Pro at $357.
    const catalogHit = findInCatalog(item);
    const product =
      curated && catalogHit && NON_GROCERY_CATEGORY_DEPTS.has(departmentOf(catalogHit))
        ? null
        : catalogHit;

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

    // The brand the shopper asked for, if any. Worked out once, then handed to
    // every offer - which decides for itself what IT is allowed to sell.
    const wantedBrand = (product?.brand || item.brandHint || "").trim();

    let rawOffers: Offer[];
    if (curated?.storeOffers) {
      // A Product-pop defines this product's shops by hand. Those prices were
      // chosen deliberately, so use them rather than generating over the top.
      rawOffers = curated.storeOffers;
    } else if (product) {
      // Use the product's OWN department, not the AI's guess. Otherwise a
      // mislabelled item can list milk at a hardware store.
      rawOffers = offersForCatalogProduct(
        product,
        departmentOf(product),
        wantedBrand,
        Boolean(curated),
      );
    } else {
      // A curated card's own price is the most trustworthy number we have for
      // it, so it anchors the other shops rather than the model's guess.
      rawOffers = offersForGeneratedProduct(
        item,
        productKey,
        curated?.price,
        wantedBrand,
        Boolean(curated),
      );
    }

    // Keep the shop and price the curated card was designed around, by putting
    // it into the comparison rather than letting a generated price replace it.
    if (curated && !curated.storeOffers) {
      const seed = seedOfferFor(curated);
      if (seed) rawOffers = [seed, ...rawOffers.filter((o) => o.id !== seed.id)];
    }

    const variant = variantOf(item, product);
    const baseDescription = withVariant(curated?.description ?? describe(item, product), variant);

    // A verified photo replaces every older image for this product. Each shop
    // keeps its own verified packshot when it has one; the rest drop their old
    // photo so the card falls back to the product's verified one. Copies, not
    // edits: curated storeOffers are shared module data.
    const verified = verifiedPhotoFor(product?.id, variant);
    if (verified && product) {
      rawOffers = rawOffers.map((o) => {
        const own = offerPhotoFor(product.id, variant, o.id, wantedBrand);
        // The label must name what the photo shows: a Great Value packshot
        // under a "Compliments" label is the mislabelling this database exists
        // to end.
        const brand = own?.brand || o.brand;
        return {
          ...o,
          imageSrc: own?.file,
          brand,
          isOwnBrand: brand ? findStoreBrand(brand)?.storeIds.includes(o.id) : undefined,
        };
      });
    }

    // A card that IS a shop's own product may only be offered by that shop.
    //
    // The eggs card is a photograph of a Great Value carton, and it was being
    // offered at No Frills - which cannot sell Great Value, because it is
    // Walmart's. This is different from a shopper ASKING for Great Value: then
    // the other shops offer their own equivalent, which is useful. Here the
    // product itself is Walmart's, so there is nothing to substitute.
    //
    // Once the product has verified photos, each shop shows its own packshot
    // (or a national brand's), so the card is no longer one shop's product:
    // drop the store brand from the title and let every shop offer it.
    const description =
      verified && !item.brandHint ? withoutStoreBrand(baseDescription) : baseDescription;
    const ownedBrand = verified ? null : storeBrandInName(description);
    if (ownedBrand) {
      const onlyItsOwn = rawOffers.filter((o) => ownedBrand.storeIds.includes(o.id));
      // Unless that leaves nothing at all - a card with no shop is worse than
      // a card at a shop we are unsure about.
      if (onlyItsOwn.length > 0) rawOffers = onlyItsOwn;
    }

    // Shops a person has told us do not carry this. See notSoldAt in
    // lib/catalog/curated.ts.
    if (curated?.notSoldAt?.length) {
      const stocked = rawOffers.filter((o) => !curated.notSoldAt!.includes(o.id));
      if (stocked.length > 0) rawOffers = stocked;
    }

    if (rawOffers.length === 0) {
      unresolved.push(item.name);
      continue;
    }

    const offers = rankOffers(rawOffers);

    byId.set(id, {
      id,
      rowIds: [...item.rowIds],
      description,
      brand: wantedBrand,
      category: product?.category || item.category,
      department: item.department,
      packSize: product?.size || item.packSize || "",
      emoji: product?.emoji || emojiFor(item),
      // The curated photo and its exact fit, untouched. Nothing else in the
      // pipeline may override these - see attachImages, which skips any
      // product that already has an image.
      imageSrc: verified?.file ?? curated?.imageSrc,
      imageAlt: verified?.productTitle ?? curated?.imageAlt,
      imageFit: verified ? "contain" : (curated?.imageFit ?? "contain"),
      source: curated ? "curated" : product ? "catalog" : "generated",
      offers,
      quantity: item.quantity,
    });
  }

  return { products: [...byId.values()], unresolved };
}
