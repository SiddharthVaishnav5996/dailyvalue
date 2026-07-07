import { GoogleGenAI, Type } from "@google/genai";
import type { Recipe } from "@/lib/types";
import { SYSTEM_PROMPT, demoRecipe } from "@/lib/ai/prompts";

/**
 * Provider-agnostic recipe generation.
 *
 * Uses Google Gemini (free tier) with structured JSON output when a key is
 * configured, and falls back to the built-in demo engine otherwise — so the
 * app always works. Swapping to Claude / Groq later means changing only this
 * file's `callModel` implementation; the rest of the app is untouched.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

/** Gemini structured-output schema mirroring the `Recipe` type. */
const RECIPE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    servings: { type: Type.INTEGER },
    time: { type: Type.STRING },
    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.NUMBER, nullable: true },
          unit: { type: Type.STRING, nullable: true },
          searchTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["name", "searchTerms"],
      },
    },
  },
  required: ["title", "servings", "time", "steps", "ingredients"],
};

export interface RecipeGeneration {
  recipe: Recipe;
  source: "ai" | "demo";
}

/** Coerce arbitrary model JSON into a safe, fully-formed Recipe. */
function normalizeRecipe(raw: unknown): Recipe {
  const r = (raw ?? {}) as Record<string, unknown>;
  const rawIngredients = Array.isArray(r.ingredients) ? r.ingredients : [];

  const ingredients = rawIngredients
    .map((entry) => {
      const i = (entry ?? {}) as Record<string, unknown>;
      const name = String(i.name ?? "").trim();
      const terms = Array.isArray(i.searchTerms)
        ? i.searchTerms.map((t) => String(t).toLowerCase()).filter(Boolean)
        : [];
      return {
        name,
        quantity: typeof i.quantity === "number" ? i.quantity : null,
        unit: i.unit != null && i.unit !== "" ? String(i.unit) : null,
        searchTerms: terms.length ? terms : [name.toLowerCase()],
      };
    })
    .filter((i) => i.name.length > 0);

  return {
    title: String(r.title ?? "Recipe").trim(),
    servings: Number(r.servings) > 0 ? Math.round(Number(r.servings)) : 4,
    time: String(r.time ?? "").trim(),
    steps: Array.isArray(r.steps) ? r.steps.map((s) => String(s)).filter(Boolean) : [],
    ingredients,
  };
}

async function callGemini(query: string, apiKey: string): Promise<Recipe> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: query,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: RECIPE_SCHEMA,
      temperature: 0.5,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");

  const recipe = normalizeRecipe(JSON.parse(text));
  if (recipe.ingredients.length === 0) {
    throw new Error("Model returned no usable ingredients");
  }
  return recipe;
}

/** Generate a recipe for a free-text query (dish name or video transcript). */
export async function getRecipe(query: string): Promise<RecipeGeneration> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { recipe: demoRecipe(query), source: "demo" };
  }
  try {
    const recipe = await callGemini(query, apiKey);
    return { recipe, source: "ai" };
  } catch (err) {
    console.error("[ai] Gemini call failed, falling back to demo engine:", err);
    return { recipe: demoRecipe(query), source: "demo" };
  }
}
