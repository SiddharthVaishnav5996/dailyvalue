/*
 * Seed real, branded packshots from Open Food Facts.
 * ---------------------------------------------------------------------------
 * WHY THIS IS A SCRIPT AND NOT A LOOKUP
 *
 * Open Food Facts limits search to roughly TEN calls a minute. A single
 * DailyValue search resolves up to fourteen products at once, so calling it
 * live would return HTTP 503 for most of them - which is exactly what happened
 * when it was first tried. Measured, not assumed.
 *
 * So the work happens once, here, slowly, and the answers are written to
 * data/brandPhotos.json and committed. At runtime the app reads that file: no
 * network, no rate limit, no flakiness, and the same photo every time. This is
 * the same shape as scripts/seed.mjs, which bakes the grocery prices.
 *
 * WHAT IT COLLECTS
 *
 * For each product in the catalog it asks Open Food Facts what Canadians
 * actually buy, then keeps one photograph per BRAND. That is what makes the
 * store comparison worth looking at: the Great Value tub at Walmart and the
 * Compliments tub at Sobeys are different products and now they look it.
 *
 * ABOUT THE DATA
 *
 * Open Food Facts is a free, community-built database. Photographs are
 * contributed by shoppers and licensed CC-BY-SA, so they vary: most are clean
 * front-of-pack shots, some are phone snaps. Anything without a brand, a name
 * or a front image is skipped.
 *
 * THE PHOTOGRAPHS ARE DOWNLOADED, NOT LINKED
 *
 * Linking straight to their CDN looked fine and failed in production. Next's
 * image optimizer fetches a remote image server-side with a seven second
 * budget, and Open Food Facts does not answer that fetch in time - every card
 * came back 504 even though the same URL loads instantly in a browser. So each
 * photograph is downloaded once, here, into public/stores/Brand Photos/ and
 * served as a local file like every other image in the project.
 *
 * Only STORE brands are kept - Great Value, No Name, Compliments and the rest.
 * They are the ones the comparison is built on, and keeping the other four
 * hundred would add megabytes to the repository for photographs nothing asks
 * for.
 *
 * IT IS RESUMABLE, AND IT NEEDS TO BE
 *
 * Even at one call every several seconds the API returns HTTP 503 for a good
 * share of requests - the published limit is not the whole story. So each run
 * LOADS what is already in data/brandPhotos.json, skips anything already
 * there, and writes after every product. Run it two or three times and the
 * gaps fill in. Pass --refresh to ignore what is there and re-fetch the lot.
 *
 * Run it with:  npm run seed-photos
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const OUT = join(ROOT, "data", "brandPhotos.json");
const CATALOG = join(ROOT, "data", "products.json");
const BRANDS_TS = join(ROOT, "data", "brands.ts");
/** Where the downloaded packshots live, and how the app refers to them. */
const PHOTO_DIR = join(ROOT, "public", "stores", "Brand Photos");
const PHOTO_URL = "/stores/Brand Photos";

/** Open Food Facts asks for a real user agent so it can tell clients apart. */
const USER_AGENT = "DailyValue/1.0 (portfolio project; contact via github)";

/** The documented limit is about ten searches a minute; in practice it is less. */
const DELAY_MS = 9000;
/** How long to wait before a second attempt at a request that was refused. */
const RETRY_MS = 25000;

const FIELDS = [
  "code",
  "product_name",
  "brands",
  "quantity",
  "image_front_small_url",
  "image_front_url",
].join(",");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The store brand names, read straight out of data/brands.ts.
 *
 * A script cannot import TypeScript, so the names are pulled out with a
 * regular expression. That is brittle by nature, so it fails loudly rather
 * than quietly finding nothing: if the shape of that file changes, this stops
 * the run instead of silently downloading zero photographs.
 */
function storeBrandNames() {
  const ts = readFileSync(BRANDS_TS, "utf8");
  const names = [...ts.matchAll(/name: "([^"]+)"/g)].map((m) => m[1]);
  if (names.length < 10) {
    throw new Error(
      `Only found ${names.length} brand names in data/brands.ts - the file's shape must have changed.`,
    );
  }
  return names;
}

/** Lowercase words, punctuation dropped. */
const wordsOf = (value) =>
  String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean);

/**
 * Is this the store brand, however the database happens to spell it?
 *
 * Contributors file Loblaw's value line as "No name-Sans nom • Loblaws" and
 * Walmart's as "Great Value • Walmart", so the brand's words have to appear
 * together, in order, at the start. Same rule as lib/catalog/brandPhotos.ts.
 */
function isBrand(candidate, brand) {
  const wanted = wordsOf(brand);
  const got = wordsOf(candidate);
  return got.length >= wanted.length && wanted.every((w, i) => got[i] === w);
}

/** "Great Value • Walmart" + "whole-wheat-bread" -> "great-value-whole-wheat-bread.jpg" */
const photoFileName = (brand, productKey) =>
  `${slug(brand)}-${productKey}.jpg`.replace(/-+/g, "-");

/** Fetch one photograph and write it next to the others. */
async function downloadPhoto(url, fileName) {
  const target = join(PHOTO_DIR, fileName);
  if (existsSync(target)) return true; // already have it

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) return false;

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 1000) return false; // a placeholder or an error page
  writeFileSync(target, bytes);
  return true;
}

/**
 * Keep only the store brands, and pull their photographs down to disk.
 *
 * Runs over whatever is already in the file, so it can be repeated on its own
 * with --download-only after the searching is done.
 */
