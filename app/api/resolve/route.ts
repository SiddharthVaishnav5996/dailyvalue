import { NextResponse } from "next/server";
import { normalizePlan } from "@/lib/ai/schema";
import { resolveItems } from "@/lib/catalog/resolve";
import { attachImages } from "@/lib/images/pexels";

/**
 * POST /api/resolve
 * ---------------------------------------------------------------------------
 * Turn a shopping list the AI already wrote into product cards, using the
 * project's CURRENT catalog, photos and matching rules. No AI call.
 *
 * Why this exists: a search result is saved in the browser so a refresh does
 * not spend another AI request. But the saved result used to include the
 * finished product cards, which froze them. Fix a photo, a price or a matching
 * rule, and anyone with a saved search kept seeing the old card until they
 * searched again - which looked exactly like the fix had not worked.
 *
 * So the browser now keeps the AI's list, and asks this endpoint to rebuild the
 * cards whenever it restores a saved search. The expensive part is cached; the
 * cheap part is always fresh.
 *
 * Request body:  { items: AIItem[] }
 * Response body: { products: ResolvedProduct[], unresolved: string[] }
 *
 * Like /api/search, this is open to anyone who can reach the site, and it can
 * trigger photo lookups. The item list is capped and sanitised below, the
 * lookups are capped and cached, and per-visitor rate limiting is on the
 * roadmap for both endpoints.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // The browser sent this, so it is untrusted. Rather than write a second
  // validator, reuse the one that already cleans up whatever the AI returns:
  // same field coercion, same caps on list length.
  const { items } = normalizePlan({ inScope: true, items: body.items });

  try {
    const { products, unresolved } = resolveItems(items);
    await attachImages(products);
    return NextResponse.json({ products, unresolved });
  } catch (err) {
    console.error("[api/resolve] Unexpected error:", err);
    return NextResponse.json(
      { error: "Could not refresh these products." },
      { status: 500 },
    );
  }
}
