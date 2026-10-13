import type { Offer } from "@/lib/types";
import { STORES } from "@/data/stores";
import { findStoreBrand } from "@/data/brands";
import { HERO_PRODUCTS, TOP_PICKS, BLACK_FRIDAY_PRODUCTS } from "@/data/landing";
import { ALL_SEARCH_PRODUCTS } from "@/data/searchResults";
import { PRODUCT_POP_BY_ID } from "@/data/productPop";

/*
 * The curated products - the ones with real, hand-fitted photography.
 * ---------------------------------------------------------------------------
 * Around three dozen products in this project already have real product shots,
 * sized and cropped to sit correctly in the card frame. Every one of them uses
 * imageFit "contain", because they are product photos on a plain ground rather
 * than lifestyle shots.
 *
 * Those are the best cards in the app, so when a search lands on one of them,
 * it should look exactly as it already does. This file is the lookup that
 * makes that happen.
 *
 * IMPORTANT: nothing here copies or edits those product definitions. They are
 * imported from the files that own them (data/landing.ts, data/searchResults.ts,
 * data/productPop.ts) so there is exactly one source of truth. All this file
 * adds is the search terms that should find each one.
 */

/**
 * A curated product, flattened from whichever file defines it.
 *
 * Only the photograph is guaranteed. Everything else is optional, because some
 * entries exist purely to put the right picture on a card: they set an image
 * and let the pipeline supply the name, the shop and the price as usual.
 */
export interface CuratedProduct {
  id: string;
  imageSrc: string;
  imageAlt: string;
  /** Always "contain" for these - see the note at the top of this file. */
  imageFit: "cover" | "contain";
  /** Replaces the AI's own product name on the card, when set. */
  description?: string;
  /** The store and price the card was originally designed around, when known. */
  storeName?: string;
  price?: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  discountLabel?: string;
  /** Hand-written per-store offers, where a Product-pop defines them. */
  storeOffers?: Offer[];
  /**
   * Shops that genuinely do not stock this, by id.
   *
   * The department gate in resolve.ts is a blunt instrument: it knows Costco
   * sells produce, so it offers Costco everything in the produce aisle. It
   * does not know Costco sells ginger only as a paste. This is where that kind
   * of real-world knowledge goes - one product, one shop, checked by a person.
   */
  notSoldAt?: string[];
  /**
   * Every word this product is allowed to be described with - its terms plus
   * its own description. Used by findCurated to tell "philadelphia cream
   * cheese" (still this product) from "chocolate cream cheese" (a different
   * one). See the note on findCurated.
   */
  vocabulary: Set<string>;
  /**
   * Words that rule this product out, even though they are harmless elsewhere.
   * See NEVER_WITH below.
   */
  neverWith: Set<string>;
}

/*
 * Which phrases should find which product.
 *
 * Written by hand rather than derived from the description, because
 * descriptions are marketing copy. "SUNSET Campari Tomatoes, 1lb" contains the
 * word "tomatoes", but "WATKINS PURE VANILLA EXT, 2 FL OZ" does not contain
 * "vanilla extract" in a form a matcher would find.
 *
 * These are matched against the AI's item name and its search terms, so they
 * should be the words a shopper or a recipe would actually use.
 */
