import type { AIPlan } from "@/lib/types";
import { planWithGemini } from "@/lib/ai/providers/gemini";
import { planWithGroq } from "@/lib/ai/providers/groq";
import { buildUserMessage } from "@/lib/ai/planPrompt";
import { demoPlan } from "@/lib/ai/demo";

/*
 * The failover ladder.
 * ---------------------------------------------------------------------------
 * One question, up to three attempts, in this order:
 *
 *   1. Gemini   - the primary. Enforces our schema, so its answers are the
 *                 most reliable.
 *   2. Groq     - a different company, different hardware, different model.
 *                 If Google is having a bad day, Groq almost certainly is not.
 *   3. Demo     - no network at all. A small built-in engine so the app still
 *                 does something sensible with no keys configured.
 *
 * The important design choice: all three return the SAME AIPlan type. Nothing
 * downstream - not the route, not the resolver, not a single React component -
 * knows or cares which one answered. `source` is carried along purely so we
 * can show it in development and debug it.
 *
 * Why bother with a fallback at all on a portfolio project? Because free tiers
 * run out. Gemini allows roughly 1,500 requests a day. A demo that returns an
 * error page the moment a recruiter is the 1,501st visitor is a worse demo
 * than one that quietly switches providers.
 */

export type PlanSource = "gemini" | "groq" | "demo";

export interface PlanResult {
  plan: AIPlan;
  source: PlanSource;
  /** Why each provider was skipped or failed. Useful in the server log. */
  notes: string[];
}

export interface ChatTurn {
  role: "user" | "ai";
  text: string;
}

/**
 * Produce a shopping plan for a query, trying each provider in turn.
 *
 * This never throws. The demo engine at the bottom of the ladder always
 * succeeds, so callers get a plan no matter what.
 */
export async function getPlan(
  query: string,
  history: ChatTurn[] = [],
): Promise<PlanResult> {
  // Both providers get the identical message, built once. If history handling
  // differed between them, the fallback would answer differently from the
  // primary, and that difference would only show up when something was
  // already going wrong.
  const userMessage = buildUserMessage(query, history);
  const notes: string[] = [];

  // --- Rung 1: Gemini ------------------------------------------------------
  try {
    const plan = await planWithGemini(userMessage);
    return { plan, source: "gemini", notes };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    notes.push(`gemini: ${reason}`);
    console.warn("[ai] Gemini unavailable, trying Groq —", reason);
  }

  // --- Rung 2: Groq --------------------------------------------------------
  try {
    const plan = await planWithGroq(userMessage);
    return { plan, source: "groq", notes };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    notes.push(`groq: ${reason}`);
    console.warn("[ai] Groq unavailable, falling back to demo —", reason);
  }

  // --- Rung 3: the built-in engine ----------------------------------------
  // No network, no key, no failure mode. Always returns something.
  return { plan: demoPlan(query), source: "demo", notes };
}
