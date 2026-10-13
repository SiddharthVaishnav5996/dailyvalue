import brandPhotoData from "@/data/brandPhotos.json";

/*
 * Real packshots, per brand.
 * ---------------------------------------------------------------------------
 * The photo problem this solves: a stock photograph of a generic loaf tells a
 * shopper nothing. People buy Great Value white bread or Dempster's white
 * bread, and the difference is the whole decision. A picture that could be
 * either is a picture of neither.
 *
 * So every offer can carry its own photograph - the actual package sold at
 * that shop. Switch the store in the pop-up and the picture changes with it,
 * because it is a different product.
 *
 * WHERE THE DATA COMES FROM
 *
 * scripts/seed-brand-photos.mjs, run by hand, writing data/brandPhotos.json.
 * The source is Open Food Facts, a free community database whose photographs
 * are contributed by shoppers. It is queried once at seed time and never at
 * runtime - their search endpoint allows about ten calls a minute, and one
 * DailyValue search would need fourteen.
 *
 * THE ORDER OF PREFERENCE, UNCHANGED AT THE TOP
 *
 *   1. curated   - the hand-photographed cards. Never overridden by anything
 *                  here. They were fitted to the frame by hand and they stay.
 *   2. brand     - this file: the real package for that brand.
 *   3. Pexels    - a generic photograph, which at least looks like the food.
 *   4. emoji     - an honest tile when nothing else exists.
 */

export interface BrandPhoto {
  /** As printed on the package, e.g. "Great Value". */
  brand: string;
  /** The full product name from the database. */
  name: string;
  /** Pack size where the contributor recorded one, e.g. "675 g". */
  size?: string;
  /** Front-of-pack photograph. */
  image: string;
  /** The barcode, kept so a photo can be traced back to its source. */
  code: string;
}

/** product slug -> brand key -> photo. */
const PHOTOS = brandPhotoData as Record<string, Record<string, BrandPhoto>>;

/** Brand names are written every which way; compare them without punctuation. */
const flatten = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** "2% Milk" -> "2-milk". Must match the key the seed script writes. */
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Lowercase words, punctuation dropped. "No name-Sans nom" -> [no, name, sans, nom] */
const wordsOf = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);

/**
 * Is `candidate` this brand, allowing for how the database writes them?
 *
 * Contributors enter a brand however it appears to them, so Loblaw's value
 * line is filed as "No name-Sans nom • Loblaws" and Walmart's as
 * "Great Value • Walmart". Matching on the exact string finds neither.
 *
 * So the brand's words have to appear TOGETHER, in order, at the start of the
 * candidate. Together and in order is what stops "Frank" matching
 * "Frankfurter"; at the start is what stops a brand matching a product that
 * merely mentions it further along.
 */
function sameBrand(candidate: string, brand: string): boolean {
  if (flatten(candidate) === flatten(brand)) return true;

  const wanted = wordsOf(brand);
  const got = wordsOf(candidate);
  if (wanted.length === 0 || got.length < wanted.length) return false;

  return wanted.every((word, i) => got[i] === word);
}

/**
 * The real package for this brand of this product, if one was seeded.
 *
 * Returns null far more often than not, and that is fine - the caller falls
 * back down the ladder above.
 */
export function brandPhotoFor(
  productName: string,
  brand: string | undefined,
): BrandPhoto | null {
  if (!brand) return null;

  const forProduct = PHOTOS[slug(productName)];
  if (!forProduct) return null;

  // The fast path: the brand is filed exactly as we spell it.
  const exact = forProduct[flatten(brand)];
  if (exact) return exact;

  for (const photo of Object.values(forProduct)) {
    if (sameBrand(photo.brand, brand)) return photo;
  }
  return null;
}

/** How many photographs are seeded. Used by the check script and the README. */
export function brandPhotoCount(): { products: number; photos: number } {
  const products = Object.keys(PHOTOS).length;
  const photos = Object.values(PHOTOS).reduce((n, byBrand) => n + Object.keys(byBrand).length, 0);
  return { products, photos };
}