const TERMS: Record<string, string[]> = {
  // --- Home and appliances (landing hero) ---
  "hero-air-purifier": ["air purifier", "hepa air purifier", "air cleaner"],
  "hero-portable-ac": [
    "air conditioner",
    "portable air conditioner",
    "portable ac",
    "ac unit",
    "window air conditioner",
  ],
  "hero-tower-fan": ["tower fan", "fan", "cooling fan", "standing fan"],

  // --- Produce (top picks) ---
  "pick-tomatoes": ["tomato", "tomatoes", "campari tomatoes"],
  "pick-cucumber": ["cucumber", "cucumbers", "mini cucumbers", "english cucumber"],
  "pick-mushrooms": ["mushroom", "mushrooms", "white mushrooms", "button mushrooms"],
  "pick-onions": ["onion", "onions", "yellow onion", "yellow onions"],
  "pick-banana": ["banana", "bananas"],
  "pick-pickles": ["pickle", "pickles", "dill pickles", "baby dills", "gherkins"],

  // --- Electronics (Black Friday row) ---
  // Bare "iphone" falls through to the flagship. Safe, because the specific
  // names below are longer and longer terms are matched first - so "iphone 12"
  // still finds the pre-owned one rather than landing here.
  "bf-iphone-17-pro": ["iphone 17 pro", "iphone 17", "iphone pro", "apple iphone", "iphone"],
  "bf-iphone-16e": ["iphone 16e", "iphone 16"],
  "bf-watch-ultra": ["apple watch", "apple watch ultra", "smartwatch", "smart watch"],
  "bf-airpods-pro-3": ["airpods", "airpods pro", "earbuds", "wireless earbuds"],
  "bf-iphone-12": ["iphone 12", "refurbished iphone", "pre-owned iphone"],

  // --- Groceries (AI search result page) ---
  "p-cream-cheese": ["cream cheese", "philadelphia", "whipped cream cheese"],
  "p-digestive-biscuits": [
    "digestive biscuits",
    "digestive biscuit",
    "digestives",
    "graham crackers",
    "graham cracker",
    "graham cracker crumbs",
  ],
  "p-oreo": [
    "oreo",
    "oreos",
    "oreo biscuits",
    "oreo cookies",
    "chocolate sandwich cookies",
    "sandwich cookies",
  ],
  "p-margarine": ["margarine", "becel", "buttery margarine"],
  // Butter pointed at the margarine card for a long time, because that is what
  // the cheesecake table shipped with. It has a photograph of its own now, so
  // it gets its own entry - and margarine goes back to meaning margarine.
  //
  // "buttery margarine" is a longer term than "butter", and longer terms are
  // tried first, so the Becel card still wins its own name.
  "p-butter": [
    "butter",
    "unsalted butter",
    "salted butter",
    "melted butter",
    "butter block",
    "block of butter",
  ],
  // "sugar" on its own means white sugar. Brown sugar is a different product,
  // and its longer terms are checked first so it is never swallowed by this.
  "p-sugar": ["sugar", "granulated sugar", "white sugar", "caster sugar", "redpath"],
  "p-brown-sugar": ["brown sugar", "light brown sugar", "dark brown sugar", "demerara"],
  // "vegetable oil" was here once and was wrong: vegetable oil is a different
  // product from olive oil, so it now gets its own photo or none. "cooking oil"
  // stays, because a recipe asking for any cooking oil is satisfied by this one.
  "p-olive-oil": ["olive oil", "extra virgin olive oil", "cooking oil"],

  // Bare "lentils" is safe here only because of how findCurated works: "red
  // lentils" and "canned lentils" carry a word this product is not known by,
  // so they are refused rather than shown green ones.
  "p-green-lentils": [
    "green lentils",
    "green lentil",
    "french green lentils",
    "french lentils",
    "puy lentils",
    "lentils",
    "dried lentils",
    "dry lentils",
  ],
  // Whole carrots only. "Baby carrots" and "shredded carrots" are sold as
  // different products, and this photograph is neither.
  "p-carrots": ["carrot", "carrots", "whole carrots", "orange carrots", "bunch of carrots"],
  // Root ginger, the knobbly thing in the produce aisle. Deliberately NOT
  // "ginger paste", "ground ginger" or "pickled ginger" - those are three
  // different products and this photograph is none of them.
  "p-ginger": ["ginger", "fresh ginger", "ginger root", "root ginger"],
  // A whole lemon. "Lemon juice" is a longer term on a different card and is
  // tried first, so the bottle still wins its own name.
  "p-lemon": ["lemon", "lemons", "fresh lemon", "whole lemon"],
  "p-walnuts": ["walnut", "walnuts", "chopped walnuts", "walnut halves"],
  // Not "baking powder". Different product, different aisle behaviour, and the
  // two are confused often enough that it is worth saying so here.
  "p-baking-soda": [
    "baking soda",
    "bicarbonate of soda",
    "sodium bicarbonate",
    "bicarb",
  ],
  // Plain table salt. "Sea salt", "kosher salt", "rock salt" and "garlic salt"
  // are all different products and all refused already, because none of those
  // first words is harmless or part of this product's own name.
  "p-table-salt": ["table salt", "salt", "iodized salt", "iodised salt", "fine salt"],
  // 2% milk, sometimes sold as "partly skimmed". See NEVER_WITH for the one
  // word that would otherwise let whole milk through.
  "p-milk-2": [
    "2% milk",
    "milk",
    "2 percent milk",
    "partly skimmed milk",
    "partly skimmed",
    "cow milk",
    "cows milk",
  ],
  // "tomato sauce" used to match the punnet of Campari tomatoes, which was one
  // of the sixteen traps in the matcher rewrite. Now there is a real jar for it
  // to find, and longer terms are tried first, so the sauce wins its own name.
  "p-tomato-sauce": [
    "tomato pasta sauce",
    "pasta sauce",
    "tomato sauce",
    "marinara",
    "marinara sauce",
    "tomato basil sauce",
  ],
  "p-whipping-cream": [
    "whipping cream",
    "heavy cream",
    "double cream",
    "35% cream",
    "whipped cream",
  ],
  "p-sour-cream": ["sour cream", "gay lea sour cream", "full fat sour cream"],
  "p-eggs": ["egg", "eggs", "large eggs"],
  "p-vanilla": ["vanilla", "vanilla extract", "pure vanilla"],
  "p-lemon-juice": ["lemon juice", "realemon", "bottled lemon juice"],
  "p-cornflour": ["cornflour", "corn flour", "corn masa", "masa harina"],
  "p-blueberries": ["blueberry", "blueberries", "fresh blueberries"],

  // --- Wine ---
  //
  // Never match on a bare brand here. A winery sells many different wines, and
  // "Jackson-Triggs" alone would put the Icewine photograph on a bottle of
  // Brut Sparkling. Putting the wrong photo on a card is worse than showing no
  // photo, because a photograph is the thing a shopper trusts most.
  //
  // Category terms are safe where the product genuinely is an instance of the
  // category, which is why plain "icewine" is allowed to find the Inniskillin.
  "w-inniskillin": [
    "inniskillin icewine",
    "inniskillin vidal icewine",
    "vidal icewine",
    "icewine",
    "ice wine",
  ],
  "w-jackson-triggs": [
    "jackson-triggs icewine",
    "jackson triggs icewine",
    "jackson-triggs reserve vidal icewine",
  ],
  "w-mission-hill": ["mission hill chardonnay", "mission hill reserve chardonnay"],
  "w-peller-estates": ["peller estates icewine", "peller icewine"],

  // --- Cream cheese alternatives (Product-pop) ---
  "cc-rel-bagels": ["bagel", "bagels", "dempsters bagels"],
  "cc-rel-noname": ["no name cream cheese"],
  "cc-rel-chocolate": ["chocolate cream cheese"],
  "cc-rel-strawberry": ["strawberry cream cheese"],
  "cc-rel-gv-original": ["great value cream cheese"],
  "cc-rel-gv-herb": ["herb and garlic cream cheese", "herb garlic cream cheese"],
  "cc-rel-selection": ["selection cream cheese"],
  "cc-rel-selection-brick": ["cream cheese brick"],
};

