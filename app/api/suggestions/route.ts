import { NextResponse } from "next/server";
import { resolveItems } from "@/lib/catalog/resolve";
import { suggestionItems } from "@/lib/catalog/suggestions";
import { attachImages } from "@/lib/images/pexels";
import type { AIItem } from "@/lib/types";

/**
 * POST /api/suggestions
 * ---------------------------------------------------------------------------
 * The "People also bought" strip on the checkout page. Given the shopping list
 * the AI wrote, pick complementary catalog products and build them into the
 * same product cards the search's own items get.
 *
 * It runs on the server because the pick reads the whole 2,000-product catalog,
 * which has no business being shipped to the browser for four cards.
 *
 * No AI call: the suggestions are derived from the list that was already paid
 * for, so a new search costs nothing extra here.
 *
 * Request body:  { items: AIItem[], query?: string, exclude?: string[] }
 * Response body: { products: ResolvedProduct[] }
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Sent by the browser, so treat it as untrusted. Only the few fields the
  // picker reads are taken, and the list is capped - this endpoint does catalog
  // scans and can trigger photo lookups.
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 60) : [];
  const items: AIItem[] = rawItems.map((raw) => {
    const item = (raw ?? {}) as Partial<AIItem>;
    return {
      rowIds: [],
      name: typeof item.name === "string" ? item.name.slice(0, 120) : "",
      brandHint: null,
      category: typeof item.category === "string" ? item.category.slice(0, 60) : "",
      department: typeof item.department === "string" ? item.department.slice(0, 40) : "",
      catalogId: typeof item.catalogId === "string" ? item.catalogId.slice(0, 80) : null,
      searchTerms: [],
      quantity: 1,
      packSize: null,
      estimatedPrice: null,
    };
  });

  const query = typeof body.query === "string" ? body.query.slice(0, 200) : "";
  const exclude = Array.isArray(body.exclude)
    ? body.exclude.filter((id): id is string => typeof id === "string").slice(0, 200)
    : [];

  try {
    const picks = suggestionItems(items, query, { exclude });
    const { products } = resolveItems(picks);
    await attachImages(products);
    return NextResponse.json({ products });
  } catch (err) {
    console.error("[api/suggestions] Unexpected error:", err);
    return NextResponse.json(
      { error: "Could not build suggestions." },
      { status: 500 },
    );
  }
}
