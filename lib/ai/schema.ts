import { Type } from "@google/genai";
import type { AIItem, AIPlan, AIRecipe, AITable, AITableRow } from "@/lib/types";
import { PRODUCT_BY_ID } from "@/lib/catalog/products";

/*
 * The shape we force the model to answer in.
 * ---------------------------------------------------------------------------
 * A language model's natural output is prose. Prose is useless to us: we need
 * to put rows in a table and products in a grid, so we need fields, not
 * sentences.
 *
 * There are two ways to get fields back, and they are not equally strong:
 *
 *   ASKING     - write "reply in JSON" in the prompt and hope. Works most of
 *                the time. The failures are the problem: a stray sentence
 *                before the JSON, a trailing comma, markdown fences around it.
 *
 *   ENFORCING  - hand the provider a schema. Gemini then constrains its own
 *                decoding so the output CANNOT be anything but that shape.
 *
 * Gemini can enforce. Groq (our fallback) can only be asked. So this file
 * exports the same contract twice - once in Gemini's format, once as plain
 * JSON Schema we paste into Groq's prompt - plus `normalizePlan`, which
 * assumes both of them lied and repairs whatever actually arrived.
 */

/* ---------------------------------------------------------------------------
 * 1. The schema, in Gemini's format
 * ------------------------------------------------------------------------ */

