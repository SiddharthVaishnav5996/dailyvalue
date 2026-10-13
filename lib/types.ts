/*
 * Shared domain types for DailyValue.
 *
 * Read this file first. Everything the AI produces, everything the catalog
 * resolves, and everything the UI renders is described here, so this file is
 * the contract the whole pipeline agrees on:
 *
 *   query -> AI plan -> resolved products -> offers -> UI
 *
 * A "type" here is just a promise about the shape of an object. TypeScript
 * checks the promise at build time, so if the AI layer starts returning
 * something the UI doesn't expect, the build fails instead of the page.
 */

/* ---------------------------------------------------------------------------
 * Stores
 * ------------------------------------------------------------------------ */

/** A partner store DailyValue can compare and order from. */
export interface Store {
  id: string;
  name: string;
  /** Brand color used for chips/badges in the UI. */
  color: string;
  /** Short label used for the fallback initials tile. */
  logoText: string;
  /** Public path to the store's real logo, when we have one. */
  logoSrc?: string;
  deliveryFee: number;
  /** Human-friendly delivery window, e.g. "Today, 2-4 PM". */
  deliveryEta: string;
  /** Illustrative distance from the shopper, used to sort and to label cards. */
  distanceKm: number;
  /**
   * Relative price level, 1.00 = baseline. Multiplies a product's base price
   * so one store stays consistently cheaper than another across every item.
   */
  priceIndex: number;
  /** What this store sells - see DEPARTMENTS in data/stores.ts. */
  departments: string[];
}

/* ---------------------------------------------------------------------------
 * Catalog
 * ------------------------------------------------------------------------ */

/**
 * A catalog product. The SAME product is sold at multiple stores at different
 * prices - that's what makes the price comparison meaningful.
 */
export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  /** Purchasable unit, e.g. "block", "each", "bunch". */
  unit: string;
  /** Pack size, e.g. "250 g", "12 ct". */
  size: string;
  /** Emoji used for the product tile (kept consistent for a clean grid). */
  emoji: string;
  /** Aliases used to match free-text ingredients to this product. */
  searchTerms: string[];
  /** storeId -> price in CAD. */
  prices: Record<string, number>;
}

/* ---------------------------------------------------------------------------
 * What the AI returns
 *
 * This is the shape we force the model to reply in. Both Gemini and Groq get
 * the same schema, so the rest of the app never learns which one answered.
 * See lib/ai/schema.ts for the machine-readable version of this.
 * ------------------------------------------------------------------------ */

/** One row of a result table. Mirrors ResultTableRow in the UI exactly. */
export interface AITableRow {
  /** Stable within a response, e.g. "i1". Items point back at these. */
  id: string;
  /** Cell text left-to-right, filling columns 1-4. */
  cells: string[];
}

/** One result table. Mirrors ResultTableProps in the UI exactly. */
export interface AITable {
  /** Heading, e.g. "Blueberry Cheesecake - Ingredients". */
  title: string;
  /** 2-4 column labels. A 5th column is reserved for the delete action. */
  columns: string[];
  /** Treat column 1 as a repeating group label, e.g. "Cheesecake Filling". */
  groupFirstColumn: boolean;
  rows: AITableRow[];
}

/**
 * One thing to buy. This is deliberately NOT a product: it is a specification
 * that the resolver then satisfies, either from the catalog or by generating
 * a plausible product on the fly.
 */
