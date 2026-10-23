import { NextResponse } from "next/server";
import { resolveItems } from "@/lib/catalog/resolve";
import { catalogItems, searchCatalog } from "@/lib/catalog/quickSearch";

/**
 * GET /api/quick-search?q=milk
 * ---------------------------------------------------------------------------
 * The header bar's instant product lookup: a typed word in, the matching
 * products out, each already priced at every store that stocks it.
 *
 * It runs on the server for the same reason /api/suggestions does — the match
 * reads the whole 2,000-product catalog (around 900 KB), which has no business
 * being shipped to the browser so somebody can type "milk".
 *
 * No AI call, which is the whole point: this is the path for the shopper who
 * knows what they want and does not need a plan written for them.
 *
 * A GET rather than a POST because it is a read with no side effects, so it
 * caches and is trivially retried by the browser.
 *
 * Response body: { products: ResolvedProduct[] }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Typed by whoever can reach the site, so cap it before it reaches the
  // matcher. A long string costs a full catalog scan and buys nothing.
  const query = (searchParams.get("q") ?? "").slice(0, 80);

  try {
    const matches = searchCatalog(query, 3);
    if (!matches.length) return NextResponse.json({ products: [] });

    // Deliberately no attachImages(): that can reach out to Pexels, and this
    // endpoint answers every few keystrokes. Products fall back to the photo
    // the catalog already has, or to their emoji tile.
    const { products } = resolveItems(catalogItems(matches));
    return NextResponse.json({ products });
  } catch (err) {
    console.error("[api/quick-search] Unexpected error:", err);
    return NextResponse.json({ error: "Could not search products." }, { status: 500 });
  }
}
