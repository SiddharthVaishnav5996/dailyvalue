import Fuse from "fuse.js";
import type {
  AIItem,
  Offer,
  Product,
  ResolvedProduct,
  VariantFamilyInfo,
  VariantOption,
} from "@/lib/types";
import { PRODUCTS, PRODUCT_BY_ID } from "@/lib/catalog/products";
import { findCurated, seedOfferFor, type CuratedProduct } from "@/lib/catalog/curated";
import {
  familyFor,
  memberKey,
  type VariantFamily,
  type VariantMember,
} from "@/data/variants";
import { STORES, STORE_BY_ID, CATALOG_STORE_IDS, storesForDepartment } from "@/data/stores";
import {
  findStoreBrand,
  productBrandAt,
  storeBrandFor,
  type StoreBrand,
} from "@/data/brands";
import { PRODUCT_POP_BY_ID, type RelatedProduct } from "@/data/productPop";
import { bareWordProductId } from "@/data/bareWords";
import { brandPhotoFor } from "@/lib/catalog/brandPhotos";
import { itemPhotoFor } from "@/lib/catalog/itemPhotos";
import { isRetailerBrand, offerPhotoFor, verifiedPhotoFor } from "@/lib/catalog/imageDb";
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

  // 1b) A general word that no single product is named after - "tea", "beer".
  //     Written down by a person, because which specific product someone
  //     means by a general word is not derivable from the catalog. Checked
  //     before the fuzzy step, which is what used to answer these and
  //     answered them wrongly. See data/bareWords.ts.
  const bare = bareWordProductId(item.name);
  if (bare && PRODUCT_BY_ID[bare]) return PRODUCT_BY_ID[bare];

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
  //
  // "grocery" is the model's catch-all - it uses it for anything edible it
  // cannot place more precisely - so it cannot be matched exactly or half the
  // real hits would be thrown away. But it was being treated as a wildcard
  // that matched ANY department, and that is how a shopping list came back
  // with a Garment Steamer on it: nothing in the catalog claims the bare word
  // "tea", so the fuzzy step reached for the nearest thing it could find, and
  // "steamer" contains the letters t-e-a.
  //
  // So "grocery" now means "something a supermarket sells". Still broad
  // enough to cover produce, dairy, bakery and the rest; no longer broad
  // enough to reach the appliance aisle.
  const wanted = item.department;
  if (wanted === "grocery") {
    if (NON_GROCERY_CATEGORY_DEPTS.has(departmentOf(best))) return null;
  } else if (departmentOf(best) !== wanted) {
    return null;
  }

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
/**
 * The two lists that might already describe this item, best first.
 *
 * Pulled out of resolveItems because a variant member needs exactly the same
 * question answered about ITSELF - see resolveFamily.
 */
function sourcesFor(item: AIItem): {
  curated: CuratedProduct | null;
  product: Product | null;
} {
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

  return { curated, product };
}

/**
 * Build one resolved product: its shops, its prices, its photograph, its name.
 *
 * This was the body of resolveItems' loop and still is, almost to the
 * character. It became a function of its own so that a variant member could be
 * built the same way the card itself is - a chooser offering skim milk that
 * was priced by some simpler, separate path would be offering a different
 * kind of answer, and the first wrong price would prove it.
 *
 * `variantHint` forces the qualifier instead of reading it out of the
 * shopper's words. Only data/variants.ts passes it: that file is hand-written
 * and person-checked, in the same spirit as `notSoldAt`, so when it says a
 * member IS the unsalted pack, that settles it. Everything else leaves it
 * null and `variantOf` decides, so the catalog keeps the final say on what
 * counts as a variant of what.
 *
 * Returns null when no shop stocks the thing at all.
 */
