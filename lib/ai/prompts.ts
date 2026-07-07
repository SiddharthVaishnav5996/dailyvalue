import type { Recipe } from "@/lib/types";

/**
 * Instruction given to Gemini. We ask for a normalized ingredient list with
 * `searchTerms` so the downstream catalog matcher has clean hints to work with.
 */
export const SYSTEM_PROMPT = `You are the recipe engine for DailyValue, a grocery shopping assistant.

Given a dish name, a free-text request, or the transcript of a cooking video, respond with a single recipe as JSON that matches the provided schema. Rules:
- Keep the ingredient list to real grocery items a shopper would buy (merge duplicates).
- For each ingredient, set "name" to a short shopping name (e.g. "cream cheese", not "1 block of softened cream cheese").
- Put the numeric amount in "quantity" and the unit in "unit" when known; use null when not applicable (e.g. "salt to taste").
- "searchTerms" must be 1-4 lowercase aliases a store search would understand (e.g. ["heavy cream","whipping cream"]). Always include the plain ingredient name.
- "steps" should be concise, numbered-style cooking steps (5-10 items).
- "time" is a short human estimate like "45 min".
Return ONLY the JSON object, no prose.`;

/* ---------------------------------------------------------------------------
 * Built-in demo engine
 * ---------------------------------------------------------------------------
 * Runs when no GEMINI_API_KEY is configured (or the API call fails), so the
 * whole app — recipe → matching → price comparison → cart — is fully usable
 * out of the box. Real Gemini output replaces this when a key is present.
 */

interface DemoRecipe {
  keywords: string[];
  recipe: Recipe;
}

const DEMO_RECIPES: DemoRecipe[] = [
  {
    keywords: ["cheesecake", "blueberry cheesecake"],
    recipe: {
      title: "Blueberry Cheesecake",
      servings: 8,
      time: "1 hr + chill",
      steps: [
        "Crush the graham crackers and mix with melted butter; press into a springform pan.",
        "Beat the cream cheese with sugar until smooth.",
        "Mix in the eggs one at a time, then the sour cream, vanilla and a squeeze of lemon.",
        "Pour over the crust and bake at 325°F (160°C) for about 50 minutes until just set.",
        "Cool, then chill for at least 4 hours.",
        "Top with fresh blueberries before serving.",
      ],
      ingredients: [
        { name: "cream cheese", quantity: 600, unit: "g", searchTerms: ["cream cheese"] },
        { name: "graham crackers", quantity: 200, unit: "g", searchTerms: ["graham crackers", "graham cracker crumbs"] },
        { name: "butter", quantity: 90, unit: "g", searchTerms: ["butter"] },
        { name: "granulated sugar", quantity: 150, unit: "g", searchTerms: ["sugar", "granulated sugar"] },
        { name: "eggs", quantity: 3, unit: null, searchTerms: ["eggs", "large eggs"] },
        { name: "sour cream", quantity: 120, unit: "ml", searchTerms: ["sour cream"] },
        { name: "vanilla extract", quantity: 1, unit: "tsp", searchTerms: ["vanilla", "vanilla extract"] },
        { name: "lemon", quantity: 1, unit: null, searchTerms: ["lemon", "lemon juice"] },
        { name: "blueberries", quantity: 200, unit: "g", searchTerms: ["blueberries", "fresh blueberries"] },
      ],
    },
  },
  {
    keywords: ["spaghetti", "bolognese", "pasta"],
    recipe: {
      title: "Spaghetti Bolognese",
      servings: 4,
      time: "40 min",
      steps: [
        "Cook the spaghetti in salted boiling water until al dente.",
        "Soften the chopped onion and garlic in olive oil.",
        "Add the ground beef and brown it well.",
        "Stir in the tomato sauce and simmer for 15 minutes; season with salt and pepper.",
        "Toss the drained pasta through the sauce and serve.",
      ],
      ingredients: [
        { name: "spaghetti", quantity: 400, unit: "g", searchTerms: ["spaghetti", "pasta"] },
        { name: "ground beef", quantity: 450, unit: "g", searchTerms: ["ground beef", "beef"] },
        { name: "tomato sauce", quantity: 680, unit: "ml", searchTerms: ["tomato sauce", "pasta sauce"] },
        { name: "onion", quantity: 1, unit: null, searchTerms: ["onion"] },
        { name: "garlic", quantity: 2, unit: "cloves", searchTerms: ["garlic"] },
        { name: "olive oil", quantity: 2, unit: "tbsp", searchTerms: ["olive oil"] },
        { name: "salt", quantity: null, unit: null, searchTerms: ["salt"] },
        { name: "black pepper", quantity: null, unit: null, searchTerms: ["black pepper", "pepper"] },
      ],
    },
  },
  {
    keywords: ["smoothie", "berry smoothie"],
    recipe: {
      title: "Berry Smoothie",
      servings: 2,
      time: "5 min",
      steps: [
        "Add the banana, strawberries and blueberries to a blender.",
        "Spoon in the Greek yogurt and a drizzle of honey.",
        "Pour in the milk and blend until smooth.",
      ],
      ingredients: [
        { name: "banana", quantity: 1, unit: null, searchTerms: ["banana"] },
        { name: "strawberries", quantity: 150, unit: "g", searchTerms: ["strawberries"] },
        { name: "blueberries", quantity: 100, unit: "g", searchTerms: ["blueberries"] },
        { name: "greek yogurt", quantity: 200, unit: "g", searchTerms: ["greek yogurt", "yogurt"] },
        { name: "honey", quantity: 1, unit: "tbsp", searchTerms: ["honey"] },
        { name: "milk", quantity: 250, unit: "ml", searchTerms: ["milk"] },
      ],
    },
  },
  {
    keywords: ["guacamole", "guac"],
    recipe: {
      title: "Fresh Guacamole",
      servings: 4,
      time: "10 min",
      steps: [
        "Mash the avocados in a bowl.",
        "Stir in finely chopped onion, tomato and garlic.",
        "Add a good squeeze of lemon and season with salt.",
        "Serve immediately.",
      ],
      ingredients: [
        { name: "avocado", quantity: 3, unit: null, searchTerms: ["avocado", "avocados"] },
        { name: "onion", quantity: 1, unit: null, searchTerms: ["onion"] },
        { name: "tomato", quantity: 1, unit: null, searchTerms: ["tomato"] },
        { name: "garlic", quantity: 1, unit: "clove", searchTerms: ["garlic"] },
        { name: "lemon", quantity: 1, unit: null, searchTerms: ["lemon", "lemon juice"] },
        { name: "salt", quantity: null, unit: null, searchTerms: ["salt"] },
      ],
    },
  },
  {
    keywords: ["pancake", "pancakes"],
    recipe: {
      title: "Fluffy Pancakes",
      servings: 4,
      time: "20 min",
      steps: [
        "Whisk the flour, sugar and baking powder together.",
        "Beat in the eggs and milk until you have a smooth batter.",
        "Stir through a little melted butter.",
        "Cook spoonfuls on a hot buttered pan until bubbles form, then flip.",
        "Serve warm with honey.",
      ],
      ingredients: [
        { name: "all-purpose flour", quantity: 250, unit: "g", searchTerms: ["flour", "all-purpose flour"] },
        { name: "granulated sugar", quantity: 2, unit: "tbsp", searchTerms: ["sugar"] },
        { name: "baking powder", quantity: 2, unit: "tsp", searchTerms: ["baking powder"] },
        { name: "eggs", quantity: 2, unit: null, searchTerms: ["eggs"] },
        { name: "milk", quantity: 300, unit: "ml", searchTerms: ["milk"] },
        { name: "butter", quantity: 30, unit: "g", searchTerms: ["butter"] },
        { name: "honey", quantity: null, unit: null, searchTerms: ["honey"] },
      ],
    },
  },
];

