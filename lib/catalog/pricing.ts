/*
 * Deterministic pricing.
 * ---------------------------------------------------------------------------
 * There is no free public API for live Walmart or FreshCo prices, so prices
 * for AI-generated products have to be simulated. The naive way is
 * Math.random(), and it is wrong for three reasons:
 *
 *   1. The same product would cost something different every time the page
 *      reloaded, which looks broken.
 *   2. "Which store is cheapest" would flip on every render, so the whole
 *      comparison feature would be meaningless.
 *   3. Nothing would be reproducible, so no bug could ever be investigated.
 *
 * Instead we HASH. A hash turns text into a number, and crucially the same
 * text always produces the same number. So "air conditioner" + "walmart"
 * always yields the same wobble, forever, on every machine, with no database.
 *
 * This is the same trick scripts/seed.mjs already uses for the fixed catalog,
 * lifted out so both paths price things the same way.
 */

/**
 * FNV-1a: a small, fast, well-known hash. Text in, a number 0-1 out.
 *
 * You do not need to understand the arithmetic. What matters is the property:
 * same input, same output, always.
 */
export function hashFloat(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    // Multiply by the FNV prime, expressed as shifts so it stays a 32-bit int.
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  // `>>> 0` forces the result to an unsigned 32-bit integer, then we scale it
  // into the range 0 to 1.
  return ((h >>> 0) % 100000) / 100000;
}

/** A deterministic number between min and max for a given seed. */
export function hashRange(seed: string, min: number, max: number): number {
  return min + hashFloat(seed) * (max - min);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Price one product at one store.
 *
 * Two things move the price away from the base:
 *   - the store's own price level (Walmart 0.93, Metro 1.07, and so on)
 *   - a small per-product wobble, so one store is not simply cheapest on
 *     every single item, which would be unrealistic and would make the
 *     comparison feature pointless.
 */
export function priceAt(
  basePrice: number,
  productKey: string,
  storeId: string,
  storePriceIndex: number,
): number {
  // Wobble sits between -6% and +6%, fixed per product-store pair.
  const wobble = hashRange(`${productKey}::${storeId}`, -0.06, 0.06);
  const price = basePrice * storePriceIndex * (1 + wobble);

  // Retail prices almost never end in a random cent, so land on .99, .49 or
  // .29 the way a real shelf tag would. Purely cosmetic, but the absence of
  // it is one of those details that makes fake data look fake.
  const endings = [0.99, 0.49, 0.29, 0.79, 0.0];
  const ending = endings[Math.floor(hashFloat(`${productKey}${storeId}end`) * endings.length)];

  // Round to the NEAREST whole number once the ending is subtracted, rather
  // than flooring. Flooring silently cut up to a full dollar off, which on a
  // $3 item is a 30% discount nobody asked for.
  const whole = Math.max(0, Math.round(price - ending));
  const shelf = whole + ending;

  // Guard the very cheap end, where a whole of 0 and an ending of 0 would
  // otherwise produce a free lemon.
  return round2(Math.max(0.49, shelf));
}

/**
 * A star rating for a product at a store, 3.4 to 5.0.
 *
 * Ratings are per product-store pair because the same mattress genuinely does
 * get reviewed differently at two retailers. Nothing below 3.4, because we
 * only ever surface offers we would actually recommend.
 */
export function ratingAt(productKey: string, storeId: string): number {
  const raw = hashRange(`${productKey}|${storeId}|rating`, 3.4, 5.0);
  // One decimal place, matching how the StarRating component displays it.
  return Math.round(raw * 10) / 10;
}

/** A believable review count, weighted so most products have a few hundred. */
export function reviewCountAt(productKey: string, storeId: string): number {
  const raw = hashFloat(`${productKey}|${storeId}|reviews`);
  // Squaring pushes the distribution toward the low end, so a handful of
  // products have thousands of reviews and most have far fewer - which is how
  // real review counts are shaped.
  return Math.round(12 + raw * raw * 1800);
}

/**
 * Occasionally mark a product down at one store.
 *
 * Returns the pre-discount price to show struck through, or undefined for no
 * discount. Roughly one offer in five.
 */
export function originalPriceAt(
  price: number,
  productKey: string,
  storeId: string,
): number | undefined {
  const roll = hashFloat(`${productKey}|${storeId}|sale`);
  if (roll > 0.2) return undefined;
  // Discount between 10% and 30%.
  const discount = hashRange(`${productKey}|${storeId}|amt`, 0.1, 0.3);
  return round2(price / (1 - discount));
}
