import type { AIItem, AIPlan, AIRecipe, AITable } from "@/lib/types";
import { PRODUCTS } from "@/lib/catalog/products";

/*
 * The bottom rung of the failover ladder: a shopping engine with no AI in it.
 * ---------------------------------------------------------------------------
 * This runs when there is no API key configured, or when both providers are
 * unreachable. It is deliberately simple - keyword matching against the
 * existing catalog - because its only job is to keep the app usable.
 *
 * Be honest about what this is: the scope check here is a word list, and a
 * word list is genuinely worse than a model at judging intent. It will let
 * some odd things through and block some fine ones. That is the cost of
 * having no network, and it is the right trade for a fallback that must never
 * fail. The real guardrail lives in the system prompt (lib/ai/planPrompt.ts).
 */

/** Topics we can confidently reject without a model. */
const OUT_OF_SCOPE = [
  "weather", "forecast", "temperature outside", "rain today",
  "news", "headline", "election", "stock price", "share price",
  "football", "cricket", "soccer", "nba", "match score",
  "translate", "javascript", "python", "typescript", "write code", "debug",
  "essay", "homework", "solve for x", "calculus",
  "flight", "hotel", "visa", "passport",
  "diagnose", "symptom", "prescription", "lawyer", "legal advice",
];

const REFUSAL =
  "I can only help with food, groceries and shopping. Try asking me what to cook, or what to restock.";

/** Words that carry no shopping meaning, stripped before matching. */
const STOP_WORDS = new Set([
  "i", "me", "my", "a", "an", "the", "to", "for", "of", "and", "or", "with",
  "want", "need", "make", "help", "prepare", "some", "please", "get", "buy",
  "is", "are", "am", "it", "you", "can", "would", "like", "give", "show",
]);

/** The cheesecake list, kept because it is the app's signature demo. */
const CHEESECAKE_TABLE: AITable = {
  title: "🫐 Blueberry Cheesecake – Ingredients",
  columns: ["CATEGORY", "ITEM", "QUANTITY"],
  groupFirstColumn: true,
  rows: [
    { id: "i1", cells: ["Biscuit Base", "Graham crackers", "200g"] },
    { id: "i2", cells: ["Biscuit Base", "Unsalted butter (melted)", "100g"] },
    { id: "i3", cells: ["Cheesecake Filling", "Cream cheese", "500g"] },
    { id: "i4", cells: ["Cheesecake Filling", "Granulated sugar", "1 cup (200g)"] },
    { id: "i5", cells: ["Cheesecake Filling", "Heavy cream", "1 cup (240ml)"] },
    { id: "i6", cells: ["Cheesecake Filling", "Eggs", "2 large"] },
    { id: "i7", cells: ["Cheesecake Filling", "Vanilla extract", "1 tsp"] },
    { id: "i8", cells: ["Cheesecake Filling", "Lemon juice", "1 tbsp"] },
    { id: "i9", cells: ["Blueberry Topping", "Blueberries", "1½ cups"] },
    { id: "i10", cells: ["Blueberry Topping", "Sugar", "¼ cup"] },
  ],
};

/**
 * The method for the cheesecake above, so the offline engine can show and
 * print a recipe too. Written to match the table row for row.
 */
const CHEESECAKE_RECIPE: AIRecipe = {
  title: "Blueberry Cheesecake",
  servings: 12,
  prepTime: "30 min",
  cookTime: "55 min, plus 6 hours chilling",
  ingredients: [
    "200 g graham crackers, crushed",
    "100 g unsalted butter, melted",
    "500 g cream cheese, softened",
    "1 cup (200 g) granulated sugar",
    "1 cup (240 ml) heavy cream",
    "2 large eggs",
    "1 tsp vanilla extract",
    "1 tbsp lemon juice",
    "1½ cups blueberries",
    "¼ cup sugar, for the topping",
  ],
  steps: [
    "Heat the oven to 160 C (325 F) and line the base of a 9-inch springform pan.",
    "Mix the crushed graham crackers with the melted butter, press firmly into the pan, and bake for 10 minutes. Let it cool.",
    "Beat the cream cheese and sugar until completely smooth, scraping the bowl so no lumps remain.",
    "Beat in the eggs one at a time on low speed, then the heavy cream, vanilla and lemon juice. Stop as soon as it is combined.",
    "Pour the filling over the base and bake for 50 to 55 minutes, until the edges are set and the centre still wobbles slightly.",
    "Turn the oven off, prop the door open, and let the cheesecake cool inside for an hour to stop it cracking.",
    "Simmer the blueberries with the ¼ cup of sugar for 5 minutes, until they burst and thicken. Cool completely.",
    "Spread the topping over the cheesecake and chill for at least 6 hours, ideally overnight, before slicing.",
  ],
  tips: [
    "Take the cream cheese out an hour early. Cold cream cheese is the usual cause of a lumpy filling.",
    "It keeps covered in the fridge for up to 4 days.",
  ],
};

