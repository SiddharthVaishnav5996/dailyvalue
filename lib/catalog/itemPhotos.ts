import itemPhotoData from "@/data/itemPhotos.json";

/*
 * Photographs for items that have no store brand.
 * ---------------------------------------------------------------------------
 * The companion to brandPhotos.ts, and deliberately a separate lookup.
 *
 * A tub of Great Value sour cream and a tub of Compliments sour cream are
 * different products that should look different - that is what brandPhotos.ts
 * is for. A banana is a banana. Loose produce, fresh cuts of meat and
 * bakery-counter goods carry no store brand at all, so there is exactly ONE
 * photograph per item and no brand to key it on.
 *
 * Keyed by the product's `id`, not its name. brandPhotos.ts keys on a slug of
 * the NAME because that is the shape its seeder wrote years ago; this file
 * keys on the id because ids are guaranteed unique in data/products.json
 * while two products may legitimately share a display name.
 *
 * The photographs come from Canadian retailer packshots (Loblaws, Walmart
 * Canada) and are stored as cut-out PNGs alongside the brand photos in
 * public/stores/Brand Photos/. Generic files are a bare item id
 * ("banana.png"); brand files carry a brand prefix
 * ("great-value-ketchup.png"), so the two never collide in that one folder.
 */

export interface ItemPhoto {
  /** The retailer's own product name, kept so a photo can be traced back. */
  name: string;
  /** App-relative path, e.g. "/stores/Brand Photos/banana.png". */
  image: string;
  /** The URL it was fetched from, so it can be re-fetched or credited. */
  source?: string;
  attribution?: string;
}

const PHOTOS = itemPhotoData as Record<string, ItemPhoto>;

/**
 * The photograph for a product, or null if there isn't one.
 *
 * Returning null rather than a placeholder is deliberate and matches the rule
 * the rest of the catalog follows: a card with the WRONG photograph is worse
 * than a card with none. Callers fall back to the emoji tile.
 */
export function itemPhotoFor(productId: string | undefined): ItemPhoto | null {
  if (!productId) return null;
  return PHOTOS[productId] ?? null;
}

export function itemPhotoCount(): number {
  return Object.keys(PHOTOS).length;
}
