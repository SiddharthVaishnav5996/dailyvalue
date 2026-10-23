/*
 * Add current Apple and Samsung phones, their earbuds/headphones, and phone
 * accessories to the catalog.
 *
 * Why: the header's quick search reads data/products.json only. The iPhones the
 * app already knew about were curated landing cards (lib/catalog/curated.ts), so
 * typing "iphone" into the quick search found nothing.
 *
 * Prices are Canadian list prices for the base storage tier as reported in
 * Oct 2026 (Apple raised iPhone 17 / Air / 17e prices in Sept 2026; Samsung
 * raised the S26 series in Oct 2026). Phones and audio are priced at the three
 * stores with an electronics department: Superstore and Walmart at list,
 * Costco ~4% under list. Accessories use the usual generated spread.
 *
 * Writes data/products.json only (items.json was merged into it).
 * Idempotent: ids already present are skipped; a new name or alias that
 * belongs to another product aborts the run.
 * Run:  node scripts/add-phones-audio.mjs   (add --dry to preview)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PRODUCTS = `${ROOT}data/products.json`;

// [id, name, brand, size, listPrice, emoji, searchTerms]
const PHONES = [
  ["iphone-18-pro-max", "Apple iPhone 18 Pro Max", "Apple", "256 GB", 1899, "📱", ["iphone 18 pro max", "18 pro max"]],
  ["iphone-18-pro", "Apple iPhone 18 Pro", "Apple", "256 GB", 1749, "📱", ["iphone 18 pro", "18 pro", "latest iphone", "iphone", "apple iphone"]],
  ["iphone-air", "Apple iPhone Air", "Apple", "256 GB", 1599, "📱", ["iphone air"]],
  ["iphone-17", "Apple iPhone 17", "Apple", "256 GB", 1299, "📱", ["iphone 17 256gb", "apple iphone 17"]],
  ["iphone-17e", "Apple iPhone 17e", "Apple", "256 GB", 999, "📱", ["iphone 17e", "cheapest iphone"]],
  ["galaxy-s26-ultra", "Samsung Galaxy S26 Ultra", "Samsung", "256 GB", 2049.99, "📱", ["galaxy s26 ultra", "samsung s26 ultra", "s26 ultra"]],
  ["galaxy-s26-plus", "Samsung Galaxy S26+", "Samsung", "256 GB", 1679.99, "📱", ["galaxy s26 plus", "galaxy s26+", "samsung s26 plus"]],
  ["galaxy-s26", "Samsung Galaxy S26", "Samsung", "256 GB", 1399.99, "📱", ["galaxy s26", "samsung s26", "samsung galaxy phone", "latest samsung"]],
  ["galaxy-z-fold8", "Samsung Galaxy Z Fold8", "Samsung", "256 GB", 2399.99, "📱", ["galaxy z fold8", "galaxy fold 8", "samsung fold", "z fold 8"]],
  ["galaxy-z-flip8", "Samsung Galaxy Z Flip8", "Samsung", "256 GB", 1549.99, "📱", ["galaxy z flip8", "galaxy flip 8", "samsung flip", "z flip 8"]],
];

const AUDIO = [
  ["airpods-pro-3", "Apple AirPods Pro 3", "Apple", "1 ct", 329, "🎧", ["airpods pro 3", "airpods pro", "apple earbuds"]],
  ["airpods-4-anc", "Apple AirPods 4 with Active Noise Cancellation", "Apple", "1 ct", 249, "🎧", ["airpods 4 anc", "airpods 4 noise cancelling"]],
  ["airpods-4", "Apple AirPods 4", "Apple", "1 ct", 179, "🎧", ["airpods 4", "airpods"]],
  ["airpods-max", "Apple AirPods Max", "Apple", "1 ct", 779, "🎧", ["airpods max", "apple headphones"]],
  ["apple-earpods-usb-c", "Apple EarPods (USB-C)", "Apple", "1 ct", 25, "🎧", ["apple earpods", "earpods", "iphone earphones"]],
  ["galaxy-buds4-pro", "Samsung Galaxy Buds4 Pro", "Samsung", "1 ct", 329, "🎧", ["galaxy buds4 pro", "galaxy buds 4 pro", "samsung earbuds pro"]],
  ["galaxy-buds4", "Samsung Galaxy Buds4", "Samsung", "1 ct", 249, "🎧", ["galaxy buds4", "galaxy buds 4", "galaxy buds", "samsung earbuds"]],
];

const ACCESSORIES = [
  ["iphone-18-pro-clear-case", "iPhone 18 Pro Clear Case with MagSafe", "Apple", "1 ct", 69, "📱", ["iphone 18 pro case", "iphone case", "magsafe case", "iphone cover"]],
  ["iphone-17-silicone-case", "iPhone 17 Silicone Case with MagSafe", "Apple", "1 ct", 69, "📱", ["iphone 17 case", "iphone silicone case"]],
  ["galaxy-s26-ultra-case", "Samsung Galaxy S26 Ultra Silicone Case", "Samsung", "1 ct", 49.99, "📱", ["galaxy s26 ultra case", "samsung case", "samsung phone cover"]],
  ["galaxy-s26-case", "Samsung Galaxy S26 Silicone Case", "Samsung", "1 ct", 34.99, "📱", ["galaxy s26 case", "s26 cover"]],
  ["iphone-screen-protector", "iPhone 18 Pro Tempered Glass Screen Protector", "", "2 ct", 29.99, "📱", ["iphone screen protector", "iphone tempered glass", "iphone 18 pro screen protector"]],
  ["galaxy-screen-protector", "Galaxy S26 Ultra Screen Protector", "", "2 ct", 29.99, "📱", ["galaxy screen protector", "samsung screen protector", "s26 ultra screen protector"]],
  ["apple-20w-usb-c-adapter", "Apple 20W USB-C Power Adapter", "Apple", "1 ct", 25, "🔌", ["apple charger", "iphone charger", "apple 20w adapter"]],
  ["apple-magsafe-charger", "Apple MagSafe Charger", "Apple", "1 ct", 59, "🔌", ["magsafe charger", "iphone wireless charger"]],
  ["samsung-25w-charger", "Samsung 25W Super Fast Charger", "Samsung", "1 ct", 34.99, "🔌", ["samsung charger", "samsung fast charger", "galaxy charger"]],
];

// Same FNV wobble as the other add-* scripts, so generated prices look alike.
function wobble(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 4294967296 - 0.5) * 0.12;
}
const round2 = (n) => Math.round(n * 100) / 100;
const to99 = (n) => Math.floor(n) + 0.99;

/** Phones and audio: list price at Superstore and Walmart, Costco a little under. */
const listPrices = (id, list) => ({ superstore: list, walmart: list, costco: to99(list * 0.96) });
/** Accessories: generated spread around the base, like the rest of the catalog. */
const spreadPrices = (id, base) => ({
  superstore: round2(base * (1.0 + wobble(`${id}:superstore`))),
  walmart: round2(base * (0.93 + wobble(`${id}:walmart`))),
});

