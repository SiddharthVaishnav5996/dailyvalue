import type { Department } from "./stores";

/*
 * Store brands - the ones a shop owns and nobody else may sell.
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 *
 * The price comparison assumes one product priced at many shops. That is true
 * of Philadelphia, Becel and Oreo: they are NATIONAL brands, and every grocer
 * stocks them at their own price. Comparing those is the whole point of the app.
 *
 * It is not true of Great Value. Great Value is Walmart's own brand and is sold
 * at Walmart and nowhere else. Quoting a Great Value price at Costco is not a
 * comparison, it is fiction - and the app used to do exactly that, because it
 * had no idea some brands belong to a shop.
 *
 * So this file records who owns what. Two things follow from it:
 *
 *   1. A store brand is never quoted at a shop that cannot sell it.
 *   2. An item with no brand of its own - "cream cheese", "white bread" - gets
 *      each shop's OWN brand on its own offer. That turns a flat price list
 *      into the comparison people actually make in the aisle: Great Value at
 *      Walmart against Compliments at Sobeys against Selection at Metro.
 *
 * A BRAND BELONGS TO A COMPANY, NOT A SHOP
 *
 * No Name is not "the No Frills brand" - it is Loblaw's, and it is on the shelf
 * at No Frills AND Real Canadian Superstore. Compliments is Empire's, sold at
 * Sobeys AND FreshCo. So `storeIds` is a list, not a single id.
 *
 * SOURCES
 *
 * Every brand below was checked on the web on 2026-09-19 rather than recalled.
 * Where a brand exists but only one source mentioned it, it was left out - a
 * wrong brand on a card is the same kind of mistake as a wrong photograph.
 */

/**
 * Where a brand sits against the national brands on the same shelf.
 *
 * This is what makes the comparison readable. "Selection $3.29" next to
 * "Irresistibles $5.99" is confusing until you know one is the value line and
 * the other is the premium one.
 */
export type BrandTier = "value" | "standard" | "premium";

export interface StoreBrand {
  id: string;
  /** Exactly as it is printed on the package. */
  name: string;
  tier: BrandTier;
  /** Every banner allowed to sell it. Usually one company's shops. */
  storeIds: string[];
  /** What the brand actually covers. A paint brand has no cream cheese. */
  departments: Department[];
  /** What the brand is, in the words a shopper would use. */
  note: string;
}

/** Departments a full grocery own-brand normally spans. */
const GROCERY_LINE: Department[] = [
  "grocery",
  "dairy",
  "bakery",
  "pantry",
  "beverages",
  "frozen",
  "snacks",
  "household",
];

