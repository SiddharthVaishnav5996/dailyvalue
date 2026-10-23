import { GoogleGenAI } from "@google/genai";
import type { AIPlan } from "@/lib/types";
import { PLAN_SCHEMA_GEMINI, normalizePlan } from "@/lib/ai/schema";
import { PLAN_SYSTEM_PROMPT } from "@/lib/ai/planPrompt";

/*
 * Provider 1 of 2: Google Gemini, called through its official SDK.
 * ---------------------------------------------------------------------------
 * This is the primary provider, chosen for one reason: it can ENFORCE our
 * schema. We pass `responseSchema`, and Gemini constrains its own output so
 * the reply cannot be anything other than that shape. No fences, no preamble,
 * no trailing prose.
 *
 * An SDK ("software development kit") is just a wrapper someone wrote around
 * the same HTTP request you could write yourself. It saves you building the
 * URL, setting headers and parsing the response. Compare this file with
 * groq.ts, which does the request by hand, to see exactly what the wrapper is
 * hiding.
 */

/**
 * Default model. Override with GEMINI_MODEL in .env.local.
 *
 * Two deliberate choices here, both made after being burned:
 *
 * AN ALIAS, NOT A PINNED VERSION. Pinning is the textbook answer, because a
 * fixed version cannot change behaviour underneath a tuned prompt. But this
 * project was pinned twice and broke twice within a single afternoon: first
 * gemini-2.5-flash was retired and returned 404, then its replacement hit its
 * daily cap. An alias survives both. On a portfolio project that a stranger
 * might open at any moment, "still works" beats "perfectly reproducible".
 *
 * A LITE MODEL. Free-tier quota is counted per model per day, and the flagship
 * models are both stingier and far more congested. Measured on one key, on one
 * afternoon:
 *
 *   gemini-3.8-flash          503, high demand
 *   gemini-3.7-flash          429, daily limit of 20 requests
 *   gemini-3.6-flash          503, high demand
 *   gemini-flash-latest       503, high demand
 *   gemini-flash-lite-latest  answered every time
 *
 * A 20-request daily cap is unusable - that is one afternoon of testing. The
 * lite models are built for volume, so they have the headroom this needs.
 * Structure comes from the schema rather than from model size, so the quality
 * cost is small and the availability gain is large.
 *
 * To pin anyway, set GEMINI_MODEL to an exact name. `npm run check-keys` lists
 * what your key can currently see.
 */
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

/**
 * How long one attempt waits before giving up, in milliseconds.
 *
 * Without a timeout a stalled connection holds the shopper's page open
 * forever. This model answers a real shopping query in a few seconds, so 15
 * is generous, and short enough that failing over to Groq beats waiting.
 *
 * Note this is PER ATTEMPT, and there can be two. An overloaded model refuses
 * in a second or two rather than hanging, so the realistic worst case is well
 * under the arithmetic maximum.
 */
const TIMEOUT_MS = 15_000;

/** How long to pause before the single retry. */
const RETRY_DELAY_MS = 800;

/** Thrown when Gemini is unusable, so the caller knows to try the fallback. */
export class GeminiUnavailable extends Error {}

/**
 * Is this failure worth trying again, or is retrying pointless?
 *
 * The distinction matters more than it looks:
 *
 *   503 UNAVAILABLE  - the model is momentarily overloaded. Google's own
 *                      message says "spikes in demand are usually temporary".
 *                      Worth one more go.
 *   500              - a server-side hiccup. Also worth one more go.
 *   429              - you are out of quota. Retrying immediately just burns
 *                      another request and fails again.
 *   400 / 401 / 404  - your request or key or model name is wrong. Retrying
 *                      an identical broken request cannot help.
 *
 * On the free tier, 503 on a popular model is common enough that without this
 * retry the app spends most of its life on the fallback provider.
 */
function isTransient(message: string): boolean {
  return /"code":\s*50[03]|UNAVAILABLE|overloaded|high demand/i.test(message);
}

/** Pause, so a retry does not land in the same instant as the failure. */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ask Gemini for a shopping plan.
 *
 * Throws GeminiUnavailable if there is no key, the call fails, or the reply
 * is empty. It deliberately does NOT catch and hide those - the failover
 * ladder in plan.ts needs to know it failed so it can try Groq.
 */
export async function planWithGemini(userMessage: string): Promise<AIPlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiUnavailable("GEMINI_API_KEY is not set");

  try {
    return await attempt(userMessage, apiKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // One retry, and only for failures that could plausibly succeed next time.
    if (!isTransient(message)) throw err;

    console.warn("[ai] Gemini was busy, retrying once —", message.slice(0, 120));
    await wait(RETRY_DELAY_MS);
    return attempt(userMessage, apiKey);
  }
}

/** A single call to Gemini. Wrapped by planWithGemini, which adds the retry. */
async function attempt(userMessage: string, apiKey: string): Promise<AIPlan> {
  const ai = new GoogleGenAI({ apiKey });

  // AbortController is the browser and Node standard for cancelling an
  // in-flight request. We start a timer, and if it fires first we abort.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: userMessage,
      config: {
        // Standing instructions, kept separate from the shopper's words.
        systemInstruction: PLAN_SYSTEM_PROMPT,
        // These two lines are the whole point of using Gemini as primary.
        responseMimeType: "application/json",
        responseSchema: PLAN_SCHEMA_GEMINI,
        // Temperature 0 = no sampling randomness. The same question must produce
        // the same shopping list every time, or search results drift between runs.
        temperature: 0,
        abortSignal: controller.signal,
      },
    });

    const text = response.text;
    if (!text) throw new GeminiUnavailable("Gemini returned an empty response");

    // Even with enforcement, run it through the repair layer. Enforcement
    // guarantees the types, not that the values make sense.
    return normalizePlan(JSON.parse(text));
  } catch (err) {
    if (err instanceof GeminiUnavailable) throw err;
    throw new GeminiUnavailable(
      err instanceof Error ? err.message : "Gemini call failed",
    );
  } finally {
    // Always clear the timer, success or failure, or Node keeps the process
    // awake waiting for a timeout that no longer matters.
    clearTimeout(timer);
  }
}