/*
 * Words that disqualify a product, overriding the global harmless list.
 * ---------------------------------------------------------------------------
 * HARMLESS says a word usually does not change what something is: "crushed"
 * was put there for crushed graham crackers and crushed Oreos, where crushing
 * really is the same biscuit in smaller pieces.
 *
 * It is not true everywhere. "Crushed tomatoes" and "diced tomatoes" are tins
 * from the pantry aisle, and the tomato card is a punnet of fresh Campari
 * tomatoes - so both were matching a photograph of the wrong product entirely.
 *
 * A global list cannot express "harmless, except for this one". This can.
 * Keep the entries narrow: each one is a statement about a single product.
 */
const NEVER_WITH: Record<string, string[]> = {
  // Fresh tomatoes in a punnet. Anything from a tin is a different product.
  "pick-tomatoes": [
    "crushed", "diced", "canned", "tinned", "passata",
    "puree", "pureed", "paste", "sauce", "soup", "juice",
  ],
  // Whole mushrooms on a tray, not a tin of soup or a jar of sauce.
  "pick-mushrooms": ["canned", "tinned", "soup", "sauce", "dried", "powder"],
  // A whole cucumber, not a jar of anything.
  "pick-cucumber": ["pickled", "canned", "jarred"],
  // A 2% carton. "Whole milk" is a different fat content and a different
  // product, and "whole" is on the harmless list - it was put there for whole
  // carrots and whole mushrooms, where it really does mean the same thing.
  //
  // The rest are here to be read rather than because they are needed: almond,
  // oat and soy are already refused for not being words this carton is known
  // by. Spelling them out means the next person does not have to work that out.
  "p-milk-2": [
    "whole", "skim", "skimmed", "homogenized", "homogenised",
    "almond", "oat", "soy", "soya", "coconut", "cashew",
    "evaporated", "condensed", "powdered", "buttermilk", "chocolate",
  ],
};

