/*
 * Grow data/products.json from the 39 hand-seeded items to the full 1000.
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 *
 * The app reads data/products.json and nothing else. That file held 39
 * products, so searching for anything outside them fell through to Fuse's
 * fuzzy match and landed on the nearest string it did know - asking for
 * raspberries returned BLUEBERRIES, because blueberries were in the catalog
 * and raspberries were not. No amount of work on the photographs fixes that;
 * the catalog itself has to know the item exists.
 *
 * data/items.json carries the 1000-item list. This script merges it into
 * products.json in the shape the app already expects, so no consuming code
 * has to change.
 *
 * WHAT IT PRESERVES
 *
 * The 39 original entries are copied through UNTOUCHED - same prices, same
 * size, same searchTerms, same emoji. They were tuned by hand and several
 * are wired into the curated cards, so a regenerated price here would move
 * numbers that are already correct. This script asserts that afterwards
 * rather than trusting itself.
 *
 * HOW THE OTHER 961 ARE PRICED
 *
 * Exactly the way scripts/seed.mjs already prices things: a per-store
 * multiplier plus a deterministic hash "wobble", so the cheapest store
 * varies believably per item and the same item always costs the same. The
 * formula is copied verbatim from seed.mjs rather than imported, because
 * that file runs standalone and rewrites this same output - keeping them
 * textually identical is what stops the two drifting apart.
 *
 * These base prices are realistic estimates, NOT scraped from flyers.
 *
 * Run:  node scripts/expand-catalog.mjs   (add --dry to preview)
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const ITEMS = join(ROOT, "data", "items.json");
const OUT = join(ROOT, "data", "products.json");

/** Copied verbatim from scripts/seed.mjs - see the header note. */
const STORE_MULTIPLIERS = {
  freshco: 1.0,
  walmart: 0.93,
  nofrills: 0.96,
  metro: 1.07,
};

function wobble(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = (h >>> 0) / 4294967296; // [0,1)
  return (u - 0.5) * 0.12;
}

const round2 = (n) => Math.round(n * 100) / 100;

function pricesFor(item) {
  const prices = {};
  for (const [storeId, mult] of Object.entries(STORE_MULTIPLIERS)) {
    const p = item.base * (mult + wobble(`${item.id}:${storeId}`));
    prices[storeId] = round2(Math.max(0.5, p));
  }
  return prices;
}

const dry = process.argv.includes("--dry");

const items = JSON.parse(readFileSync(ITEMS, "utf8"));
const existingRaw = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
const existing = Array.isArray(existingRaw) ? existingRaw : existingRaw.products ?? [];
const byId = new Map(existing.map((p) => [p.id, p]));

const out = [];
let kept = 0;
let added = 0;

for (const item of items) {
  const original = byId.get(item.id);
  if (original) {
    // Straight through. Do not regenerate, do not "improve".
    out.push(original);
    kept++;
    continue;
  }
  out.push({
    id: item.id,
    name: item.name,
    brand: "",
    category: item.category,
    unit: item.unit,
    size: item.size,
    emoji: item.emoji,
    searchTerms: item.searchTerms,
    prices: pricesFor(item),
  });
  added++;
}

// Anything in the old file that the new list somehow missed still ships - a
// product silently vanishing would break whatever references it.
for (const p of existing) {
  if (!items.some((i) => i.id === p.id)) {
    out.push(p);
    console.log(`  carried over an item not in items.json: ${p.id}`);
  }
}

/* ------------------------------------------------------------- assertions */
const ids = out.map((p) => p.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) throw new Error(`duplicate ids: ${dupes.slice(0, 5).join(", ")}`);

for (const before of existing) {
  const after = out.find((p) => p.id === before.id);
  if (!after) throw new Error(`original product ${before.id} went missing`);
  if (JSON.stringify(after) !== JSON.stringify(before)) {
    throw new Error(`original product ${before.id} was modified - it must pass through untouched`);
  }
}

for (const p of out) {
  if (!p.id || !p.name || !p.category) throw new Error(`incomplete product: ${p.id}`);
  const vals = Object.values(p.prices ?? {});
  if (vals.length === 0) throw new Error(`no prices for ${p.id}`);
  for (const v of vals) {
    if (typeof v !== "number" || !(v > 0)) throw new Error(`bad price on ${p.id}: ${v}`);
  }
}

console.log(`products: ${out.length}  (kept ${kept} original, added ${added} new)`);
const all = out.flatMap((p) => Object.values(p.prices));
all.sort((a, b) => a - b);
console.log(`prices: min $${all[0]}  median $${all[all.length >> 1]}  max $${all[all.length - 1]}`);
console.log(`raspberries present: ${out.some((p) => /raspberr/i.test(p.name))}`);

if (dry) {
  console.log("\n--dry: nothing written.");
} else {
  copyFileSync(OUT, `${OUT}.bak`);
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nwrote ${OUT}  (previous kept as products.json.bak)`);
}