/** Catalog-aligned terms the demo engine can pull out of an arbitrary query. */
const DEMO_TERMS: { term: string; name: string; searchTerms: string[] }[] = [
  { term: "chicken", name: "chicken breast", searchTerms: ["chicken", "chicken breast"] },
  { term: "salmon", name: "salmon fillet", searchTerms: ["salmon"] },
  { term: "bacon", name: "bacon", searchTerms: ["bacon"] },
  { term: "rice", name: "basmati rice", searchTerms: ["rice"] },
  { term: "spinach", name: "baby spinach", searchTerms: ["spinach"] },
  { term: "potato", name: "potatoes", searchTerms: ["potato", "potatoes"] },
  { term: "cheese", name: "cheddar cheese", searchTerms: ["cheddar", "cheese"] },
  { term: "bread", name: "bread", searchTerms: ["bread"] },
  { term: "coffee", name: "ground coffee", searchTerms: ["coffee"] },
  { term: "peanut butter", name: "peanut butter", searchTerms: ["peanut butter"] },
];

function genericRecipe(query: string): Recipe {
  const q = query.toLowerCase();
  const found = DEMO_TERMS.filter((t) => q.includes(t.term));
  const cleaned = query.trim().replace(/^(i want to make|make me|how to make|recipe for)\s+/i, "");
  const title = cleaned ? cleaned[0].toUpperCase() + cleaned.slice(1) : "Your Recipe";

  const ingredients =
    found.length > 0
      ? found.map((t) => ({ name: t.name, quantity: 1, unit: null, searchTerms: t.searchTerms }))
      : [
          { name: "eggs", quantity: 6, unit: null, searchTerms: ["eggs"] },
          { name: "milk", quantity: 1, unit: "carton", searchTerms: ["milk"] },
          { name: "bread", quantity: 1, unit: "loaf", searchTerms: ["bread"] },
          { name: "butter", quantity: 1, unit: "block", searchTerms: ["butter"] },
        ];

  return {
    title,
    servings: 4,
    time: "30 min",
    steps: [
      "This is a demo recipe generated without an AI key.",
      "Add your GEMINI_API_KEY to .env.local for full AI-generated recipes.",
      "Meanwhile, we've matched grocery items and compared prices for you below.",
    ],
    ingredients,
  };
}

/** Produce a demo recipe for any query (used as the no-key fallback). */
export function demoRecipe(query: string): Recipe {
  const q = query.toLowerCase();
  const hit = DEMO_RECIPES.find((r) => r.keywords.some((k) => q.includes(k)));
  return hit ? hit.recipe : genericRecipe(query);
}