export const PLAN_SCHEMA_GEMINI = {
  type: Type.OBJECT,
  properties: {
    inScope: {
      type: Type.BOOLEAN,
      description:
        "True only if the request is about food, recipes, groceries, drinks, household supplies, or shopping for retail goods. False for everything else.",
    },
    refusal: {
      type: Type.STRING,
      nullable: true,
      description:
        "When inScope is false, one friendly sentence saying this assistant only helps with shopping. Null otherwise.",
    },
    reply: {
      type: Type.STRING,
      description:
        "The chat message shown to the shopper. Warm, brief, 1-3 sentences. Never repeat the table contents here.",
    },
    tables: {
      type: Type.ARRAY,
      description:
        "Zero or more tables. Empty when the answer is conversational and there is nothing to buy.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description:
              "Heading with one leading emoji, e.g. '🫐 Blueberry Cheesecake – Ingredients'.",
          },
          columns: {
            type: Type.ARRAY,
            description: "Two to four column labels. Never more than four.",
            items: { type: Type.STRING },
          },
          groupFirstColumn: {
            type: Type.BOOLEAN,
            description:
              "True when column 1 repeats as a group label, e.g. 'Biscuit Base'. False otherwise.",
          },
          rows: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: {
                  type: Type.STRING,
                  description: "Short unique id within this response, e.g. 'i1'.",
                },
                cells: {
                  type: Type.ARRAY,
                  description: "One string per column, same order as `columns`.",
                  items: { type: Type.STRING },
                },
              },
              required: ["id", "cells"],
            },
          },
        },
        required: ["title", "columns", "groupFirstColumn", "rows"],
      },
    },
    items: {
      type: Type.ARRAY,
      description:
        "The shopping list: one entry per thing to actually buy. Empty when there is nothing to buy.",
      items: {
        type: Type.OBJECT,
        properties: {
          rowIds: {
            type: Type.ARRAY,
            description:
              "Ids of the table rows this single purchase covers. One bag of sugar can cover three rows.",
            items: { type: Type.STRING },
          },
          name: { type: Type.STRING, description: "Plain name, e.g. 'Cream cheese'." },
          brandHint: {
            type: Type.STRING,
            nullable: true,
            description:
              "The brand ONLY when the shopper named one or the dish requires it " +
              "(Philadelphia, Oreo, Great Value). Null for anything generic - the app " +
              "then fills in each store's own brand, which is a better answer.",
          },
          category: {
            type: Type.STRING,
            description: "Display category, e.g. 'Dairy', 'Appliances', 'Bedding'.",
          },
          department: {
            type: Type.STRING,
            description:
              "Which kind of store aisle stocks this. Must be one of the DEPARTMENTS list given in the instructions.",
          },
          catalogId: {
            type: Type.STRING,
            nullable: true,
            description:
              "Id of the CATALOG product this item is, copied exactly from the catalog list in " +
              "the instructions. Null when the catalog has nothing that is this item.",
          },
          searchTerms: {
            type: Type.ARRAY,
            description: "Two to four lowercase aliases to help match a catalog product.",
            items: { type: Type.STRING },
          },
          quantity: {
            type: Type.INTEGER,
            description: "How many packs to buy. At least 1.",
          },
          packSize: {
            type: Type.STRING,
            nullable: true,
            description: "Pack size, e.g. '250 g', '12 ct', 'Queen'. Null if not meaningful.",
          },
          estimatedPrice: {
            type: Type.NUMBER,
            nullable: true,
            description:
              "Realistic Canadian retail price in CAD for one pack. Used only if we have no catalog match.",
          },
        },
        // estimatedPrice is required on purpose. When the model omitted it,
        // the resolver fell back to a nine-dollar default, which priced an
        // iPhone at $9 and then won the cheapest-offer ranking.
        required: [
          "rowIds",
          "name",
          "category",
          "department",
          "searchTerms",
          "quantity",
          "estimatedPrice",
        ],
      },
    },
    recipe: {
      type: Type.OBJECT,
      nullable: true,
      description:
        "The written method, when the shopper is cooking a specific dish or asks for a recipe. Null for restocks, drinks-only lists and retail goods.",
      properties: {
        title: {
          type: Type.STRING,
          description: "Dish name, no emoji, e.g. 'Creamy Alfredo Pasta'.",
        },
        servings: {
          type: Type.INTEGER,
          description: "How many people the quantities feed.",
        },
        prepTime: {
          type: Type.STRING,
          nullable: true,
          description: "Hands-on preparation time, e.g. '15 min'.",
        },
        cookTime: {
          type: Type.STRING,
          nullable: true,
          description: "Cooking or chilling time, e.g. '25 min' or '6 hours'.",
        },
        ingredients: {
          type: Type.ARRAY,
          description:
            "One line per ingredient, amount first, matching the table: '900 g fettuccine'.",
          items: { type: Type.STRING },
        },
        steps: {
          type: Type.ARRAY,
          description:
            "The method in order. One clear action per step, no step numbers in the text.",
          items: { type: Type.STRING },
        },
        tips: {
          type: Type.ARRAY,
          description: "Zero to three short tips: make-ahead, substitutions, storage.",
          items: { type: Type.STRING },
        },
      },
      required: ["title", "servings", "ingredients", "steps"],
    },
    // AFTER the recipe, on purpose. Placed before it, the model answered this
    // first and then returned recipe: null every single time - three runs out
    // of three. A field asking ABOUT the recipe has to come after the recipe
    // exists, because the model writes the JSON in order and cannot judge
    // something it has not written yet.
    recipeChanged: {
      type: Type.BOOLEAN,
      nullable: true,
      description:
        "Looking at the recipe you just wrote: did THIS message change the dish? " +
        "True for a new dish, different servings, a swapped or removed " +
        "ingredient, a different method. False when you reissued it unchanged " +
        "because the shopper asked about something else - wine, prices, shops. " +
        "Null when there is no recipe.",
    },
  },
  required: ["inScope", "reply", "tables", "items"],
};

/* ---------------------------------------------------------------------------
 * 2. The same contract as plain text, for providers that cannot enforce
 *
 * Groq has no schema enforcement we can rely on, so we show it the shape in
 * the prompt instead. Keeping this next to the real schema is deliberate: if
 * one changes and the other doesn't, they drift, and the fallback starts
 * returning a shape the app can't read.
 * ------------------------------------------------------------------------ */