const CHEESECAKE_ITEMS: AIItem[] = [
  { rowIds: ["i1"], name: "Graham crackers", brandHint: null, category: "Bakery", department: "bakery", searchTerms: ["graham crackers", "digestive biscuits"], quantity: 1, packSize: "200 g", estimatedPrice: 3.49 },
  { rowIds: ["i2"], name: "Unsalted butter", brandHint: null, category: "Dairy", department: "dairy", searchTerms: ["butter", "unsalted butter"], quantity: 1, packSize: "454 g", estimatedPrice: 5.99 },
  { rowIds: ["i3"], name: "Cream cheese", brandHint: "Philadelphia", category: "Dairy", department: "dairy", searchTerms: ["cream cheese", "philadelphia"], quantity: 2, packSize: "250 g", estimatedPrice: 4.49 },
  { rowIds: ["i4", "i10"], name: "Granulated sugar", brandHint: null, category: "Pantry", department: "pantry", searchTerms: ["sugar", "granulated sugar"], quantity: 1, packSize: "2 kg", estimatedPrice: 3.79 },
  { rowIds: ["i5"], name: "Heavy cream", brandHint: null, category: "Dairy", department: "dairy", searchTerms: ["heavy cream", "whipping cream"], quantity: 1, packSize: "473 mL", estimatedPrice: 4.79 },
  { rowIds: ["i6"], name: "Large eggs", brandHint: null, category: "Dairy", department: "dairy", searchTerms: ["eggs", "large eggs"], quantity: 1, packSize: "12 ct", estimatedPrice: 3.99 },
  { rowIds: ["i7"], name: "Vanilla extract", brandHint: null, category: "Pantry", department: "pantry", searchTerms: ["vanilla", "vanilla extract"], quantity: 1, packSize: "43 mL", estimatedPrice: 5.49 },
  { rowIds: ["i8"], name: "Lemon", brandHint: null, category: "Produce", department: "produce", searchTerms: ["lemon", "lemon juice"], quantity: 2, packSize: "1 ct", estimatedPrice: 0.79 },
  { rowIds: ["i9"], name: "Blueberries", brandHint: null, category: "Produce", department: "produce", searchTerms: ["blueberries", "blueberry"], quantity: 2, packSize: "170 g", estimatedPrice: 3.99 },
];

/** Split a query into meaningful lowercase words. */
function keywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Words that name a whole shelf rather than one product. "Vegetables" matches
 * no product name, but a shopper saying it clearly wants the produce aisle.
 */
const CATEGORY_WORDS: Record<string, string> = {
  vegetable: "Produce", vegetables: "Produce", veg: "Produce",
  veggies: "Produce", produce: "Produce", fruit: "Produce", fruits: "Produce",
  salad: "Produce", greens: "Produce",
  dairy: "Dairy", milk: "Dairy", cheese: "Dairy",
  bread: "Bakery", bakery: "Bakery", baking: "Pantry",
  meat: "Meat", protein: "Meat", chicken: "Meat", fish: "Meat",
  pantry: "Pantry", staples: "Pantry", spices: "Pantry",
  drink: "Beverages", drinks: "Beverages", beverage: "Beverages",
  beverages: "Beverages", juice: "Beverages", wine: "Beverages",
  groceries: "ALL", grocery: "ALL", everything: "ALL", restock: "ALL",
  refill: "ALL", empty: "ALL", weekly: "ALL", shop: "ALL",
};

