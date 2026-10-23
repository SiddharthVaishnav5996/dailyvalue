import Fuse from "fuse.js";
import { PRODUCTS } from "@/lib/catalog/products";

/*
 * Catalog shortlist - send the model only the part of the catalog it needs.
 * ---------------------------------------------------------------------------
 * The model copies a catalog id into each item's "catalogId", which is what
 * makes "butter" land on the same product every time. It used to see ALL
 * ~2,000 ids on every request: about 13,000 tokens of list to answer
 * "butter", growing with every product added.
 *
 * Instead we search the catalog locally first - free, a millisecond, no
 * network - and put only the best few dozen matches in the message. This is
 * retrieval, the "R" in RAG: look things up first, then ask the model to
 * choose from what you found.
 *
 * What the shortlist cannot see: ingredients the shopper never typed. "Make
 * pancakes" names no flour. That is fine - the model returns catalogId null
 * for those, and the resolver's exact-name match (lib/catalog/resolve.ts)
 * finds "All-purpose flour" on its own. The shortlist is a bonus for
 * consistency, not the only road to a product.
 */

const fuse = new Fuse(PRODUCTS, {
  keys: ["name", "searchTerms"],
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.3,
  minMatchCharLength: 3,
});

// Filler words that carry no product meaning. They matter more than they look:
// a word left in here is fuzzy-matched against the whole catalog, and "give"
// alone was dragging olives, chives, liver, endive, hard drives and a
// screwdriver set into the shortlist - 15 junk ids out of 47 for "Give me
// recipe for an apple pie." - because Fuse matches letters, not meaning.
const STOP = new Set([
  "a", "an", "the", "and", "or", "of", "for", "to", "with", "some", "me", "my",
  "i", "need", "want", "buy", "get", "give", "make", "making", "cook", "cooking",
  "please", "can", "you", "find", "show", "pack", "bottle", "in", "on",
]);

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const EXACT = new Map<string, string>();
for (const p of PRODUCTS) {
  for (const term of [p.name, ...p.searchTerms]) {
    if (!EXACT.has(norm(term))) EXACT.set(norm(term), p.id);
  }
}

/**
 * The one product the shopper named outright, or null. "butter" is the
 * butter product, not an invitation to compare every butter-ish candidate in
 * the shortlist - without this hint the model offered butter, European butter
 * and vegan butter for a one-word request.
 */
export function exactMatchFor(text: string): string | null {
  const t = norm(text);
  return EXACT.get(t) ?? EXACT.get(t.replace(/s$/, "")) ?? null;
}

/** The ids most likely to be what this text is asking for, best first. */
export function shortlistFor(text: string, limit = 60): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9%\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));

  // Phrases first (the whole text, then each pair of words), single words
  // last: "red wine" should rank wines above everything merely red.
  const phrases = [
    text.trim(),
    ...words.slice(0, -1).map((w, i) => `${w} ${words[i + 1]}`),
    ...words,
  ].filter(Boolean);

  const best = new Map<string, number>();
  for (const phrase of phrases) {
    for (const hit of fuse.search(phrase, { limit: 15 })) {
      const score = hit.score ?? 1;
      const prev = best.get(hit.item.id);
      if (prev === undefined || score < prev) best.set(hit.item.id, score);
    }
  }

  return [...best.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([id]) => id);
}