export const PLAN_SHAPE_TEXT = `{
  "inScope": boolean,
  "refusal": string | null,
  "reply": string,
  "tables": [
    {
      "title": string,
      "columns": [string],
      "groupFirstColumn": boolean,
      "rows": [{ "id": string, "cells": [string] }]
    }
  ],
  "items": [
    {
      "rowIds": [string],
      "name": string,
      "brandHint": string | null,
      "category": string,
      "department": string,
      "catalogId": string | null,
      "searchTerms": [string],
      "quantity": number,
      "packSize": string | null,
      "estimatedPrice": number
    }
  ],
  "recipe": null | {
    "title": string,
    "servings": number,
    "prepTime": string | null,
    "cookTime": string | null,
    "ingredients": [string],
    "steps": [string],
    "tips": [string]
  },
  "recipeChanged": boolean | null
}`;

/* ---------------------------------------------------------------------------
 * 3. The repair layer
 *
 * Rule: never trust a model's output, even a schema-enforced one. Enforcement
 * guarantees the TYPES, not the SENSE - a schema cannot stop the model handing
 * back an empty title, a row with the wrong number of cells, or a quantity of
 * zero. Everything below turns "whatever arrived" into something the UI can
 * render without checking anything itself.
 * ------------------------------------------------------------------------ */

/** Read a value as trimmed text, whatever it actually was. */
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Read a value as a finite number, or null. */
function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Read a value as an array, treating anything else as empty. */
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Cap a list so one bad response cannot render ten thousand rows. */
const LIMITS = { tables: 4, rows: 40, columns: 4, items: 40, terms: 6 };

function normalizeRow(raw: unknown, index: number, columnCount: number): AITableRow | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const cells = arr(r.cells).map(str);
  // A row with nothing in it is noise, not data.
  if (cells.every((c) => c === "")) return null;
  return {
    id: str(r.id) || `r${index + 1}`,
    // Pad or trim to the table's column count so the CSS grid never breaks.
    cells: Array.from({ length: columnCount }, (_, i) => cells[i] ?? ""),
  };
}

function normalizeTable(raw: unknown, index: number): AITable | null {
  const t = (raw ?? {}) as Record<string, unknown>;
  const columns = arr(t.columns).map(str).filter(Boolean).slice(0, LIMITS.columns);
  if (columns.length < 2) return null;

  const rows = arr(t.rows)
    .slice(0, LIMITS.rows)
    .map((row, i) => normalizeRow(row, i, columns.length))
    .filter((row): row is AITableRow => row !== null);

  if (rows.length === 0) return null;

  return {
    title: str(t.title) || `Shopping list ${index + 1}`,
    columns,
    groupFirstColumn: t.groupFirstColumn === true,
    rows,
  };
}

function normalizeItem(raw: unknown): AIItem | null {
  const i = (raw ?? {}) as Record<string, unknown>;
  const name = str(i.name);
  if (!name) return null;

  const terms = arr(i.searchTerms)
    .map((t) => str(t).toLowerCase())
    .filter(Boolean)
    .slice(0, LIMITS.terms);

  const quantity = num(i.quantity);
  const price = num(i.estimatedPrice);

  return {
    rowIds: arr(i.rowIds).map(str).filter(Boolean),
    name,
    brandHint: str(i.brandHint) || null,
    category: str(i.category) || "General",
    department: str(i.department).toLowerCase() || "grocery",
    // A made-up or misspelt id is worse than none: drop it so the resolver
    // falls back to matching on the name.
    catalogId: PRODUCT_BY_ID[str(i.catalogId)] ? str(i.catalogId) : null,
    // Always leave at least the item's own name to search on.
    searchTerms: terms.length ? terms : [name.toLowerCase()],
    // Round to a whole number, floor at 1, ceiling at 99.
    quantity: quantity ? Math.min(99, Math.max(1, Math.round(quantity))) : 1,
    packSize: str(i.packSize) || null,
    estimatedPrice: price && price > 0 ? Math.round(price * 100) / 100 : null,
  };
}

