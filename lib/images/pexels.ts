import type { ResolvedProduct } from "@/lib/types";

/*
 * Product photos, from Pexels.
 * ---------------------------------------------------------------------------
 * Products the AI invents have no image in /public, and a grid of grey boxes
 * looks unfinished. Pexels is a free stock-photo API - 200 requests an hour,
 * 20,000 a month, no card, no approval queue.
 *
 * Why not a real product-photo API? Your seed script already records the
 * answer: an earlier attempt used Open Food Facts, whose crowd-sourced photos
 * returned a Pringles can for "onion". Stock photography is less precise but
 * never absurd - search "onion" and you get onions.
 *
 * Three rules keep this cheap and safe:
 *   - CACHE every lookup, so a repeat search costs nothing.
 *   - NEVER let an image failure break a search. No photo is fine; a crash is not.
 *   - CAP how many run at once, so one query cannot burn the hourly allowance.
 */

const ENDPOINT = "https://api.pexels.com/v1/search";

/**
 * 10 seconds, not 6.
 *
 * The FIRST request a freshly started server makes to a host is much slower
 * than every one after it: it has to resolve DNS and complete a TLS handshake,
 * which later requests reuse. At 6 seconds the very first search after a
 * restart silently lost all its photos while every later search was fine -
 * a bug that looked like "photos only work sometimes".
 *
 * Cold-start latency is worth remembering generally. Timeouts tuned against a
 * warm connection are always too tight for the first call.
 */
const TIMEOUT_MS = 10_000;

/**
 * Lookups already made, kept in memory.
 *
 * `null` is a real cached value meaning "we asked and there was nothing", so
 * a product with no photo is not looked up again and again.
 *
 * This cache lives in the server process, so restarting `npm run dev` clears
 * it. That is fine here. A production version would use Redis or a database
 * so the cache survives a deploy - worth saying out loud in an interview,
 * because the interviewer will ask.
 */
const cache = new Map<string, string | null>();

/** Words that sharpen a search without narrowing it to nothing. */
const DEPARTMENT_HINT: Record<string, string> = {
  produce: "fresh",
  dairy: "dairy product",
  bakery: "bakery",
  meat: "raw meat",
  pantry: "food ingredient",
  beverages: "drink",
  alcohol: "bottle",
  frozen: "frozen food",
  snacks: "snack",
  household: "cleaning supplies",
  furniture: "furniture",
  appliances: "appliance",
  electronics: "electronics",
  hardware: "tools",
  garden: "garden",
  baby: "baby products",
  pet: "pet supplies",
  pharmacy: "pharmacy",
  sports: "sports equipment",
  automotive: "car parts",
};

/** Build the search phrase. Short and concrete beats long and specific. */
function queryFor(product: ResolvedProduct): string {
  // Strip pack sizes and brand noise - "Philadelphia Cream Cheese 250 g"
  // searches far worse than "cream cheese".
  const cleaned = product.description
    .replace(/\b\d+(\.\d+)?\s*(g|kg|ml|l|oz|lb|ct|pack|pk)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const hint = DEPARTMENT_HINT[product.department] ?? "";
  return `${cleaned} ${hint}`.trim().slice(0, 80);
}

/** Ask Pexels for one photo. Returns undefined on any problem at all. */
async function lookup(query: string, apiKey: string): Promise<string | undefined> {
  const cached = cache.get(query);
  // `!== undefined` rather than a truthiness check, because null is a real
  // cached answer meaning "we already looked and found nothing".
  if (cached !== undefined) return cached ?? undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&per_page=1&orientation=square`;
    const response = await fetch(url, {
      // Pexels wants the key raw in an Authorization header, with no "Bearer"
      // prefix. Providers differ on this; always check their docs.
      headers: { Authorization: apiKey },
      signal: controller.signal,
    });

    if (!response.ok) {
      // 429 here means the hourly allowance is gone. Cache the miss so we
      // stop hammering it for the rest of this request.
      cache.set(query, null);
      return undefined;
    }

    const data = await response.json();
    const src: unknown = data?.photos?.[0]?.src?.medium;
    const found = typeof src === "string" ? src : null;

    cache.set(query, found);
    return found ?? undefined;
  } catch {
    // Timeouts, DNS failures, malformed JSON. A missing photo is never worth
    // failing a search over, so we swallow it deliberately.
    cache.set(query, null);
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/** Most products we will look up in a single search. */
const MAX_LOOKUPS = 14;

/**
 * Attach a photo to each product, in place.
 *
 * Runs the lookups concurrently with Promise.all rather than one after
 * another. Fourteen sequential requests at ~300ms each would add four seconds
 * to every search; run together they cost about as long as the slowest one.
 */
export async function attachImages(products: ResolvedProduct[]): Promise<void> {
  const apiKey = process.env.PEXELS_API_KEY;
  // No key configured is a normal state, not an error. Cards fall back to
  // their emoji tile and everything else works.
  if (!apiKey) return;

  const targets = products.filter((p) => !p.imageSrc).slice(0, MAX_LOOKUPS);

  await Promise.all(
    targets.map(async (product) => {
      const src = await lookup(queryFor(product), apiKey);
      if (src) {
        product.imageSrc = src;
        product.imageAlt = product.description;
        // "contain", to match the ~36 hand-fitted product shots already in the
        // project. Every one of those sits in the frame rather than being
        // cropped to fill it, and a grid where some cards crop and others fit
        // reads as broken even when each card looks fine on its own.
        //
        // This is why the lookup asks Pexels for square images: a square photo
        // fills a near-square frame almost completely under "contain", so the
        // match to the curated cards is close.
        product.imageFit = "contain";
      }
    }),
  );
}