function buildResolved(
  item: AIItem,
  id: string,
  curated: CuratedProduct | null,
  product: Product | null,
  variantHint: string | null = null,
): ResolvedProduct | null {
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

  const variant = variantHint ?? variantOf(item, product);
  const baseDescription = withVariant(curated?.description ?? describe(item, product), variant);

  // A verified photo replaces every older image for this product. Each shop
  // keeps its own verified packshot when it has one; the rest drop their old
  // photo so the card falls back to the product's verified one. Copies, not
  // edits: curated storeOffers are shared module data.
  //
  // EXCEPT where the designer already supplied a photograph of their own.
  //
  // That rule is older than this database and it still wins: a picture a
  // person chose, cropped and fitted to the card frame beats one a script
  // found, however well the script checked it. The harvest was built to end
  // the era of Open Food Facts and Pexels guesses, not to overrule the
  // designer - but with nothing stopping it, it did: it put a stock tub on the
  // hand-built Philadelphia cream cheese and a generic carton on the 2% milk
  // that was supplied specifically to be used "whenever 2% milk is searched".
  //
  // The cost of this, stated plainly: a curated card keeps ONE photograph, so
  // switching shop on it no longer switches the packshot. Everything without a
  // curated photo - which is nearly the whole catalog - still gets the
  // per-shop tubs. See Chapter 9f.
  const verified = verifiedPhotoFor(product?.id, variant);

  // A photograph of the exact qualifier that was asked for, when one exists.
  // `verifiedPhotoFor` falls back to an unqualified pack when it has nothing
  // better, so the entry is checked rather than trusted: a salted block that
  // merely came back from a search for "unsalted" is not an unsalted pack.
  const variantPhoto =
    variant && verified?.variant?.toLowerCase() === variant ? verified : null;

  if (verified && product && !curated?.imageSrc) {
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

  // No shop stocks it. The caller decides what to say about that.
  if (rawOffers.length === 0) return null;

  const offers = rankOffers(rawOffers);

  return {
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
    //
    // The curated one is read FIRST, which is what that sentence has always
    // meant. For a while it was read second and the comment quietly became
    // untrue; the harvested photo won, and the designer's own packshots
    // stopped appearing on the cards they were gathered for. A verified photo
    // is still the answer for everything the designer never photographed,
    // which is almost all of it.
    //
    // The one thing that outranks a curated photo is a photo of the QUALIFIER
    // the shopper actually asked for. A curated card is one pack and knows
    // nothing about qualifiers: the butter card is a salted block, so putting
    // it on "unsalted butter" tells the shopper something untrue about the
    // thing they are buying. See variantPhoto above.
    imageSrc: variantPhoto?.file ?? curated?.imageSrc ?? verified?.file,
    imageAlt: variantPhoto?.productTitle ?? curated?.imageAlt ?? verified?.productTitle,
    imageFit: curated?.imageFit ?? "contain",
    source: curated ? "curated" : product ? "catalog" : "generated",
    offers,
    quantity: item.quantity,
  };
}

/** Every hand-drawn alternative in the project, by its id. */
const RELATED_BY_ID: Record<string, RelatedProduct> = (() => {
  const map: Record<string, RelatedProduct> = {};
  for (const pop of Object.values(PRODUCT_POP_BY_ID)) {
    for (const related of pop.related) map[related.id] = related;
  }
  return map;
})();

/**
 * Turn one of the designer's hand-drawn cards into a resolved product.
 *
 * These are the cards that used to sit in a row of "alternatives" under the
 * cream cheese: a real photograph of the actual tub, a real shop, a real
 * price, all written by a person. Nothing in the pipeline can improve on that,
 * so nothing in the pipeline touches it - this reads the card across and
 * stops.
 *
 * ONE SHOP, AND THAT IS THE HONEST ANSWER. A catalog member is offered at
 * every shop that stocks its department, because the catalog knows what it
 * costs at each. A card knows one shop and one price, and inventing six more
 * would be inventing them. A limited-edition chocolate tub really is a
 * one-shop product.
 */
function buildFromCard(cardId: string, item: AIItem): ResolvedProduct | null {
  const card = RELATED_BY_ID[cardId];
  if (!card) return null;

  // Partner shops keep their real id, so switching to this member and then
  // switching shops behaves like any other card. A shop that is not a partner
  // (the odd Home Depot in this data) still gets a stable key of its own.
  const store = STORES.find(
    (s) => s.name.toLowerCase() === card.storeName.toLowerCase(),
  );

  const offer: Offer = {
    id: store?.id ?? slug(card.storeName),
    storeName: card.storeName,
    storeLogoSrc: card.storeLogoSrc,
    storeDistanceKm: card.storeDistanceKm,
    price: card.price,
    originalPrice: card.originalPrice,
    rating: card.rating,
    reviewCount: card.reviewCount,
    cardBadge: card.showDiscount ? card.discountLabel : undefined,
  };

  // The designer's own convention in these cards is "Brand : Product", as in
  // "Philadelphia : Chocolate Cream Cheese Product". Splitting on it gives the
  // card a brand line for free, and takes the brand back out of the title -
  // otherwise both surfaces print "Philadelphia" twice, once in the brand line
  // and again at the front of the name. A card written without the convention
  // keeps its whole description and shows no brand.
  const [head, ...rest] = card.description.split(" : ");
  let brand = rest.length > 0 ? head.trim() : "";
  let title = rest.length > 0 ? rest.join(" : ").trim() : card.description;

  // Not every card follows the convention. "Great Value Cream Cheese Spread
  // Herb & Garlic" leads with a shop's own brand and no colon, and the same
  // split applies - the brand belongs on the brand line, not in the title.
  if (!brand) {
    const owned = storeBrandInName(title);
    if (owned) {
      brand = owned.name;
      title = withoutStoreBrand(title);
    }
  }

  /*
   * How many shops carry this card, and why it is not always one.
   *
   * These cards each name a single shop, and that was taken at face value at
   * first: one card, one offer. It is wrong for most of them. The shop on the
   * card is where the designer PHOTOGRAPHED the product, not a claim that
   * nobody else sells it - and Philadelphia is a national brand, on every
   * supermarket shelf in the country. Chocolate and strawberry cream cheese
   * are limited editions of a national brand, not corner-shop exclusives.
   *
   * So the brand decides, using the test this project already owns:
   *
   *   NATIONAL brand   - Philadelphia, Lactantia, Dempster's. Priced across
   *                      every shop in the department, like any other product.
   *   RETAILER's brand - Great Value, No Name, Selection. Genuinely one shop,
   *                      because the brand IS that shop. Walmart's own tub
   *                      cannot be bought at Metro at any price.
   *
   * The designer's own shop and price are kept exactly as written and lead the
   * list; the rest are priced from that number as the anchor, so the real
   * figure is the one everything else is derived from.
   */
  const anchor = [offer];
  const spreadsEverywhere = Boolean(brand) && !isRetailerBrand(brand);

  const offers = spreadsEverywhere
    ? rankOffers([
        ...anchor,
        ...offersForGeneratedProduct(item, `card-${card.id}`, card.price, brand, true)
          .filter((o) => o.id !== offer.id)
          // A national brand is the same tub wherever it is bought, so every
          // shop shows that brand and none of them owns it.
          .map((o) => ({ ...o, brand, isOwnBrand: false })),
      ])
    : anchor;

  return {
    id: `card-${card.id}`,
    rowIds: [...item.rowIds],
    description: title,
    brand,
    category: item.category,
    department: item.department,
    packSize: item.packSize ?? "",
    emoji: emojiFor(item),
    imageSrc: card.imageSrc,
    imageAlt: card.imageAlt ?? card.description,
    imageFit: card.imageFit ?? "contain",
    // Hand-photographed and hand-written, which is exactly what "curated"
    // means everywhere else in this file.
    source: "curated",
    offers,
    quantity: item.quantity,
  };
}

/**
 * Resolve every member of a variant family, so the chooser has somewhere to go.
 *
 * Each member is run through the whole pipeline - `sourcesFor` is deliberately
 * NOT used here, because a member names its catalog product outright and does
 * not need to be searched for. What it does need is the curated check: 2% milk
 * is one of the designer's own cards, and the standing rule in this project is
 * that a photograph gathered by a person beats anything generated. See
 * Chapter 9f of the field notes.
 *
 * Returns undefined rather than a one-item family: a dropdown with nothing to
 * switch to is a control that lies about having a choice behind it.
 */
function resolveFamily(
  family: VariantFamily,
  current: VariantMember,
  item: AIItem,
): VariantFamilyInfo | undefined {
  const members: VariantOption[] = [];

  // The product this family hangs off - the one a bare "milk" or "cream
  // cheese" lands on. It decides which member a curated card is allowed to
  // dress; see below. Declared in the family rather than guessed from the
  // order of the members, which are listed to be read, not ranked.
  const baseId = family.base;

  for (const member of family.members) {
    // A member the designer drew by hand. Nothing to resolve: the card already
    // says what it is, what it costs and where it is sold.
    if (member.cardId) {
      const fromCard = buildFromCard(member.cardId, item);
      if (fromCard) {
        members.push({
          key: memberKey(member),
          label: member.label,
          note: member.note,
          product: fromCard,
        });
      }
      continue;
    }

    const catalogProduct = PRODUCT_BY_ID[member.id] ?? null;
    // A family naming a product the catalog no longer has is a data error, but
    // not one worth a blank row in front of a shopper.
    if (!catalogProduct) continue;

    // The words this member would have arrived as, had the shopper typed them.
    const asName = member.variant
      ? `${member.variant} ${catalogProduct.name}`
      : catalogProduct.name;

    const synthetic: AIItem = {
      ...item,
      name: asName,
      searchTerms: [asName, catalogProduct.name],
      catalogId: member.id,
      packSize: catalogProduct.size,
    };

    // Which curated card, if any, is allowed to dress this member.
    //
    // Two things disqualify one, and both were caught by looking at the output
    // rather than by reasoning about it:
    //
    //   A QUALIFIER. The curated butter card is a photograph of a SALTED pack,
    //   so it is the wrong picture for the unsalted member. data/imageDb.json
    //   has the right one, keyed by exactly this qualifier.
    //
    //   SOMEBODY ELSE'S PACK. A curated card belongs to exactly one product.
    //   The matcher is looser than that - "Medium Eggs" still reaches the
    //   "Great Value Large Eggs" card, because "medium" is a harmless word -
    //   and the result labelled the medium eggs "Large Eggs". That is worse
    //   than no photograph at all, since saying which kind you are getting is
    //   this chooser's entire job.
    //
    // So a named card is allowed to dress only the member it was made for:
    // the product the family hangs off. Every other member falls through to
    // data/imageDb.json, which is keyed per product and cannot make this
    // mistake. An image-only entry is waved through wherever it matches -
    // those are the ones the designer supplies for one specific thing, like
    // the 2% milk carton, and the standing rule is that a photograph gathered
    // by a person beats anything generated. See Chapter 9f.
    const match = member.variant ? null : findCurated([asName]);
    const curated = match && (member.id === baseId || !match.description) ? match : null;
    const memberId = curated ? curated.id : `p-${member.id}`;

    const built = buildResolved(
      synthetic,
      memberId,
      curated,
      catalogProduct,
      member.variant ?? null,
    );
    if (!built) continue;

    members.push({
      key: memberKey(member),
      label: member.label,
      note: member.note,
      product: built,
    });
  }

  // One option is not a choice.
  if (members.length < 2) return undefined;

  // The member being shown has to be IN the list, or the control would open
  // on nothing. If its own product fell out above, there is no honest choice
  // left to offer.
  const selected = memberKey(current);
  if (!members.some((m) => m.key === selected)) return undefined;

  return { label: family.label, selected, members };
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
    // Three sources, best first. See sourcesFor.
    const { curated, product } = sourcesFor(item);

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

    const built = buildResolved(item, id, curated, product);
    if (!built) {
      unresolved.push(item.name);
      continue;
    }

    // The choice nobody asked the shopper about.
    //
    // Keyed on the CATALOG id, not on `id`: a curated photograph changes what
    // the card looks like, not which product it is, so "p-milk-2" and "milk"
    // are the same thing wearing different clothes. See data/variants.ts.
    const found = familyFor(product?.id, variantOf(item, product));
    if (found) {
      built.variantFamily = resolveFamily(found.family, found.member, item);
    }

    byId.set(id, built);
  }

  return { products: [...byId.values()], unresolved };
}
