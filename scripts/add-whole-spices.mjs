/*
 * Add whole spices for Indian cooking: cloves and fennel seeds, and give the
 * existing cardamom and bay leaf rows the plain words shoppers type.
 *   - "cardamom" alone was not an alias of green-cardamom-pods, so it fell
 *     through to fuzzy search.
 *   - "cloves" must not reach garlic: garlic's aliases are "garlic clove(s)",
 *     never bare "cloves", so the new row can own that word.
 *   - "fennel" stays the bulb; the seeds get "fennel seeds".
 * Pricing is add-catalog-110.mjs's (Pantry: freshco / walmart / nofrills / metro).
 * Writes data/products.json only: items.json was folded into it
 * (scripts/merge-items-into-products.mjs), so base/imageMode/offQuery sit on
 * the product row next to prices.
 * Idempotent: ids and aliases already present are skipped.
 * Run:  node scripts/add-whole-spices.mjs   (add --dry to preview)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pricesFor } from "./add-catalog-110.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PRODUCTS = `${ROOT}data/products.json`;

// [id, name, emoji, unit, size, base, terms, offQuery]
const NEW = [
  ["whole-cloves", "Whole Cloves", "🌰", "jar", "50 g", 4.49, ["cloves", "whole cloves", "laung"], "whole cloves"],
  ["fennel-seeds", "Fennel Seeds", "🌱", "jar", "100 g", 3.49, ["fennel seeds", "fennel seed", "saunf"], "fennel seeds"],
];

// Extra aliases for rows that already exist.
const ALIASES = {
  "green-cardamom-pods": ["cardamom", "elaichi"],
  "bay-leaves": ["tej patta"],
};

const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/s$/, "");

const DRY = process.argv.includes("--dry");
const products = JSON.parse(readFileSync(PRODUCTS, "utf8"));

// Who already owns each name or alias, so a new word can't steal another product's.
const owner = new Map();
for (const p of products) for (const t of [p.name, ...p.searchTerms]) owner.set(norm(t), p.id);
const clash = (term, id) => {
  const o = owner.get(norm(term));
  return o && o !== id ? o : null;
};

const log = [];
for (const [id, name, emoji, unit, size, base, terms, offQuery] of NEW) {
  if (products.some((p) => p.id === id)) { log.push(`skip ${id}: already present`); continue; }
  for (const t of [name, ...terms]) {
    const o = clash(t, id);
    if (o) throw new Error(`"${t}" for ${id} already belongs to ${o}`);
  }
  const it = { id, name, brand: "", category: "Pantry", unit, size, base, emoji, searchTerms: terms, imageMode: "brand", offQuery };
  products.push({ ...it, prices: pricesFor(it) });
  for (const t of [name, ...terms]) owner.set(norm(t), id);
  log.push(`add ${id}`);
}

for (const [id, extra] of Object.entries(ALIASES)) {
  const row = products.find((p) => p.id === id);
  if (!row) throw new Error(`${id} missing from products.json`);
  for (const t of extra) {
    const o = clash(t, id);
    if (o) throw new Error(`"${t}" for ${id} already belongs to ${o}`);
    if (!row.searchTerms.includes(t)) row.searchTerms.push(t);
    owner.set(norm(t), id);
  }
  log.push(`aliases ${id}: ${row.searchTerms.join(", ")}`);
}

console.log(log.join("\n"));
if (DRY) console.log("--dry: nothing written.");
else {
  writeFileSync(PRODUCTS, JSON.stringify(products, null, 2) + "\n");
  console.log(`products ${products.length}`);
}
