/*
 * Copy hand-picked photographs into the images folder, unchanged.
 * ---------------------------------------------------------------------------
 * WHAT THIS IS FOR
 *
 * Automatic matching gets some products wrong and always will. "Chocolate
 * Milk" and "Milk Chocolate" are the same two words in a different order; one
 * is a drink and one is a bar. When a photograph has to be chosen by hand,
 * it is recorded in PRODUCT_BRAND_AT in data/brands.ts - that is the single
 * register for a pinned picture, and the seeding scripts never write to it,
 * so nothing there can be overwritten by a re-run.
 *
 * This script does the one mechanical part of that: it copies the supplied
 * file into public/stores/Brand Photos/ under a predictable name, so
 * data/brands.ts has a stable path to point at and every image in the app
 * lives in one folder.
 *
 * IT DOES NOT PROCESS THE IMAGE, AND THAT IS THE POINT
 *
 * No background removal, no trimming, no cropping, no resizing, no
 * re-encoding. An earlier version did run these through the same
 * background-removal as the scraped photos, and that was wrong twice over:
 * these arrive already on a clean white background, so there was nothing to
 * remove - and the flood fill would have damaged one of them, because it
 * measured only 61% white at the border and would have eaten into the
 * product rather than the backdrop.
 *
 * A hand-picked file is finished work. Copy it and get out of the way. If a
 * pinned image ever needs cropping, crop the source file.
 *
 * ADDING A NEW PINNED PHOTO
 *
 *   1. Put the file somewhere under public/ (the "AI searched" folder is the
 *      usual home).
 *   2. Add it to SOURCES below.
 *   3. Run this script. It prints the exact entry to paste into
 *      PRODUCT_BRAND_AT in data/brands.ts.
 *
 * Run:  node scripts/apply-pinned-photos.mjs   (--dry to preview)
 */

import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT_DIR = join(ROOT, "public", "stores", "Brand Photos");
const OUT_URL = "/stores/Brand Photos";
const AI = "public/stores/Product card Images/AI searched";

/*
 * What to copy, and what it is.
 *
 * `key` only names the copied file. The actual wiring - which product, which
 * shop - lives in PRODUCT_BRAND_AT, because that is a claim about the real
 * world and belongs next to the other claims like it.
 */
const SOURCES = [
  { key: "any-almond-butter",                source: `${AI}/almond butter.avif` },
  { key: "greatvalue-milk",                  source: `${AI}/2 percent cow milk- WALMART.avif` },
  { key: "kirklandsignature-milk",           source: `${AI}/partly skimmed milk - costco.avif` },
  { key: "kirklandsignature-1-milk",         source: `${AI}/1% milk tetrapack - Costco.avif` },
  { key: "greatvalue-whole-milk",            source: `${AI}/whole milk - walmart.avif` },
  { key: "kirklandsignature-whole-milk",     source: `${AI}/whole milk - Costco.avif` },
  { key: "presidentschoice-whole-milk",      source: `${AI}/whole milk - Real Canadian Superstore.avif` },
  { key: "noname-whole-milk",                source: `${AI}/whole milk tetrapack - Real Canadian Superstore.avif` },
  { key: "presidentschoice-almond-milk",     source: `${AI}/almond milk - real canadian superstore.avif` },
];

const dry = process.argv.includes("--dry");
if (!dry) mkdirSync(OUT_DIR, { recursive: true });

let copied = 0;
let failed = 0;

for (const { key, source } of SOURCES) {
  const src = join(ROOT, source.replace(/\//g, "\\"));
  if (!existsSync(src)) {
    console.log(`  MISSING  ${source}`);
    failed++;
    continue;
  }
  // Keep the source's own extension. The file is not re-encoded, so claiming
  // ".png" for an AVIF would be a lie the browser would catch.
  const fileName = `pinned-${key}${extname(src).toLowerCase() || ".png"}`;
  try {
    if (!dry) copyFileSync(src, join(OUT_DIR, fileName));
    console.log(`  ${fileName}  ${(statSync(src).size / 1024) | 0}KB  (copied verbatim)`);
    copied++;
  } catch (err) {
    console.log(`  FAILED   ${fileName}: ${err.message}`);
    failed++;
  }
}

console.log(`\n${copied} copied, ${failed} missing/failed.${dry ? "  (--dry: nothing written)" : ""}`);
console.log(`\nPaths for data/brands.ts:`);
for (const { key, source } of SOURCES) {
  if (!existsSync(join(ROOT, source.replace(/\//g, "\\")))) continue;
  console.log(`  ${OUT_URL}/pinned-${key}${extname(source).toLowerCase()}`);
}