/*
 * Products whose photo exists but which no data file defines yet.
 *
 * Everything else on this page is imported from the file that owns it. These
 * are the exception: the image is in /public and was clearly made for the
 * project, but there is no product record anywhere to import. Rather than edit
 * the existing data files - which are finished and should stay that way - the
 * record is written here, next to the terms that find it.
 *
 * Move one of these into a data file the moment that file needs it for
 * anything other than search.
 */
const EXTRA_CURATED: RawCurated[] = [
  {
    // The original cheesecake base, before the conversation swapped it for
    // Oreos. North American recipes treat digestives and graham crackers as
    // the same thing for a crumb base, so both find this card.
    id: "p-digestive-biscuits",
    description: "Christie Peek Freans Family Digestive Biscuits, 300 g",
    imageSrc: "/stores/Product card Images/AI searched/Graham crackers.png",
    imageAlt: "Christie Peek Freans Family Digestive biscuits box",
    imageFit: "contain",
    storeName: "Walmart",
    price: 3.97,
    rating: 5,
    reviewCount: 345,
    showDiscount: true,
    discountLabel: "Baked in Canada",
  },
  {
    // Added after a stock photo for "sour cream" returned a bowl of soup -
    // garnished, with a spoon, on a saucer. Plausible at a glance and wrong on
    // a shopping card, which is the whole failure mode of stock photography.
    id: "p-sour-cream",
    description: "Gay Lea Sour Cream 500 mL",
    imageSrc: "/stores/Product card Images/AI searched/Gay lea sour cream.avif",
    imageAlt: "Gay Lea sour cream tub, 500 mL",
    imageFit: "contain",
    storeName: "Walmart",
    price: 2.96,
    rating: 4.5,
    reviewCount: 979,
  },
  {
    // Stock photography gave this one a bowl of breaded nuggets, so it uses a
    // supplied packshot instead.
    id: "p-brown-sugar",
    description: "Brown Sugar 1 kg",
    imageSrc: "/stores/Product card Images/AI searched/brown sugar.avif",
    imageAlt: "Brown sugar",
    imageFit: "contain",
    storeName: "Real Canadian Superstore",
    price: 3.0,
    rating: 5,
    reviewCount: 107,
  },
  {
    // Stock photography gave this one a plated Ethiopian meal. Description is
    // the designer's own; the shop and price still come from the pipeline.
    id: "p-green-lentils",
    description:
      "Organic French Green Lentils, 8 Ounces - Non-GMO, Kosher, Sproutable - by Food to Live",
    imageSrc: "/stores/Product card Images/AI searched/green lentils.avif",
    imageAlt: "Organic French green lentils, 8 ounce bag",
    imageFit: "contain",
  },
  {
    // Image-only: a specific Pexels photograph chosen by the designer, cropped
    // square so it fills the card frame the way the product shots do. The
    // source is portrait (3611 x 5416), which under "contain" would sit as a
    // thin strip with gaps either side. fit=crop asks Pexels for a centred
    // square instead - checked by eye, every carrot stays in frame.
    //
    // Photo: Eva Bronzini, pexels.com/photo/orange-carrots-on-the-table-5740452
    id: "p-carrots",
    imageSrc:
      "https://images.pexels.com/photos/5740452/pexels-photo-5740452.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=600&h=600",
    imageAlt: "A bundle of fresh orange carrots",
    imageFit: "contain",
  },
  {
    // Stock photography gave this one a plate of sushi, because sushi is
    // photographed with pickled ginger beside it. A perfectly good match for
    // the word and a useless one for the product.
    //
    // Image only, like the carrots: the designer supplied the photograph, so
    // the pipeline still names it and prices it across the shops that have it.
    id: "p-ginger",
    imageSrc: "/stores/Product card Images/AI searched/Fresh Ginger.avif",
    imageAlt: "Two fresh ginger roots",
    imageFit: "contain",
    // Costco sells ginger as a paste, not as root ginger. The department gate
    // cannot know that; a person does.
    notSoldAt: ["costco"],
  },
  {
    // Gathered by the designer and sitting unused until now - the card was
    // showing a stock photograph instead. See the note at the top of
    // EXTRA_CURATED: a photograph in the folder does nothing until something
    // names it.
    id: "p-lemon",
    imageSrc: "/stores/Product card Images/AI searched/lemon.avif",
    imageAlt: "A whole lemon beside a cut half",
    imageFit: "contain",
  },
  {
    // The designer's own description, from the packet.
    id: "p-walnuts",
    description: "Great Value Chopped Walnuts, 4 oz",
    imageSrc: "/stores/Product card Images/AI searched/walnuts.avif",
    imageAlt: "Great Value chopped walnuts, 4 oz bag",
    imageFit: "contain",
  },
  {
    // The filename really is spelled "Bakig". It is used exactly as it sits on
    // disk - correcting the spelling here would simply 404.
    id: "p-baking-soda",
    imageSrc: "/stores/Product card Images/AI searched/Bakig Soda.png",
    imageAlt: "Baking soda",
    imageFit: "contain",
  },
  {
    // Supplied by the designer, with instructions that it is used whenever
    // table salt is searched for.
    id: "p-table-salt",
    imageSrc: "/stores/Product card Images/AI searched/Table Salt.avif",
    imageAlt: "Table salt",
    imageFit: "contain",
  },
  {
    // Supplied by the designer, with instructions that it is used whenever
    // 2% milk is searched for. Left without a description so the card keeps
    // whatever size the AI asked for - 2 L, 4 L, a carton or a jug.
    id: "p-milk-2",
    imageSrc: "/stores/Product card Images/AI searched/2 percent cow milk- WALMART.avif",
    imageAlt: "2% partly skimmed milk",
    imageFit: "contain",
  },
  {
    // Stock photography gave this one a bowl of plated pasta - the meal you
    // make WITH the thing, rather than the thing. The same failure as the
    // olive oil below and the sour cream above.
    id: "p-tomato-sauce",
    description: "Classico Tomato & Basil Pasta Sauce 600 mL",
    imageSrc: "/stores/Product card Images/AI searched/Tomato pasta sauce.webp",
    imageAlt: "Classico Tomato & Basil pasta sauce jar, 600 mL",
    imageFit: "contain",
  },
  {
    // Stock photography gave this one a wine-and-charcuterie table.
    id: "p-olive-oil",
    description: "Olive Oil 1 L",
    imageSrc: "/stores/Product card Images/AI searched/olive oil.webp",
    imageAlt: "Olive oil bottle, 1 L",
    imageFit: "contain",
    storeName: "Walmart",
    price: 8.91,
    rating: 4.5,
    reviewCount: 472,
  },
  {
    // Supplied by the designer, together with the shop the card is built
    // around. Until now "butter" resolved to the Becel margarine card, which
    // was the cheesecake table's original choice rather than a real match.
    id: "p-butter",
    description: "Butter 454 g",
    imageSrc: "/stores/Product card Images/AI searched/Salted Butter.avif",
    imageAlt: "Wrapped butter bars beside their box",
    imageFit: "contain",
    storeName: "Costco Wholesale Canada",
    price: 5.79,
    rating: 5,
    reviewCount: 1080,
  },
];

