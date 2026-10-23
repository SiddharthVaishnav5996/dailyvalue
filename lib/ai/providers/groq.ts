import type { AIPlan } from "@/lib/types";
import { parsePlanText } from "@/lib/ai/schema";
import { PLAN_SYSTEM_PROMPT } from "@/lib/ai/planPrompt";

/*
 * Provider 2 of 2: Groq, called with a plain fetch.
 * ---------------------------------------------------------------------------
 * No SDK here, on purpose. This file is the same job as gemini.ts written by
 * hand, so you can see what an API call really is: a URL, a method, two
 * headers, and a JSON body. Everything an SDK does is this.
 *
 * Groq runs open models (Llama) on custom hardware, which makes it very fast
 * and a genuinely different point of failure from Google. If Gemini is down
 * or out of quota, Groq almost certainly is not.
 *
 * The trade-off: Groq cannot hard-enforce our schema the way Gemini can. The
 * best it offers is "JSON mode", which guarantees valid JSON but not OUR JSON.
 * So we describe the shape in the prompt and lean harder on the repair layer.
 */

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Default model. Override with GROQ_MODEL in .env.local.
 *
 * Groq's catalogue moves fast. This project was first written against
 * llama-3.3-70b-versatile, and by the time the keys were added Groq had
 * dropped Llama chat models altogether. To see what is actually on offer
 * today, list them - the key check script does exactly this:
 *
 *   GET https://api.groq.com/openai/v1/models
 *
 * gpt-oss-120b is the largest instruction-following model currently there,
 * which is what matters for a fallback that has to return our JSON shape
 * without schema enforcement to lean on.
 */
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const TIMEOUT_MS = 15_000;

/** Thrown when Groq is unusable, so the caller can fall through to the demo. */
export class GroqUnavailable extends Error {}

/**
 * Ask Groq for a shopping plan.
 *
 * Same signature as planWithGemini on purpose. Because both return the same
 * AIPlan, the rest of the app never learns which one answered - swapping them
 * is a one-line change in plan.ts.
 */
export async function planWithGroq(userMessage: string): Promise<AIPlan> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new GroqUnavailable("GROQ_API_KEY is not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        // Tells Groq who is calling and whose quota to spend. "Bearer" is the
        // standard prefix for this kind of token - the header value is
        // literally the word Bearer, a space, then the key.
        Authorization: `Bearer ${apiKey}`,
        // Tells Groq our body is JSON. Without it the body is read as plain text.
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        // The conversation, as a list of turns. "system" is our standing
        // instructions; "user" is the shopper. Same separation as Gemini's
        // systemInstruction, expressed differently.
        messages: [
          { role: "system", content: PLAN_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        // JSON mode: guarantees the reply parses as JSON. It does NOT
        // guarantee our field names - that is what parsePlanText is for.
        response_format: { type: "json_object" },
        // 0 so a repeated question gets a repeated answer - see gemini.ts.
        temperature: 0,
        // Room to finish.
        //
        // A recipe with a wine pairing is two tables and a dozen items, which
        // is a lot of JSON. Run out of tokens halfway and the reply is cut off
        // mid-object, so Groq rejects its own output with
        // `json_validate_failed` and an EMPTY failed_generation - which reads
        // like the model produced nothing at all, when really it produced too
        // much. This was the actual cause of a fallback that "just broke" on
        // longer queries.
        max_completion_tokens: 8000,
      }),
      signal: controller.signal,
    });

    // fetch does not throw on 4xx or 5xx. It resolves happily with a failed
    // status, so you have to check `ok` yourself. This trips up nearly
    // everyone once.
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new GroqUnavailable(
        `Groq returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      );
    }

    const data = await response.json();

    // Groq follows the OpenAI response shape: a list of `choices`, each with a
    // `message`. We asked for one, so we read the first.
    const text: unknown = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      throw new GroqUnavailable("Groq returned an empty message");
    }

    // parsePlanText strips stray fences and prose before parsing, because
    // without schema enforcement those do sometimes appear.
    return parsePlanText(text);
  } catch (err) {
    if (err instanceof GroqUnavailable) throw err;
    throw new GroqUnavailable(
      err instanceof Error ? err.message : "Groq call failed",
    );
  } finally {
    clearTimeout(timer);
  }
}