export const STORE_BRANDS: StoreBrand[] = [
  // --- Walmart ------------------------------------------------------------
  {
    id: "great-value",
    name: "Great Value",
    tier: "value",
    storeIds: ["walmart"],
    departments: GROCERY_LINE,
    note: "Walmart's everyday value line, and the reason a lot of people pick Walmart at all.",
  },

  // --- Costco -------------------------------------------------------------
  {
    id: "creative-baker",
    name: "Creative Baker",
    tier: "standard",
    storeIds: ["costco"],
    // Deliberately empty. A brand with no departments is never chosen by
    // storeBrandFor, which picks a shop's own brand by aisle. This one is only
    // ever chosen by name, per product, through PRODUCT_BRAND_AT below -
    // because Costco's baking flour is Creative Baker while almost everything
    // else in that aisle is Kirkland Signature. An aisle is too blunt a tool
    // to say that.
    departments: [],
    note: "Costco's baking brand. Named per product, never by aisle.",
  },
  {
    id: "kirkland-signature",
    name: "Kirkland Signature",
    tier: "standard",
    storeIds: ["costco"],
    departments: [...GROCERY_LINE, "meat", "home", "pet", "pharmacy"],
    note: "Costco's own label. Priced like a value brand, positioned against the national ones.",
  },

  // --- Loblaw: No Frills and Real Canadian Superstore ----------------------
  {
    id: "no-name",
    name: "No Name",
    tier: "value",
    storeIds: ["nofrills", "superstore"],
    departments: [...GROCERY_LINE, "produce", "meat"],
    note: "Loblaw's value line since 1978. Yellow packaging, plain type, no advertising.",
  },
  {
    id: "presidents-choice",
    name: "President's Choice",
    tier: "standard",
    storeIds: ["nofrills", "superstore"],
    departments: [...GROCERY_LINE, "produce", "meat", "pet"],
    note: "Loblaw's flagship brand, launched 1984 and sold across all its banners.",
  },
  {
    id: "pc-black-label",
    name: "PC Black Label",
    tier: "premium",
    storeIds: ["superstore"],
    departments: ["grocery", "pantry", "frozen", "snacks", "dairy"],
    note: "Loblaw's premium line, added in 2011.",
  },

  // --- Metro --------------------------------------------------------------
  {
    id: "selection",
    name: "Selection",
    tier: "value",
    storeIds: ["metro"],
    departments: [...GROCERY_LINE, "produce"],
    note: "Metro's national-brand-equivalent line, and its biggest at around 2,500 products.",
  },
  {
    id: "irresistibles",
    name: "Irresistibles",
    tier: "premium",
    storeIds: ["metro"],
    departments: ["grocery", "dairy", "bakery", "meat", "frozen", "snacks", "produce"],
    note: "Metro's premium line - the one with the air-chilled chicken and the hors d'oeuvres.",
  },

  // --- Empire: Sobeys and FreshCo -----------------------------------------
  {
    id: "compliments",
    name: "Compliments",
    tier: "standard",
    storeIds: ["sobeys", "freshco"],
    departments: [...GROCERY_LINE, "produce", "meat"],
    note: "Empire's own brand since 2005, shared across Sobeys, FreshCo, Foodland and Safeway.",
  },

  // --- Pattison: Save-On-Foods --------------------------------------------
  {
    id: "western-family",
    name: "Western Family",
    tier: "standard",
    storeIds: ["saveonfoods"],
    departments: [...GROCERY_LINE, "produce", "meat"],
    note: "The Western Canadian own-brand carried by Save-On-Foods.",
  },

  // --- Canadian Tire ------------------------------------------------------
  //
  // Not groceries, but the same rule holds: Mastercraft is Canadian Tire's and
  // asking Lowe's for a Mastercraft drill is asking the wrong shop.
  {
    id: "mastercraft",
    name: "Mastercraft",
    tier: "standard",
    storeIds: ["canadiantire"],
    departments: ["hardware"],
    note: "Canadian Tire's tool brand.",
  },
  {
    id: "motomaster",
    name: "MotoMaster",
    tier: "standard",
    storeIds: ["canadiantire"],
    departments: ["automotive"],
    note: "Canadian Tire's automotive brand - batteries, oil, tires.",
  },
  {
    id: "noma",
    name: "NOMA",
    tier: "standard",
    storeIds: ["canadiantire"],
    departments: ["home", "household", "garden"],
    note: "Canadian Tire's lighting and seasonal brand.",
  },
  {
    id: "canvas",
    name: "CANVAS",
    tier: "standard",
    storeIds: ["canadiantire"],
    departments: ["home", "furniture"],
    note: "Canadian Tire's home decor brand.",
  },
  {
    id: "frank",
    name: "Frank",
    tier: "value",
    storeIds: ["canadiantire"],
    departments: ["household", "grocery"],
    note: "Canadian Tire's budget household line, added in 2013.",
  },

  // --- Lowe's and Rona ----------------------------------------------------
  //
  // Kobalt is Lowe's house brand and reached Canada in 2022 through Lowe's,
  // RONA and Reno-Depot, which is why it is on two banners here.
  {
    id: "kobalt",
    name: "Kobalt",
    tier: "standard",
    storeIds: ["lowes", "rona"],
    departments: ["hardware"],
    note: "Lowe's house tool brand, sold in Canada through Lowe's and RONA.",
  },
  {
    id: "uberhaus",
    name: "Uberhaus",
    tier: "standard",
    storeIds: ["rona"],
    departments: ["hardware", "home", "appliances", "household"],
    note: "RONA's own brand - taps, fixtures, blinds, small appliances.",
  },

  // --- Home Hardware ------------------------------------------------------
  {
    id: "beauti-tone",
    name: "Beauti-Tone",
    tier: "standard",
    storeIds: ["homehardware"],
    // Paint, and nothing else. It was briefly listed under "hardware" too,
    // and the resolver promptly offered a Beauti-Tone cordless drill - which
    // is the exact mistake this file exists to prevent. A brand covers what it
    // covers; anything wider is a wrong label on a real product.
    departments: ["home"],
    note: "Canada's own retail paint brand, sold only at Home Hardware.",
  },
];