/** Store display name -> store id, so a curated card's shop joins the comparison. */
const STORE_ID_BY_NAME: Record<string, string> = Object.fromEntries(
  STORES.map((s) => [s.name.toLowerCase(), s.id]),
);

/** The raw shape every curated source shares. Narrow enough to read safely. */
interface RawCurated {
  id: string;
  description?: string;
  imageSrc?: string;
  imageAlt?: string;
  imageFit?: "cover" | "contain";
  storeName?: string;
  price?: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  showDiscount?: boolean;
  discountLabel?: string;
  notSoldAt?: string[];
}

/** Every curated product, gathered from the three files that define them. */
function collect(): RawCurated[] {
  const popRelated = Object.values(PRODUCT_POP_BY_ID).flatMap((pop) => pop.related);

  return [
    ...HERO_PRODUCTS,
    ...TOP_PICKS,
    ...BLACK_FRIDAY_PRODUCTS,
    ...ALL_SEARCH_PRODUCTS,
    ...popRelated,
    ...EXTRA_CURATED,
  ] as RawCurated[];
}

/** Turn a Product-pop's hand-written store offers into our Offer shape. */
function offersFromPop(productId: string): Offer[] | undefined {
  const pop = PRODUCT_POP_BY_ID[productId];
  if (!pop || pop.storeOffers.length === 0) return undefined;

  return pop.storeOffers.map((o) => ({
    id: o.id,
    storeName: o.storeName,
    storeLogoSrc: o.storeLogoSrc,
    storeDistanceKm: o.storeDistanceKm,
    price: o.price,
    originalPrice: o.originalPrice,
    // A hand-written pop is about ONE product - Philadelphia cream cheese, at
    // five shops - so every offer carries that brand rather than each shop's
    // own. The offer may name its own if the designer wrote one.
    brand: o.brand ?? pop.brand ?? undefined,
    isOwnBrand:
      o.isOwnBrand ??
      (pop.brand ? findStoreBrand(pop.brand)?.storeIds.includes(o.id) : undefined),
    // These offers predate ratings, so give each a steady, believable one
    // rather than inventing variation the designer did not ask for.
    rating: 4.5,
    reviewCount: 345,
    promo: o.promo,
    cardBadge: o.cardBadge,
  }));
}

