/*
 * Shared domain types for DailyValue.
 * These describe the data that flows from the AI → catalog matching →
 * price comparison → UI. Keeping them in one place keeps the pipeline honest.
 */

/** A partner grocery store the app can compare / order from. */
export interface Store {
  id: string;
  name: string;
  /** Brand color used for chips/badges in the UI. */
  color: string;
  /** Short label used for the faux logo tile. */
  logoText: string;
  deliveryFee: number;
  /** Human-friendly delivery window, e.g. "Today, 2–4 PM". */
  deliveryEta: string;
}

/**
 * A catalog product. The SAME product is sold at multiple stores at different
 * prices — that's what makes the price comparison meaningful.
 */
export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  /** Purchasable unit, e.g. "block", "each", "bunch". */
  unit: string;
  /** Pack size, e.g. "250 g", "12 ct". */
  size: string;
  /** Emoji used for the product tile (kept consistent for a clean grid). */
  emoji: string;
  /** Aliases used to match free-text ingredients to this product. */
  searchTerms: string[];
  /** storeId → price in CAD. */
  prices: Record<string, number>;
}

/** A single ingredient extracted from a recipe by the AI. */
export interface Ingredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  /** Hints the AI provides to help match this ingredient to a product. */
  searchTerms: string[];
}

/** A recipe produced by the AI (or the built-in demo engine). */
export interface Recipe {
  title: string;
  servings: number;
  /** Total time, e.g. "45 min". */
  time: string;
  steps: string[];
  ingredients: Ingredient[];
}

/** An ingredient paired with the best catalog product we could find. */
export interface IngredientMatch {
  ingredient: Ingredient;
  product: Product | null;
  /** Match confidence 0–1 (1 = exact). */
  score: number;
  /** Quantity of the product to add to the basket (defaults to 1). */
  quantity: number;
}

/** Basket total for one store. */
export interface StoreTotal {
  storeId: string;
  total: number;
  /** How many basket items are available at this store. */
  itemCount: number;
}

/** The price-comparison result across every store. */
export interface Comparison {
  /** Sorted cheapest → most expensive. */
  byStore: StoreTotal[];
  cheapestStoreId: string;
  cheapestTotal: number;
  mostExpensiveTotal: number;
  /** most expensive total − cheapest total. */
  savings: number;
}

/** The full response returned by POST /api/recipe. */
export interface RecipeResult {
  query: string;
  /** Whether a real AI call or the built-in demo engine produced this. */
  source: "ai" | "demo";
  recipe: Recipe;
  items: IngredientMatch[];
  comparison: Comparison;
  /** Ingredient names we couldn't match to any product. */
  unmatched: string[];
}