/* ---------------------------------------------------------------------------
 * What a particular shop sells for a particular product
 * ---------------------------------------------------------------------------
 * `storeBrandFor` answers by aisle: ask Costco for anything in the pantry and
 * it says Kirkland Signature. That is right nearly always and wrong sometimes,
 * and an aisle cannot express the difference.
 *
 * Costco's all-purpose flour is Creative Baker, not Kirkland. Nothing about
 * the department, the price or the product name reveals that - it is simply a
 * fact about a shop, the same kind of fact as "Costco sells ginger only as a
 * paste" (see notSoldAt in lib/catalog/curated.ts).
 *
 * So facts like that are written down, one product at a time, by a person who
 * has been in the shop. Keep this list short and specific: every entry is a
 * claim about the real world that nobody can verify from the code.
 * ------------------------------------------------------------------------ */

export interface StoreProductBrand {
  /**
   * The brand this shop actually sells, exactly as it is on the package.
   *
   * Optional, and the difference matters. Omitting it leaves the brand to
   * `brandForStore`, which is what you want for an entry that is only here to
   * pin a PHOTOGRAPH. Setting it to "" would instead blank the brand line on
   * the card, because resolve.ts uses `??` and an empty string is a value.
   */
  brand?: string;
  /** A photograph of that package, when there is one. */
  image?: string;
  imageAlt?: string;
}

/*
 * catalog product id -> store id -> what that shop really sells.
 *
 * THE ONE PLACE A PHOTOGRAPH IS PINNED BY HAND.
 *
 * Two kinds of fact live here, and both are things no code could work out:
 *
 *   1. What a shop's own brand of something actually is. Costco's flour is
 *      Creative Baker, not Kirkland Signature, and only somebody who has been
 *      in the shop knows that.
 *   2. Which photograph to use, for products automatic matching cannot tell
 *      apart. "Chocolate Milk" and "Milk Chocolate" are the same two words in
 *      a different order; one is a drink and one is a bar. A word matcher
 *      cannot separate those and should not be asked to.
 *
 * Use the store id "*" to mean EVERY shop - for a photograph that is simply
 * the right picture of the product, whoever is selling it.
 *
 * Leave `brand` out unless you are genuinely recording which brand the shop
 * sells. An entry that only pins a picture should not touch the brand line.
 *
 * The seeding scripts never write to this file, so nothing here can be
 * overwritten by a re-run. That is the main reason pins live here rather than
 * in one of the generated manifests.
 */
export const PRODUCT_BRAND_AT: Record<string, Record<string, StoreProductBrand>> = {
  flour: {
    costco: {
      brand: "Creative Baker",
      image: "/stores/Product card Images/AI searched/all purpose flour.avif",
      imageAlt: "Creative Baker all purpose flour, 10 kg bag",
    },
  },

  /* ---- hand-picked photographs -------------------------------------------
   * Supplied already on a clean white background, and copied byte for byte
   * into public/stores/Brand Photos/ by scripts/apply-pinned-photos.mjs.
   * They are deliberately NOT cut out, trimmed or resized: they arrived
   * finished, and the background remover would have damaged one of them.
   * ---------------------------------------------------------------------- */

  "almond-butter": {
    // No brand recorded: this is simply what almond butter looks like, and
    // every shop's own label is still named correctly underneath it.
    "*": {
      image: "/stores/Brand Photos/pinned-any-almond-butter.avif",
      imageAlt: "A jar of almond butter",
    },
  },

  milk: {
    walmart: {
      brand: "Great Value",
      image: "/stores/Brand Photos/pinned-greatvalue-milk.avif",
      imageAlt: "Great Value 2% partly skimmed milk",
    },
    costco: {
      brand: "Kirkland Signature",
      image: "/stores/Brand Photos/pinned-kirklandsignature-milk.avif",
      imageAlt: "Kirkland Signature partly skimmed milk",
    },
  },

  "1-milk": {
    costco: {
      brand: "Kirkland Signature",
      image: "/stores/Brand Photos/pinned-kirklandsignature-1-milk.avif",
      imageAlt: "Kirkland Signature 1% milk, tetra pack",
    },
  },

  "whole-milk": {
    walmart: {
      brand: "Great Value",
      image: "/stores/Brand Photos/pinned-greatvalue-whole-milk.avif",
      imageAlt: "Great Value whole milk",
    },
    costco: {
      brand: "Kirkland Signature",
      image: "/stores/Brand Photos/pinned-kirklandsignature-whole-milk.avif",
      imageAlt: "Kirkland Signature whole milk",
    },
    // Real Canadian Superstore and No Frills are both Loblaw, and both stock
    // President's Choice and No Name - so the two supplied photographs go to
    // one banner each rather than one of them going unused.
    superstore: {
      brand: "President's Choice",
      image: "/stores/Brand Photos/pinned-presidentschoice-whole-milk.avif",
      imageAlt: "President's Choice whole milk",
    },
    nofrills: {
      brand: "No Name",
      image: "/stores/Brand Photos/pinned-noname-whole-milk.avif",
      imageAlt: "No Name whole milk, tetra pack",
    },
  },

  "almond-milk": {
    superstore: {
      brand: "President's Choice",
      image: "/stores/Brand Photos/pinned-presidentschoice-almond-milk.avif",
      imageAlt: "President's Choice almond milk",
    },
  },
};