const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/s$/, "");

const DRY = process.argv.includes("--dry");
const products = JSON.parse(readFileSync(PRODUCTS, "utf8"));
const owner = new Map();
for (const p of products) for (const t of [p.name, ...p.searchTerms]) owner.set(norm(t), p.id);

const log = [];
const groups = [[PHONES, listPrices], [AUDIO, listPrices], [ACCESSORIES, spreadPrices]];
for (const [rows, priceFn] of groups) {
  for (const [id, name, brand, size, price, emoji, terms] of rows) {
    if (products.some((p) => p.id === id)) { log.push(`skip ${id}`); continue; }
    for (const t of [name, ...terms]) {
      const o = owner.get(norm(t));
      if (o && o !== id) throw new Error(`"${t}" for ${id} already belongs to ${o}`);
    }
    products.push({
      id, name, brand, category: "Electronics", unit: "each", size, base: price, emoji,
      searchTerms: terms, imageMode: "brand", offQuery: name.toLowerCase(),
      prices: priceFn(id, price),
    });
    for (const t of [name, ...terms]) owner.set(norm(t), id);
    log.push(`add ${id}`);
  }
}

console.log(log.join("\n"));
if (DRY) console.log("--dry: nothing written.");
else {
  writeFileSync(PRODUCTS, JSON.stringify(products, null, 2) + "\n");
  console.log(`products ${products.length}`);
}