export interface AIItem {
  /** Table rows this purchase covers. One product can satisfy several rows. */
  rowIds: string[];
  /** Plain name, e.g. "Cream cheese". */
  name: string;
  /** A brand the model suggests, when it has a strong one, e.g. "Philadelphia". */
  brandHint: string | null;
  /** Display category, e.g. "Dairy", "Appliances". */
  category: string;
  /** Which store department stocks this - see DEPARTMENTS in data/stores.ts. */
  department: string;
  /**
   * The catalog product this item IS, picked by the model from the id list in
   * the prompt. Already checked against the catalog, so a non-null value is
   * always a real id. Null for anything the catalog does not stock.
   */
  catalogId?: string | null;
  /** Aliases to help the catalog matcher find an existing product. */
  searchTerms: string[];
  /** How many packs to buy. */
  quantity: number;
  /** Pack size, e.g. "250 g", "12 ct", "Queen". */
  packSize: string | null;
  /** The model's CAD price estimate. Used ONLY when the catalog has no match. */
  estimatedPrice: number | null;
}

/**
 * A written recipe: the method, not just the shopping list.
 *
 * Only present when the shopper is cooking a specific dish. A restock or a
 * mattress has no recipe, so the field is null for those.
 *
 * The ingredients are repeated here even though the table already lists them.
 * That is deliberate: a recipe saved as a PDF has to stand on its own, long
 * after the table on screen has been edited or closed.
 */
export interface AIRecipe {
  /** e.g. "Creamy Alfredo Pasta". No emoji - this ends up in a PDF. */
  title: string;
  /** How many people this quantity feeds, e.g. 9. */
  servings: number;
  /** e.g. "15 min". Null when it genuinely does not apply. */
  prepTime: string | null;
  cookTime: string | null;
  /** One line each, amount first: "900 g fettuccine". */
  ingredients: string[];
  /** The method, in order. One action per step. */
  steps: string[];
  /** Optional advice: make-ahead, substitutions, storage. */
  tips: string[];
}

/** The single structured object every provider must return. */
export interface AIPlan {
  /**
   * The scope guardrail. False for anything outside grocery, food, recipes,
   * drinks, household and general retail shopping.
   */
  inScope: boolean;
  /** Why we cannot help, when inScope is false. Null otherwise. */
  refusal: string | null;
  /** The assistant's chat message. Always present. */
  reply: string;
  /** Zero or more tables. Empty for a conversational answer with nothing to buy. */
  tables: AITable[];
  /** The shopping list. Empty when there is nothing to buy. */
  items: AIItem[];
  /** The written method, when the shopper is cooking a dish. Null otherwise. */
  recipe: AIRecipe | null;
  /**
   * Did THIS turn change the dish?
   *
   * The model rewrites the whole recipe on every turn, so "is this the same
   * recipe?" cannot be answered by comparing the two objects - ask for a wine
   * pairing and the method comes back reworded, the tips rewritten and the
   * rice quietly up from 4 cups to 6. Measured, not assumed.
   *
   * Nothing in the payload separates a rewrite from a revision, so the model
   * is asked directly. Null when it did not say.
   */
  recipeChanged: boolean | null;
}

/* ---------------------------------------------------------------------------
 * What the resolver produces
 * ------------------------------------------------------------------------ */

/** One store's price for one product. */
export interface Offer {
  /** The store's id, e.g. "walmart". Doubles as the selection key in the UI. */
  id: string;
  storeName: string;
  storeLogoSrc?: string;
  storeDistanceKm: number;
  price: number;
  /** Shown struck through when this offer is a markdown. */
  originalPrice?: number;
  /** 0-5, one decimal. */
  rating: number;
  reviewCount: number;
  /**
   * The brand a shopper would actually be handed at THIS store.
   *
   * It belongs to the offer rather than the product, because it changes from
   * shop to shop. One row of "cream cheese" is Great Value at Walmart,
   * Compliments at Sobeys and Selection at Metro - three different tubs, three
   * different prices, and the choice between them is the whole point.
   */
  brand?: string;
  /** True when that brand belongs to this shop, e.g. Kirkland at Costco. */
  isOwnBrand?: boolean;
  /**
   * The real package for THIS shop's brand, when one has been seeded.
   *
   * Switching store in the pop-up switches the photograph too, because a
   * Kirkland tub and a Compliments tub are not the same product. Falls back to
   * the product's own image when absent. Never set for curated products -
   * their hand-fitted photography always wins.
   */
  imageSrc?: string;
  /** Green loyalty line in the comparison dropdown, e.g. "200 Scene+ Points". */
  promo?: string;
  /** Red badge on the card when this offer is the selected one. */
  cardBadge?: string;
}