/**
 * Strip a leading "1." or "Step 2:" the model added despite being told not to.
 * The card and the PDF number the steps themselves, and "1. 1. Boil water"
 * looks broken.
 */
const stripStepNumber = (text: string) =>
  text.replace(/^\s*(step\s*)?\d+\s*[.):-]\s*/i, "").trim();

/** Clean a list of short strings: trimmed, non-empty, capped. */
const cleanList = (v: unknown, max: number) =>
  arr(v).map(str).filter(Boolean).slice(0, max);

/**
 * Validate a recipe, or return null if there is not really one.
 *
 * A recipe with no steps is not a recipe - it is a shopping list, which the
 * tables already show - so it is dropped rather than rendered as an empty card.
 */
export function normalizeRecipe(raw: unknown): AIRecipe | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const steps = cleanList(r.steps, 30).map(stripStepNumber).filter(Boolean);
  if (steps.length === 0) return null;

  const servings = num(r.servings);

  return {
    // Emoji cannot be printed by the PDF's built-in fonts, so none here.
    title: str(r.title).replace(/\p{Extended_Pictographic}/gu, "").trim() || "Recipe",
    servings: servings ? Math.min(100, Math.max(1, Math.round(servings))) : 4,
    prepTime: str(r.prepTime) || null,
    cookTime: str(r.cookTime) || null,
    ingredients: cleanList(r.ingredients, 40),
    steps,
    tips: cleanList(r.tips, 5),
  };
}

/**
 * Turn arbitrary parsed JSON into a fully-formed AIPlan.
 *
 * This never throws. Whatever comes in, something renderable comes out - which
 * means the UI can be written without a single defensive check.
 */
export function normalizePlan(raw: unknown): AIPlan {
  const p = (raw ?? {}) as Record<string, unknown>;

  const inScope = p.inScope !== false; // default to allowing, refuse explicitly
  const refusal = str(p.refusal) || null;
  const reply = str(p.reply);

  // An out-of-scope answer must carry no tables and no items, whatever the
  // model returned. This is the guardrail's last line of defence: even if the
  // model contradicts itself, nothing unshoppable reaches the cart.
  if (!inScope) {
    return {
      inScope: false,
      refusal:
        refusal ||
        "I can only help with food, groceries and shopping. Try asking me what to cook, or what to restock.",
      reply:
        reply ||
        refusal ||
        "I can only help with food, groceries and shopping. Try asking me what to cook, or what to restock.",
      tables: [],
      items: [],
      recipe: null,
      recipeChanged: null,
    };
  }

  const tables = arr(p.tables)
    .slice(0, LIMITS.tables)
    .map((t, i) => normalizeTable(t, i))
    .filter((t): t is AITable => t !== null);

  const items = arr(p.items)
    .slice(0, LIMITS.items)
    .map((it) => normalizeItem(it))
    .filter((it): it is AIItem => it !== null);

  return {
    inScope: true,
    refusal: null,
    reply: reply || "Here is what I found for you.",
    tables,
    items,
    recipe: normalizeRecipe(p.recipe),
    // Three-valued on purpose. A missing field means "the model did not say",
    // which is NOT the same as "nothing changed" - the caller treats the two
    // differently. See shouldShowRecipe in lib/search/SearchContext.tsx.
    recipeChanged: typeof p.recipeChanged === "boolean" ? p.recipeChanged : null,
  };
}

/**
 * Parse a model's raw text into a plan.
 *
 * Models sometimes wrap JSON in markdown fences even when told not to, so we
 * strip those first, then find the outermost braces. Only after that do we
 * hand it to JSON.parse.
 */
export function parsePlanText(text: string): AIPlan {
  let cleaned = text.trim();

  // Remove ```json … ``` fences if present.
  const fence = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) cleaned = fence[1].trim();

  // Fall back to the outermost { … } if there is stray prose around it.
  if (!cleaned.startsWith("{")) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) cleaned = cleaned.slice(start, end + 1);
  }

  return normalizePlan(JSON.parse(cleaned));
}
