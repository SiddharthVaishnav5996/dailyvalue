import Fuse from "fuse.js";
import type { Ingredient, IngredientMatch, Product } from "@/lib/types";
import { PRODUCTS } from "@/lib/catalog/products";

const round2 = (n: number) => Math.round(n * 100) / 100;
const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Exact lookup table: every product name + alias, normalized, → product.
 * This catches the common case (recipe says "cream cheese", catalog has it)
 * instantly and confidently, before we fall back to fuzzy matching.
 */
const EXACT: Map<string, Product> = (() => {
  const map = new Map<string, Product>();
  for (const p of PRODUCTS) {
    for (const term of [p.name, ...p.searchTerms]) {
      const key = normalize(term);
      if (!map.has(key)) map.set(key, p);
    }
  }
  return map;
})();

/** Fuzzy index for messy / partial ingredient names ("fresh blueberries"). */
const fuse = new Fuse(PRODUCTS, {
  keys: ["name", "searchTerms"],
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.4,
  minMatchCharLength: 2,
});

/** Match a single ingredient to the best catalog product (or null). */
export function matchIngredient(ingredient: Ingredient): {
  product: Product | null;
  score: number;
} {
  const candidates = [ingredient.name, ...(ingredient.searchTerms ?? [])]
    .filter(Boolean)
    .map(normalize);

  // 1) Exact / alias hit — highest confidence.
  for (const c of candidates) {
    const hit = EXACT.get(c) ?? EXACT.get(c.replace(/s$/, ""));
    if (hit) return { product: hit, score: 1 };
  }

  // 2) Fuzzy fallback — take the best result across all candidate phrases.
  let best: Product | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const [top] = fuse.search(c, { limit: 1 });
    if (top && typeof top.score === "number" && top.score < bestScore) {
      bestScore = top.score;
      best = top.item;
    }
  }
  if (best && bestScore <= 0.45) {
    return { product: best, score: round2(1 - bestScore) };
  }
  return { product: null, score: 0 };
}

/** Match every ingredient in a recipe. Each match defaults to quantity 1. */
export function matchIngredients(ingredients: Ingredient[]): IngredientMatch[] {
  return ingredients.map((ingredient) => {
    const { product, score } = matchIngredient(ingredient);
    return { ingredient, product, score, quantity: 1 };
  });
}

/** Names of ingredients that produced no catalog match. */
export function unmatchedNames(items: IngredientMatch[]): string[] {
  return items.filter((i) => !i.product).map((i) => i.ingredient.name);
}