/** Split text into lowercase words, dropping punctuation. */
function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

/** id -> curated product, for everything that has both a photo and terms. */
export const CURATED_BY_ID: Record<string, CuratedProduct> = (() => {
  const map: Record<string, CuratedProduct> = {};

  for (const raw of collect()) {
    // Only products with a real photo are worth preferring over a fresh match.
    if (!raw.imageSrc) continue;
    const terms = TERMS[raw.id];
    if (!terms) continue;

    // The words a phrase may use and still mean THIS product: everything in
    // its terms, plus everything in its own printed description. "Whipped" and
    // "philadelphia" are on the cream cheese tub, so "philadelphia cream
    // cheese" is that tub; "chocolate" is not, so "chocolate cream cheese" is
    // some other product.
    const vocabulary = new Set<string>([
      ...terms.flatMap(wordsOf),
      ...wordsOf(raw.description ?? ""),
    ]);

    map[raw.id] = {
      id: raw.id,
      description: raw.description,
      vocabulary,
      neverWith: new Set(NEVER_WITH[raw.id] ?? []),
      imageSrc: raw.imageSrc,
      imageAlt: raw.imageAlt ?? raw.description ?? raw.id,
      // Honour whatever the designer set. Every one of these is "contain",
      // because the photos are fitted to the frame rather than cropped.
      imageFit: raw.imageFit ?? "contain",
      storeName: raw.storeName,
      price: raw.price,
      originalPrice: raw.originalPrice,
      rating: raw.rating,
      reviewCount: raw.reviewCount,
      notSoldAt: raw.notSoldAt,
      discountLabel: raw.showDiscount ? raw.discountLabel : undefined,
      storeOffers: offersFromPop(raw.id),
    };
  }

  return map;
})();

