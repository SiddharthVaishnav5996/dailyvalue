import { NextResponse } from "next/server";
import type { RecipeResult } from "@/lib/types";
import { getRecipe } from "@/lib/ai/client";
import { compare } from "@/lib/catalog/compare";
import { matchIngredients, unmatchedNames } from "@/lib/catalog/match";

/**
 * POST /api/recipe
 * Body: { query: string }
 *
 * The core pipeline, server-side so GEMINI_API_KEY never reaches the browser:
 *   query → AI recipe → catalog matching → cross-store price comparison.
 */
export async function POST(request: Request) {
  let query: unknown;
  try {
    const body = await request.json();
    query = body?.query;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof query !== "string" || query.trim().length < 2) {
    return NextResponse.json(
      { error: "Please describe a dish or recipe (at least a couple of characters)." },
      { status: 400 },
    );
  }

  try {
    const { recipe, source } = await getRecipe(query.trim());
    const items = matchIngredients(recipe.ingredients);
    const comparison = compare(items);

    const result: RecipeResult = {
      query: query.trim(),
      source,
      recipe,
      items,
      comparison,
      unmatched: unmatchedNames(items),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/recipe] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong building your cart. Please try again." },
      { status: 500 },
    );
  }
}