async function downloadPass(out) {
  const brands = storeBrandNames();
  mkdirSync(PHOTO_DIR, { recursive: true });

  let kept = 0;
  let dropped = 0;
  let failed = 0;

  for (const [productKey, byBrand] of Object.entries(out)) {
    const keep = {};

    for (const [brandKey, photo] of Object.entries(byBrand)) {
      const match = brands.find((b) => isBrand(photo.brand, b));
      if (!match) {
        dropped++;
        continue;
      }

      // Already local from an earlier run.
      if (photo.image.startsWith(PHOTO_URL)) {
        keep[brandKey] = photo;
        kept++;
        continue;
      }

      const fileName = photoFileName(match, productKey);
      try {
        const ok = await downloadPhoto(photo.image, fileName);
        if (!ok) { failed++; continue; }
        keep[brandKey] = {
          ...photo,
          /** Kept so a photograph can be credited and re-fetched. */
          source: photo.image,
          image: `${PHOTO_URL}/${fileName}`,
        };
        kept++;
      } catch {
        failed++;
      }
    }

    if (Object.keys(keep).length > 0) out[productKey] = keep;
    else delete out[productKey];
  }

  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nDownload pass: kept ${kept} store-brand photographs, dropped ${dropped} others, ${failed} failed.`);
  return out;
}

/** Lowercase, punctuation-free - the key everything is matched on. */
const flatten = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");

/** "2% Milk" -> "2-milk", the key used in the output file. */
const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function searchCanada(terms) {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", terms);
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "24");
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("tagtype_0", "countries");
  url.searchParams.set("tag_contains_0", "contains");
  url.searchParams.set("tag_0", "canada");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).products ?? [];
}

/**
 * Is this row good enough to put on a card?
 *
 * The bar is deliberately high. A card with a wrong or unreadable photograph is
 * worse than a card with none, which is the rule the curated set already
 * follows - see lib/catalog/curated.ts.
 */
function usable(p) {
  if (!p.product_name || !p.product_name.trim()) return false;
  if (!p.brands || !p.brands.trim()) return false;
  if (!p.image_front_small_url) return false;
  // Names that are just a barcode or a single letter help nobody.
  if (p.product_name.trim().length < 3) return false;
  return true;
}

/** The first brand listed, tidied. OFF stores them comma separated. */
const firstBrand = (brands) => String(brands).split(",")[0].trim();

/** Search, and give a refused request one more chance after a longer wait. */
async function searchWithRetry(terms) {
  try {
    return await searchCanada(terms);
  } catch (err) {
    if (!String(err.message).includes("503")) throw err;
    await sleep(RETRY_MS);
    return await searchCanada(terms);
  }
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  const downloadOnly = process.argv.includes("--download-only");
  const catalog = JSON.parse(readFileSync(CATALOG, "utf8"));
  const products = Array.isArray(catalog) ? catalog : (catalog.products ?? []);

  /** slug -> { brandKey -> { brand, name, image, size, code } } */
  let out = {};
  if (!refresh) {
    try {
      out = JSON.parse(readFileSync(OUT, "utf8"));
    } catch {
      out = {}; // first run, or the file was hand-edited into something odd
    }
  }

  if (downloadOnly) {
    await downloadPass(out);
    return;
  }

  const todo = products.filter((p) => refresh || !out[slug(p.name)]);

  console.log(`Catalog: ${products.length} products. Already seeded: ${Object.keys(out).length}.`);
  if (todo.length === 0) {
    console.log("Nothing left to search for. Use --refresh to fetch it all again.");
    await downloadPass(out);
    return;
  }
  console.log(`Fetching ${todo.length}, one every ${DELAY_MS / 1000}s.\n`);

  let found = 0;
  let empty = 0;
  let failed = 0;

  for (const [index, product] of todo.entries()) {
    const key = slug(product.name);
    const label = `${String(index + 1).padStart(2)}/${todo.length} ${product.name}`;

    try {
      const rows = (await searchWithRetry(product.name)).filter(usable);
      const byBrand = {};

      for (const row of rows) {
        const brand = firstBrand(row.brands);
        const brandKey = flatten(brand);
        if (!brandKey || byBrand[brandKey]) continue; // keep the first, best-ranked one
        byBrand[brandKey] = {
          brand,
          name: row.product_name.trim(),
          size: (row.quantity ?? "").trim() || undefined,
          image: row.image_front_url || row.image_front_small_url,
          code: row.code,
        };
      }

      const count = Object.keys(byBrand).length;
      if (count > 0) {
        out[key] = byBrand;
        found += count;
        // Written after every product, so a crash or a Ctrl-C keeps the work.
        writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
        console.log(`${label} -> ${count} brands: ${Object.values(byBrand).map((b) => b.brand).slice(0, 4).join(", ")}`);
      } else {
        empty++;
        console.log(`${label} -> nothing usable`);
      }
    } catch (err) {
      failed++;
      console.log(`${label} -> FAILED (${err.message})`);
    }

    if (index < todo.length - 1) await sleep(DELAY_MS);
  }

  await downloadPass(out);

  const photos = Object.values(out).reduce((n, byBrand) => n + Object.keys(byBrand).length, 0);
  console.log(`\nWrote ${OUT}`);
  console.log(`  products with photos : ${Object.keys(out).length}/${products.length}`);
  console.log(`  brand photos in total: ${photos} (${found} new this run)`);
  console.log(`  nothing usable       : ${empty}`);
  console.log(`  requests that failed : ${failed}`);
  if (failed > 0) {
    console.log("\nFailures are almost always the rate limit. Run it again - it picks up where it left off.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