/** What this shop sells for this product, when somebody has recorded it. */
export function productBrandAt(
  productId: string,
  storeId: string,
): StoreProductBrand | null {
  const forProduct = PRODUCT_BRAND_AT[productId];
  if (!forProduct) return null;
  // A shop-specific entry beats the catch-all, so one product can have a
  // default photograph plus a different one at the shops that sell their own
  // version of it.
  return forProduct[storeId] ?? forProduct["*"] ?? null;
}

/* ---------------------------------------------------------------------------
 * Lookups
 * ------------------------------------------------------------------------ */

/** store id -> the brands that shop owns. */
export const BRANDS_BY_STORE: Record<string, StoreBrand[]> = (() => {
  const map: Record<string, StoreBrand[]> = {};
  for (const brand of STORE_BRANDS) {
    for (const storeId of brand.storeIds) {
      (map[storeId] ??= []).push(brand);
    }
  }
  return map;
})();

/** Lowercased brand name -> the brand, for recognising one in free text. */
const BY_NAME: Map<string, StoreBrand> = new Map(
  STORE_BRANDS.map((b) => [b.name.toLowerCase(), b]),
);

/**
 * Is this name a shop's own brand? Returns it, or null for a national brand.
 *
 * Matching is loose on purpose: the AI writes "Presidents Choice" as often as
 * "President's Choice", and both mean the same tub of yogurt.
 */
export function findStoreBrand(name: string): StoreBrand | null {
  const cleaned = name.trim().toLowerCase();
  if (!cleaned) return null;

  const direct = BY_NAME.get(cleaned);
  if (direct) return direct;

  // Ignore apostrophes, hyphens and spacing before giving up.
  const flatten = (s: string) => s.replace(/[^a-z0-9]/g, "");
  const flat = flatten(cleaned);
  for (const brand of STORE_BRANDS) {
    if (flatten(brand.name.toLowerCase()) === flat) return brand;
  }
  return null;
}

/** Cheapest tier first - the shop's own brand is usually its value one. */
const TIER_ORDER: Record<BrandTier, number> = { value: 0, standard: 1, premium: 2 };

/**
 * The own brand this shop would put on the shelf for this kind of item.
 *
 * Returns null when the shop has no brand covering that department, which is
 * the honest answer for the LCBO and for a supermarket asked about drills.
 */
export function storeBrandFor(
  storeId: string,
  department: string,
  tier?: BrandTier,
): StoreBrand | null {
  const owned = BRANDS_BY_STORE[storeId];
  if (!owned) return null;

  const fits = owned.filter((b) => b.departments.includes(department as Department));
  if (fits.length === 0) return null;

  if (tier) {
    const exact = fits.find((b) => b.tier === tier);
    if (exact) return exact;
  }

  return [...fits].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier])[0];
}

/**
 * May this shop sell this brand?
 *
 * National brands pass everywhere - the department check elsewhere already
 * stops the LCBO being offered a mattress. Only a store brand can fail here.
 */
export function storeCanSell(storeId: string, brandName: string): boolean {
  const brand = findStoreBrand(brandName);
  if (!brand) return true; // national brand, or no brand at all
  return brand.storeIds.includes(storeId);
}
