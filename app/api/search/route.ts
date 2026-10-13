import { NextResponse } from "next/server";
import type { SearchResult } from "@/lib/types";
import { getPlan, type ChatTurn } from "@/lib/ai/plan";
import { resolveItems } from "@/lib/catalog/resolve";
import { attachImages } from "@/lib/images/pexels";

/**
 * POST /api/search
 * ---------------------------------------------------------------------------
 * The whole pipeline, in one place, on the server:
 *
 *   1. Read and validate what the browser sent.
 *   2. Ask the AI for a plan  (Gemini -> Groq -> demo).
 *   3. Stop here if the request was out of scope.
 *   4. Resolve the shopping list into real products across real stores.
 *   5. Attach photos.
 *   6. Send back one object the UI can render without any further work.
 *
 * Everything above happens where the shopper cannot see it, which is what
 * keeps the API keys secret. See Chapter 2 of the field notes.
 *
 * Request body:  { query: string, history?: { role, text }[] }
 * Response body: SearchResult   (see lib/types.ts)
 */

/** Longest query we will accept. Anything past this is abuse, not shopping. */
const MAX_QUERY = 600;

/** Read the history array defensively - it comes from the browser. */
function readHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const m = (entry ?? {}) as Record<string, unknown>;
      const role = m.role === "ai" ? "ai" : "user";
      const text = typeof m.text === "string" ? m.text.trim() : "";
      return { role, text } as ChatTurn;
    })
    .filter((m) => m.text.length > 0)
    .slice(-12);
}

export async function POST(request: Request) {
  // --- 1. Read the request -------------------------------------------------
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";

  if (query.length < 2) {
    return NextResponse.json(
      { error: "Tell me what you would like to cook or buy." },
      { status: 400 },
    );
  }

  if (query.length > MAX_QUERY) {
    return NextResponse.json(
      { error: "That message is too long. Try summarising it." },
      { status: 400 },
    );
  }

  const history = readHistory(body.history);

  try {
    // --- 2. Ask the AI -----------------------------------------------------
    const { plan, source, notes } = await getPlan(query, history);

    if (notes.length > 0) {
      console.info("[api/search] provider notes:", notes.join(" | "));
    }

    // --- 3. Out of scope: reply and stop -----------------------------------
    // No tables, no products, no cart. The refusal is a normal 200 response,
    // not an error - the app worked correctly, it just declined.
    if (!plan.inScope) {
      const refused: SearchResult = {
        query,
        source,
        inScope: false,
        reply: plan.refusal ?? plan.reply,
        tables: [],
        items: [],
        recipe: null,
        recipeChanged: null,
        products: [],
        unresolved: [],
      };
      return NextResponse.json(refused);
    }

    // --- 4. Resolve the shopping list --------------------------------------
    const { products, unresolved } = resolveItems(plan.items);

    // --- 5. Photos ---------------------------------------------------------
    // Deliberately not awaited inside the resolver: images are decoration, so
    // they get their own step that is allowed to find nothing.
    await attachImages(products);

    // --- 6. One object, ready to render ------------------------------------
    const result: SearchResult = {
      query,
      source,
      inScope: true,
      reply: plan.reply,
      tables: plan.tables,
      items: plan.items,
      recipe: plan.recipe,
      recipeChanged: plan.recipeChanged,
      products,
      unresolved,
    };

    return NextResponse.json(result);
  } catch (err) {
    // The failover ladder means this should be unreachable, but an unexpected
    // crash must still return tidy JSON rather than an HTML error page - the
    // browser is expecting JSON and would choke on anything else.
    console.error("[api/search] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong building your list. Please try again." },
      { status: 500 },
    );
  }
}