/**
 * Lookup table from a normalized phrase to a curated product.
 *
 * Longer phrases are checked first, so "chocolate cream cheese" wins over
 * plain "cream cheese" rather than losing to it by accident.
 */
const BY_TERM: [string, CuratedProduct][] = (() => {
  const pairs: [string, CuratedProduct][] = [];
  for (const [id, terms] of Object.entries(TERMS)) {
    const product = CURATED_BY_ID[id];
    if (!product) continue;
    for (const term of terms) pairs.push([term.toLowerCase(), product]);
  }
  return pairs.sort((a, b) => b[0].length - a[0].length);
})();

/**
 * Words that describe the state or amount of a product without changing what
 * it is. "Fresh blueberries", "sugar, 2 cups" and "unsalted butter (melted)"
 * are all still the same thing on a shelf.
 *
 * Kept deliberately short. Every word added here loosens matching for EVERY
 * product at once, and a word that sneaks in by mistake silently puts the
 * wrong photograph on a card. "Frozen", "dried", "light" and "baby" are left
 * out on purpose: frozen blueberries, dried cranberries, light cream cheese and
 * baby carrots are all different products from the ones photographed.
 */
const HARMLESS = new Set([
  // preparation and condition
  "fresh", "ripe", "raw", "whole", "plain", "pure", "natural", "organic",
  "unsalted", "salted", "melted", "softened", "chilled", "cold", "room",
  "temperature", "chopped", "sliced", "diced", "minced", "grated", "crushed",
  "optional", "large", "medium", "small", "unlocked",
  // small words
  "a", "an", "the", "of", "some", "or", "and", "for",
  // amounts and packaging
  "cup", "cups", "tbsp", "tsp", "tablespoon", "tablespoons", "teaspoon",
  "teaspoons", "g", "kg", "gram", "grams", "ml", "l", "litre", "liter",
  "oz", "ounce", "ounces", "lb", "lbs", "pound", "pounds", "pack", "packs",
  "bag", "bags", "box", "jar", "bottle", "can", "carton", "tub", "bunch",
  "dozen", "ct", "count", "x",
]);

const isNumber = (word: string) => /^[0-9]+%?$/.test(word);