/**
 * Build a table from whatever catalog products the query mentions.
 * Crude by design - this is the no-network path.
 */
function catalogPlan(query: string): AIPlan {
  const words = keywords(query);

  // Which whole categories did they ask for?
  const wanted = new Set<string>();
  for (const w of words) {
    const category = CATEGORY_WORDS[w];
    if (category) wanted.add(category);
  }
  const wantsEverything = wanted.has("ALL");

  const hits = PRODUCTS.filter((p) => {
    // Named a product directly.
    const namedDirectly = [p.name, ...p.searchTerms].some((term) =>
      words.some((w) => term.toLowerCase().includes(w)),
    );
    if (namedDirectly) return true;

    // Named the shelf it sits on.
    if (wantsEverything) return true;
    return wanted.has(p.category);
  }).slice(0, 12);

  if (hits.length === 0) {
    return {
      inScope: true,
      refusal: null,
      reply:
        "I could not reach the AI service just now, so I am running on the built-in list. Try naming a dish or a few specific groceries.",
      tables: [],
      items: [],
      recipe: null,
    };
  }

  const rows = hits.map((p, i) => ({
    id: `d${i + 1}`,
    cells: [p.category, p.name, p.size],
  }));

  const table: AITable = {
    title: "🛒 Your shopping list",
    columns: ["CATEGORY", "ITEM", "SIZE"],
    groupFirstColumn: true,
    rows,
  };

  const items: AIItem[] = hits.map((p, i) => ({
    rowIds: [`d${i + 1}`],
    name: p.name,
    brandHint: p.brand || null,
    category: p.category,
    department: p.category.toLowerCase(),
    searchTerms: p.searchTerms,
    quantity: 1,
    packSize: p.size,
    estimatedPrice: null, // the catalog already has real prices for these
  }));

  return {
    inScope: true,
    refusal: null,
    reply: `I found ${hits.length} matching ${hits.length === 1 ? "item" : "items"} in the catalog and added them below.`,
    tables: [table],
    items,
    recipe: null,
  };
}

/**
 * Phrases that mean "change what you already gave me".
 *
 * Revising an existing list is genuinely beyond keyword matching - it needs to
 * know what the list currently says and why. Asked "I don't like graham
 * crackers", the naive matcher latched onto "crackers" and returned graham
 * crackers, which is the opposite of what was wanted.
 *
 * So the fallback declines these instead of answering badly. Combined with the
 * guard in SearchContext, the shopper keeps the list they already had.
 */
const EDIT_PHRASES = [
  "don't like", "dont like", "do not like", "instead", "replace",
  "swap", "not a fan", "hate", "allergic", "without the", "remove the",
  "change the", "something else", "alternative", "substitute",
];

/** Produce a plan with no network call at all. Never throws. */
export function demoPlan(query: string): AIPlan {
  const q = query.toLowerCase();

  if (OUT_OF_SCOPE.some((topic) => q.includes(topic))) {
    return {
      inScope: false,
      refusal: REFUSAL,
      reply: REFUSAL,
      tables: [],
      items: [],
      recipe: null,
    };
  }

  // A revision request the fallback cannot honestly satisfy. Say so, and
  // return no tables so the shopper's current list is left alone.
  if (EDIT_PHRASES.some((phrase) => q.includes(phrase))) {
    return {
      inScope: true,
      refusal: null,
      reply:
        "I cannot revise a list while the AI service is unavailable, so I have left yours as it is. Add a Gemini API key and I will be able to swap items for you.",
      tables: [],
      items: [],
      recipe: null,
    };
  }

  if (q.includes("cheesecake")) {
    return {
      inScope: true,
      refusal: null,
      reply:
        "Here is a classic blueberry cheesecake. Tell me if you would prefer a no-bake version or a different biscuit base.",
      tables: [CHEESECAKE_TABLE],
      items: CHEESECAKE_ITEMS,
      recipe: CHEESECAKE_RECIPE,
    };
  }

  return catalogPlan(query);
}
