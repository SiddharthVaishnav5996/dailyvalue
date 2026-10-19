/*
 * Fold data/items.json into data/products.json, leaving ONE catalogue file.
 * ---------------------------------------------------------------------------
 * WHY
 *
 * The project carried the same 2,175 items in two files. products.json was
 * what the app read; items.json was what the seeding scripts read. The only
 * difference was four fields:
 *
 *   products.json had   prices
 *   items.json had      base, imageMode, offQuery
 *
 * Nothing enforced that the two stayed in step. Add an item to products.json
 * alone and the photo script never fetches it a picture; add it to items.json
 * alone and the app cannot find it at all. Neither failure says anything out
 * loud - you just get a card with no photo, or a search that returns nothing.
 *
 * Checked before merging: all 2,175 ids are in both files, every item has
 * base/imageMode/offQuery, and not one shared field had drifted apart. So the
 * duplication had cost nothing YET. That is the right moment to remove it.
 *
 * WHAT EACH FIELD IS FOR, since they now sit side by side
 *
 *   prices     - what each shop charges. The app reads this directly.
 *   base       - the one "normal" price the four shop prices were generated
 *                FROM (scripts/expand-catalog.mjs). Kept because regenerating
 *                prices needs it; without it a reprice would have nothing to
 *                work from.
 *   imageMode  - "brand" (one photo per store brand) or "generic" (one photo
 *                of the food). Tells the photo script what to go and get.
 *   offQuery   - what to type into a store's search box. Not always the
 *                product name: "Butter" has to be searched as "butter salted
 *                block", or the results come back full of peanut butter.
 *
 * Run:  node scripts/merge-items-into-products.mjs   (--dry to preview)
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const PRODUCTS = join(ROOT, "data", "products.json");
const ITEMS = join(ROOT, "data", "items.json");

const dry = process.argv.includes("--dry");

if (!existsSync(ITEMS)) {
  console.log("data/items.json is already gone - nothing to merge.");
  process.exit(0);
}

const products = JSON.parse(readFileSync(PRODUCTS, "utf8"));
const items = JSON.parse(readFileSync(ITEMS, "utf8"));
const itemById = new Map(items.map((i) => [i.id, i]));

/* ---- refuse to merge anything that is not a clean 1:1 ------------------- */
const onlyProducts = products.filter((p) => !itemById.has(p.id)).map((p) => p.id);
const onlyItems = items.filter((i) => !products.some((p) => p.id === i.id)).map((i) => i.id);
if (onlyProducts.length || onlyItems.length) {
  throw new Error(
    `the two files disagree - merge aborted.\n` +
      `  only in products.json: ${onlyProducts.slice(0, 8).join(", ") || "none"}\n` +
      `  only in items.json   : ${onlyItems.slice(0, 8).join(", ") || "none"}`,
  );
}

/* ---- merge, keeping products.json's own values for shared fields -------- */
const merged = products.map((p) => {
  const i = itemById.get(p.id);
  return {
    id: p.id,
    name: p.name,
    brand: p.brand ?? "",
    category: p.category,
    unit: p.unit,
    size: p.size,
    base: i.base,
    emoji: p.emoji,
    searchTerms: p.searchTerms,
    imageMode: i.imageMode,
    offQuery: i.offQuery,
    prices: p.prices,
  };
});

/* ---- assertions, before a byte is written ------------------------------- */
if (merged.length !== products.length) throw new Error("lost rows during merge");
const ids = merged.map((m) => m.id);
const dupes = ids.filter((id, n) => ids.indexOf(id) !== n);
if (dupes.length) throw new Error(`duplicate ids: ${dupes.slice(0, 5).join(", ")}`);
for (const m of merged) {
  if (!m.id || !m.name || !m.category) throw new Error(`incomplete row: ${m.id}`);
  if (typeof m.base !== "number" || !(m.base > 0)) throw new Error(`bad base on ${m.id}`);
  if (!["brand", "generic"].includes(m.imageMode)) throw new Error(`bad imageMode on ${m.id}`);
  if (!m.offQuery) throw new Error(`missing offQuery on ${m.id}`);
  const vals = Object.values(m.prices ?? {});
  if (!vals.length) throw new Error(`no prices on ${m.id}`);
  for (const v of vals) if (typeof v !== "number" || !(v > 0)) throw new Error(`bad price on ${m.id}`);
}
/* every price must survive the merge unchanged */
for (const p of products) {
  const m = merged.find((x) => x.id === p.id);
  if (JSON.stringify(m.prices) !== JSON.stringify(p.prices)) {
    throw new Error(`prices changed for ${p.id} - refusing to write`);
  }
}

console.log(`merged ${merged.length} products`);
console.log(`  every id in both files      : yes`);
console.log(`  prices unchanged            : yes`);
console.log(`  base/imageMode/offQuery set : yes`);

if (dry) {
  console.log("\n--dry: nothing written, items.json left alone.");
} else {
  copyFileSync(PRODUCTS, PRODUCTS + ".premerge.bak");
  copyFileSync(ITEMS, ITEMS + ".premerge.bak");
  writeFileSync(PRODUCTS, JSON.stringify(merged, null, 2) + "\n");
  unlinkSync(ITEMS);
  console.log("\nwrote data/products.json  (backup: products.json.premerge.bak)");
  console.log("deleted data/items.json   (backup: items.json.premerge.bak)");
}