/** Where a run of words first appears inside another run, or -1. */
function indexOfRun(words: string[], run: string[]): number {
  outer: for (let i = 0; i + run.length <= words.length; i++) {
    for (let j = 0; j < run.length; j++) {
      if (words[i + j] !== run[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/**
 * Does every word outside the matched term leave the product unchanged?
 *
 * A number is only harmless as an AMOUNT - "2 cups", "500 g", "12 large". On
 * its own it is usually a model: "iPhone 15" is not an iPhone 17 Pro. So a
 * number passes only when the next word is harmless or another number (for
 * fractions like "1 1/2 cups"), or when the product itself carries that number
 * in its name.
 */
function restIsHarmless(
  words: string[],
  start: number,
  length: number,
  product: CuratedProduct,
): boolean {
  for (let k = 0; k < words.length; k++) {
    if (k >= start && k < start + length) continue;

    const word = words[k];
    if (HARMLESS.has(word) || product.vocabulary.has(word)) continue;

    const next = words[k + 1];
    const isAmount =
      isNumber(word) && next !== undefined && (HARMLESS.has(next) || isNumber(next));
    if (isAmount) continue;

    return false;
  }
  return true;
}

/**
 * Find the curated product for an item, or null.
 *
 * The rule: a phrase matches when it contains one of the product's terms, and
 * EVERY OTHER WORD is either harmless or part of that product's own name.
 *
 * The first version only asked whether a term appeared somewhere in the
 * phrase, and it was badly wrong. Tested directly, sixteen phrases out of
 * sixteen that should NOT have matched, did:
 *
 *   peanut butter      -> the margarine card
 *   iphone case        -> the iPhone 17 Pro, at its $1,314 price
 *   tomato sauce       -> a punnet of Campari tomatoes
 *   sugar snap peas    -> a bag of granulated sugar
 *   cream of mushroom soup -> a tray of mushrooms
 *
 * In every case the extra word was the one that CHANGED the product. So the
 * extra words are now what decides.
 *
 * A second, narrower rule sits in front of that one: a handful of products
 * name words that rule them out even though the global list calls them
 * harmless - "crushed tomatoes" is a tin, not the punnet in the photograph.
 * See NEVER_WITH.
 *
 * Because the AI sends several phrases per item (its name plus two to four
 * search terms), being strict on each phrase costs little: a messy name like
 * "Blueberries (fresh/frozen)" fails, but its search term "blueberries" still
 * finds the card.
 */
export function findCurated(candidates: string[]): CuratedProduct | null {
  const phrases = candidates.map(wordsOf).filter((words) => words.length > 0);
  if (phrases.length === 0) return null;

  // Terms are sorted longest first, so "chocolate cream cheese" is tried
  // before plain "cream cheese" and wins when it applies.
  for (const [term, product] of BY_TERM) {
    const termWords = wordsOf(term);

    for (const words of phrases) {
      const start = indexOfRun(words, termWords);
      if (start === -1) continue;
      // One word from NEVER_WITH is enough to rule the product out, whatever
      // else the phrase says. Checked before the harmless rule, because these
      // words are usually ON that list - that is the whole point of them.
      if (words.some((w) => product.neverWith.has(w))) continue;
      if (restIsHarmless(words, start, termWords.length, product)) return product;
    }
  }

  return null;
}

/** Build an Offer from the store the curated card was designed around. */
export function seedOfferFor(product: CuratedProduct): Offer | null {
  // Image-only entries have no shop of their own; the pipeline prices them.
  if (!product.storeName || product.price === undefined) return null;

  const storeId = STORE_ID_BY_NAME[product.storeName.toLowerCase()];
  // Some curated cards use shops that are not partner stores (Home Depot, for
  // one). Those keep their photo and copy but do not join the comparison.
  if (!storeId) return null;

  const store = STORES.find((s) => s.id === storeId);
  if (!store) return null;

  return {
    id: storeId,
    storeName: store.name,
    storeLogoSrc: store.logoSrc,
    storeDistanceKm: store.distanceKm,
    price: product.price,
    originalPrice: product.originalPrice,
    rating: product.rating ?? 4.5,
    reviewCount: product.reviewCount ?? 345,
    cardBadge: product.discountLabel,
  };
}
