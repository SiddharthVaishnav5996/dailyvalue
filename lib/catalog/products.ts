import type { Product } from "@/lib/types";
import productsData from "@/data/products.json";

/** Typed catalog loaded from the generated data file (see scripts/seed.mjs). */
export const PRODUCTS = productsData as Product[];

export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.id, p]),
);

/** Soft background tints for the emoji product tiles, keyed by category. */
const CATEGORY_COLORS: Record<string, string> = {
  Dairy: "#fef9c3",
  Produce: "#dcfce7",
  Bakery: "#fde68a",
  Pantry: "#e0e7ff",
  Meat: "#fee2e2",
  Beverages: "#cffafe",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#f1f5f9";
}
