/*
 * Bare words the catalog cannot answer for itself.
 * ---------------------------------------------------------------------------
 * Some things are only ever sold as a specific version of themselves. There is
 * no product called "Tea" in data/products.json, because every tea on a shelf
 * is an orange pekoe or a green or a chamomile. Same with beer: the catalog
 * has lagers and IPAs and stouts, and nothing called plain "Beer".
 *
 * A shopper still types the bare word, and until this file existed the matcher
 * had to guess. It guessed with string similarity, and string similarity does
 * not know what words mean:
 *
 *   "tea"  -> Garment S-TEA-mer   (the letters t, e, a live inside "steamer")
 *   "beer" -> Root Beer           (a soft drink, and not what anyone meant)
 *
 * Neither was a near miss. Both were confidently wrong, which is worse: a
 * shopping list with a garment steamer on it reads as a broken app, while a
 * blank would only have read as a gap.
 *
 * WHY A HAND-WRITTEN LIST
 *
 * The same reason as notSoldAt in lib/catalog/curated.ts and PRODUCT_BRAND_AT
 * in data/brands.ts: which specific product a person means by a general word
 * is a fact about the world, not a thing to be computed. Nobody can derive
 * from the catalog that "tea" means orange pekoe rather than chamomile. A
 * person knows, so a person writes it down.
 *
 * Keep this list SHORT. It is for words the catalog genuinely cannot answer,
 * not a dumping ground for every matcher miss - a miss that could be fixed by
 * giving a product a better search term should be fixed there instead.
 */

/** Bare word (lowercase) -> the catalog product id a shopper means by it. */
export const BARE_WORD_PRODUCT: Record<string, string> = {
  // The default pot of tea in Canada is orange pekoe - Red Rose, Tetley.
  // Green, herbal and Earl Grey are all real answers, which is exactly why
  // this word also carries a variant family. See data/variants.ts.
  tea: "orange-pekoe-tea-bags",

  // A six-pack of lager is what "a beer" means. The catalog's root beer and
  // ginger beer are soft drinks that happen to share the word.
  beer: "lager-6-cans",

  // Salmon is the default fillet on a Canadian fish counter. Without this,
  // "fish" reached Fish Flakes - aquarium fish FOOD - which is the same
  // failure as the steamer: a confident answer from the wrong aisle.
  fish: "salmon",

  // "nuts" reached Donuts, for the same reason "tea" reached a steamer: the
  // letters n-u-t-s sit inside "do-nuts" and string similarity cannot tell
  // the difference between a word and a fragment of one.
  nuts: "mixed-nuts",

  // Nothing in the catalog is named plain "juice" - every juice is an orange
  // or an apple one - so the word fell through to a generated card with an
  // invented price. Orange is what an unqualified "juice" means.
  juice: "orange-juice",
};

/** The product a bare word means, or null. */
export function bareWordProductId(name: string): string | null {
  return BARE_WORD_PRODUCT[name.trim().toLowerCase()] ?? null;
}