/** An AI item, resolved into something buyable across real stores. */
export interface ResolvedProduct {
  id: string;
  /** Table rows this product fulfils, copied from the AIItem. */
  rowIds: string[];
  /** Full display name shown on the card. */
  description: string;
  brand: string;
  category: string;
  department: string;
  packSize: string;
  /** Tile emoji, used whenever no photo is available. */
  emoji: string;
  imageSrc?: string;
  imageAlt?: string;
  imageFit?: "cover" | "contain";
  /**
   * Where this came from - useful for debugging, and for being honest in the UI.
   *
   *   curated   - one of the ~36 hand-photographed products. Best cards in the
   *               app: real product shot, real copy, fitted to the frame.
   *   catalog   - a seeded grocery product with real per-store prices.
   *   generated - built on the fly for something neither list covers.
   */
  source: "curated" | "catalog" | "generated";
  /** Every store that stocks it, already ranked best-first. */
  offers: Offer[];
  /** How many to put in the basket. */
  quantity: number;
}

/** The full response returned by POST /api/search. */
export interface SearchResult {
  query: string;
  /** Which provider answered, or the built-in demo engine. */
  source: "gemini" | "groq" | "demo";
  inScope: boolean;
  /** The assistant's chat message, shown in the thread. */
  reply: string;
  tables: AITable[];
  /**
   * The AI's shopping list, exactly as it answered.
   *
   * Kept alongside the products because the two age differently. The list is
   * the expensive part - an AI request - and stays valid. The products are
   * derived from it using the catalog, the curated photos and the matcher,
   * all of which change as the project does. Keeping the list means a saved
   * search can rebuild its products from current data without asking the AI
   * again. See POST /api/resolve.
   */
  items: AIItem[];
  /** The written method, when there is one. Cached with the list, for the same reason. */
  recipe: AIRecipe | null;
  /**
   * Did this turn change the dish? Passed straight through from the plan so
   * the browser can decide whether to print the recipe again - see
   * shouldShowRecipe in lib/search/SearchContext.tsx.
   */
  recipeChanged: boolean | null;
  products: ResolvedProduct[];
  /** Item names the resolver could not turn into anything buyable. */
  unresolved: string[];
}

/* ---------------------------------------------------------------------------
 * Legacy recipe pipeline (POST /api/recipe)
 *
 * Kept so the original endpoint keeps compiling while the new search pipeline
 * takes over. Safe to delete once nothing imports these.
 * ------------------------------------------------------------------------ */

/** A single ingredient extracted from a recipe by the AI. */
export interface Ingredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  searchTerms: string[];
}

/** A recipe produced by the AI (or the built-in demo engine). */
export interface Recipe {
  title: string;
  servings: number;
  time: string;
  steps: string[];
  ingredients: Ingredient[];
}

/** An ingredient paired with the best catalog product we could find. */
export interface IngredientMatch {
  ingredient: Ingredient;
  product: Product | null;
  /** Match confidence 0-1 (1 = exact). */
  score: number;
  quantity: number;
}

/** Basket total for one store. */
export interface StoreTotal {
  storeId: string;
  total: number;
  itemCount: number;
}

/** The price-comparison result across every store. */
export interface Comparison {
  byStore: StoreTotal[];
  cheapestStoreId: string;
  cheapestTotal: number;
  mostExpensiveTotal: number;
  savings: number;
}

/** The full response returned by POST /api/recipe. */
export interface RecipeResult {
  query: string;
  source: "ai" | "demo";
  recipe: Recipe;
  items: IngredientMatch[];
  comparison: Comparison;
  unmatched: string[];
}
