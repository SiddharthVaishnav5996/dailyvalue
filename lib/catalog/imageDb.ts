import imageDbData from "@/data/imageDb.json";
import { findStoreBrand } from "@/data/brands";

/*
 * The verified photo database.
 * ---------------------------------------------------------------------------
 * Every entry here was picked off a real Canadian store's site and LOOKED AT
 * before it was saved - the older pipelines (Open Food Facts, Pexels, text
 * matching) never checked the picture, which is how a salted-butter photo
 * ended up on cheese. So when this file has a photo for a product, it beats
 * every other source.
 *
 * Keyed by catalog product id. An entry with a `variant` ("unsalted") is only
 * used when the shopper asked for that variant; plain entries cover the rest.
 */

export interface VerifiedPhoto {
  file: string;
  store: string;
  productTitle: string;
  /** Brand printed on the pack ("Great Value", "No Name"). Shown on that store's offer. */
  brand?: string;
  variant?: string;
  width?: number;
  height?: number;
  verified?: boolean;
}

const DB = imageDbData as Record<string, VerifiedPhoto[]>;

/**
 * Best verified photo for a product, or null.
 *
 * `variant` is the qualifier the shopper used ("unsalted"), lowercase. A
 * matching variant entry wins; without one we fall back to a plain entry, but
 * never to a DIFFERENT variant - a salted pack is a wrong answer to "unsalted".
 * With no variant asked, any entry will do: a salted pack is a fine picture of
 * "butter". `storeId` narrows to that store's own packshot when asked.
 */
export function verifiedPhotoFor(
  productId: string | undefined,
  variant: string | null = null,
  storeId?: string,
): VerifiedPhoto | null {
  if (!productId) return null;
  // Low-resolution shots (Metro's 400px) go last, whatever order the harvest
  // wrote them in. Among sharp ones the harvest's own order stands: it puts
  // the best MATCH first, which can beat a bigger file (a 10.9" Samsung over
  // a 2500px 8.7" Lenovo for "10-inch Tablet"). Array sort is stable.
  const sharp = (e: VerifiedPhoto) => ((e.width ?? 0) >= 800 ? 1 : 0);
  const entries = (DB[productId] ?? [])
    .filter((e) => e.verified !== false)
    .sort((a, b) => sharp(b) - sharp(a));
  const pool = storeId ? entries.filter((e) => e.store === storeId) : entries;

  if (variant) {
    const exact = pool.find((e) => e.variant?.toLowerCase() === variant);
    return exact ?? pool.find((e) => !e.variant) ?? null;
  }
  // A shop's own photo must not be a variant nobody asked for (an unsalted
  // pack for "butter"); the national-brand fallback covers that shop instead.
  if (storeId) return pool.find((e) => !e.variant) ?? null;
  return pool.find((e) => !e.variant) ?? pool[0] ?? null;
}

/*
 * National-brand fallback.
 * ---------------------------------------------------------------------------
 * Several shops (No Frills, Metro, FreshCo, Costco...) block photo collection,
 * so their offers had no photo of their own. A national brand - Philadelphia,
 * Lactantia, Natrel - is on every shop's shelf, so its photo is honest at any
 * of them, AS LONG AS the offer's label switches to that brand too. A retailer's
 * own brand is never borrowed: a Great Value tub under No Frills would be the
 * mislabelling this file exists to end.
 */

// Retailer-owned brands that data/brands.ts does not list. Lowercase.
const RETAILER_OWNED = new Set([
  "our finest", "equate", "your fresh market", "special kitty", "ol' roy",
  "farm boy", "longo's", "sensations", "panache", "best buy", "sobeys",
  "pc organics", "pc blue menu", "pc black label", "life brand", "joe fresh",
  // Loblaws
  "farmer's market", "butcher's choice", "life at home", "type a",
  // Metro
  "life smart",
  // Canadian Tire
  "for living", "certified", "vida", "master chef", "woods", "mastercraft",
  "motomaster", "noma", "canvas", "outbound", "paderno", "vida by paderno",
  "garrison", "bluehive", "simplicité", "simplicite", "yardworks", "maximum",
  "garden club", "supercycle", "wa:ke", "autotrends", "easyflow", "premier",
  "canadian tire", "party city",
  // Unconfirmed, treated as house brands to be safe: a wrongly borrowed
  // house brand mislabels another shop, while a missed national one only
  // costs that shop a photo.
  "reflex", "matrix", "fluid",
  // Walmart
  "mainstays", "onn", "pen+gear", "hart", "george", "vibrant life", "pure balance", "spring valley", "ol'roy", "parent's choice", "rascals",
]);

/** True when `brand` belongs to one shop (Great Value, Compliments, PC...). */
export function isRetailerBrand(brand: string | undefined): boolean {
  // Trailing punctuation is part of some logos ("onn.") but not of the name.
  const b = (brand ?? "").trim().toLowerCase().replace(/[.!]+$/, "");
  if (!b || b === "unbranded") return true; // unbranded shots are not "national"
  if (RETAILER_OWNED.has(b)) return true;
  if (/^(pc|president'?s choice)\b/.test(b)) return true;
  return Boolean(findStoreBrand(b));
}

/**
 * The photo one shop's offer should show, and the brand to label it with.
 *
 *   1. The brand the shopper asked for ("Philadelphia cream cheese").
 *   2. That shop's own verified packshot.
 *   3. A national-brand packshot - sold everywhere, so true at any shop.
 *
 * Null when none applies; the card then falls back to the product photo.
 */
export function offerPhotoFor(
  productId: string,
  variant: string | null,
  storeId: string,
  wantedBrand = "",
): VerifiedPhoto | null {
  const entries = (DB[productId] ?? []).filter(
    (e) => e.verified !== false && (variant ? e.variant?.toLowerCase() === variant || !e.variant : true),
  );
  const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Only a NATIONAL brand the shopper asked for is shown everywhere. Asking
  // for Great Value still shows Walmart's tub at Walmart (step 2), but never
  // at No Frills, which cannot sell it.
  if (wantedBrand && !isRetailerBrand(wantedBrand)) {
    const asked = entries.find((e) => e.brand && flat(e.brand) === flat(wantedBrand));
    if (asked) return asked;
  }

  const own = verifiedPhotoFor(productId, variant, storeId);
  if (own) return own;

  const national = entries
    .filter((e) => !isRetailerBrand(e.brand))
    .sort((a, b) => ((b.width ?? 0) >= 800 ? 1 : 0) - ((a.width ?? 0) >= 800 ? 1 : 0));
  return national[0] ?? null;
}
