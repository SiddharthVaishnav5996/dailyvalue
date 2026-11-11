/*
 * Variant families - the choice the shopper never got asked about.
 * ---------------------------------------------------------------------------
 * Ask this app for "some milk" and it hands you a 2% carton. Not because it
 * guessed, and not because the AI chose: because lib/catalog/curated.ts lists
 * the bare word "milk" as an alias of the 2% card, and data/products.json
 * calls its default milk product "2% Milk". Somebody decided, in code, months
 * ago, and the shopper never saw it happen.
 *
 * It is not only milk. The catalog's bare words all resolve to one particular
 * thing:
 *
 *   "milk"   -> 2% Milk            "rice"  -> Basmati Rice
 *   "bread"  -> Whole Wheat Bread  "flour" -> All-Purpose Flour
 *   "eggs"   -> Large Eggs
 *
 * Every one of those is a reasonable default and a silent decision.
 *
 * WHY NOT JUST ASK THE SHOPPER
 *
 * Because the cost of asking scales with the length of the list. "Ingredients
 * for butter chicken" is a dozen items, four or five of them ambiguous, and an
 * assistant that asks about each one is a quiz standing between the shopper and
 * the first price. The app already solved this shape of problem once, for
 * stores: it picks one, shows which it picked, and lets you switch in a tap.
 * See lib/brand/BrandPreferenceContext.tsx for the same idea applied to brands.
 *
 * So: decide, show the decision, make it one tap to change.
 *
 * WHY THIS IS DATA AND NOT A PROMPT
 *
 * lib/ai/planPrompt.ts could be told to offer three milks. It would, and they
 * would be invented: three cards with made-up prices, no photographs and no
 * shop that actually stocks them. A prompt is a request; this file is a
 * guarantee. Every member below is a product that already exists in
 * data/products.json, already has per-store prices, and already has two to
 * seven verified photographs in data/imageDb.json.
 *
 * THE RULE FOR ADDING A FAMILY
 *
 * Only where picking wrong changes what the shopper cooks. Skim instead of
 * whole milk ruins a custard; unsalted instead of salted butter ruins a
 * shortbread. Table salt, baking soda and lemons have no such choice, so they
 * get no chooser - an empty dropdown is worse than no dropdown.
 */

/** One member of a family: a real product, or a real variant of one. */
export interface VariantMember {
  /**
   * The catalog product id, e.g. "skim-milk". Must exist in
   * data/products.json - the resolver prices and photographs it like any
   * other product, which is the whole point of pointing at a real one.
   */
  id: string;
  /**
   * A qualifier on that same product, e.g. "unsalted".
   *
   * Butter is the case this exists for: there is one `butter` product, and
   * data/imageDb.json carries both a salted and an unsalted packshot for it.
   * The qualifier rides the machinery that already exists for exactly this -
   * `variantOf` in lib/catalog/resolve.ts puts it in the card's title, and
   * `verifiedPhotoFor` in lib/catalog/imageDb.ts picks the matching photo.
   */
  variant?: string;
  /**
   * A hand-authored alternative from data/productPop.ts, by its id.
   *
   * The catalog cannot answer every family. There is no chocolate cream
   * cheese in data/products.json and there is unlikely ever to be one - but
   * there IS a photograph of the tub, a price and a shop, because the designer
   * built that card by hand for the cream-cheese pop-up.
   *
   * So a member can point at one of those cards instead, and the card supplies
   * everything: the picture, the title, the shop and the price. `id` is still
   * required and still names the product the family hangs off, because that is
   * how familyFor finds the family in the first place.
   *
   * A card member is never the default - see familyFor. The shopper has to
   * choose chocolate; nobody gets handed it for saying "cream cheese".
   */
  cardId?: string;
  /** Short label for the chooser, e.g. "Skim". Two words at most. */
  label: string;
  /** One line saying when to pick this. Shown under the label. */
  note?: string;
}

/** A group of products that answer the same request differently. */
export interface VariantFamily {
  /** Stable id, used in nothing but logs and tests. */
  id: string;
  /** What the choice is called, e.g. "Fat content". Heads the dropdown. */
  label: string;
  /**
   * The catalog product a bare request lands on - "eggs" for "some eggs".
   *
   * Written down rather than inferred from the order below, which is how it
   * went wrong the first time: the members are listed in the order a person
   * should READ them (lightest first, smallest first), and that is not the
   * same as which one is the default. With eggs listed by size, Medium came
   * first, was taken for the default, and inherited the "Large Eggs" card.
   *
   * It decides one thing: which member a named curated card may dress. See
   * resolveFamily in lib/catalog/resolve.ts.
   */
  base: string;
  /**
   * The members, in the order they should be listed - usually lightest or
   * plainest first, so the list reads like a scale rather than a jumble.
   * Which one is SELECTED is decided by what the shopper's words resolved to,
   * not by the order here.
   */
  members: VariantMember[];
}

export const VARIANT_FAMILIES: VariantFamily[] = [
  {
    /*
     * Relabelled from "Fat content" to "Milk", and widened.
     *
     * Fat content was the honest label for four dairy cartons, and it quietly
     * made the chooser useless to anyone who drinks oat milk: the catalog has
     * almond, oat, soy and the rest, and somebody typing "milk" saw none of
     * them. Skim and oat are not points on one scale, so the old label could
     * not have stretched to cover both - the label had to go first.
     *
     * Dairy first, lightest to richest, then the ones that are milk by use
     * rather than by composition. A shopper reads down until they recognise
     * what they drink.
     */
    id: "milk-type",
    base: "milk",
    label: "Milk",
    members: [
      { id: "skim-milk", label: "Skim", note: "No fat" },
      { id: "1-milk", label: "1%", note: "Lighter" },
      { id: "milk", label: "2%", note: "The usual" },
      { id: "whole-milk", label: "Whole", note: "Richest - for custards" },
      { id: "lactose-free-milk", label: "Lactose free", note: "Dairy, without the lactose" },
      { id: "chocolate-milk", label: "Chocolate" },
      { id: "oat-milk", label: "Oat", note: "Plant based - froths well" },
      { id: "almond-milk", label: "Almond", note: "Plant based - thin, nutty" },
      { id: "soy-milk", label: "Soy", note: "Plant based - most protein" },
      { id: "coconut-milk-beverage", label: "Coconut", note: "Plant based - for drinking" },
    ],
  },
  {
    // The vaguest word a shopper types. "Add cheese" is an instruction with a
    // dozen right answers and no default worth guessing at - parmesan instead
    // of mozzarella is a different dinner, not a different brand.
    id: "cheese-type",
    base: "cheddar",
    label: "Cheese",
    members: [
      { id: "cheddar", label: "Cheddar", note: "The all-rounder" },
      { id: "marble-cheese", label: "Marble" },
      { id: "mozzarella-cheese", label: "Mozzarella", note: "Melts - for pizza" },
      { id: "swiss-cheese", label: "Swiss" },
      { id: "parmesan-cheese", label: "Parmesan", note: "Hard - for grating" },
      { id: "feta-cheese", label: "Feta", note: "Salty - for salads" },
      { id: "goat-cheese", label: "Goat", note: "Tangy, soft" },
      { id: "brie-cheese", label: "Brie", note: "For a cheese board" },
      { id: "ricotta-cheese", label: "Ricotta", note: "For lasagne and baking" },
      { id: "cottage-cheese", label: "Cottage" },
    ],
  },
  {
    // A recipe that says "red onion" means it. Raw red in a salad and yellow
    // softened in a pan are not the same ingredient.
    id: "onion-type",
    base: "onion",
    label: "Onion",
    members: [
      { id: "onion", label: "Yellow", note: "The cooking onion" },
      { id: "red-onion", label: "Red", note: "Milder - good raw" },
      { id: "white-onion", label: "White", note: "Sharper" },
      { id: "vidalia-sweet-onion", label: "Sweet", note: "Vidalia - for rings" },
      { id: "green-onion", label: "Green", note: "Scallions - a garnish" },
      { id: "pearl-onions", label: "Pearl", note: "Small, for stews" },
    ],
  },
  {
    // A portobello is a burger. White mushrooms are a sauce.
    id: "mushroom-type",
    base: "white-mushrooms",
    label: "Mushroom",
    members: [
      { id: "white-mushrooms", label: "White", note: "The everyday one" },
      { id: "cremini-mushrooms", label: "Cremini", note: "Browner, deeper flavour" },
      { id: "portobello-mushrooms", label: "Portobello", note: "Big - grill like a steak" },
      { id: "shiitake-mushrooms", label: "Shiitake", note: "For stir-fries and broth" },
      { id: "oyster-mushrooms", label: "Oyster", note: "Delicate, quick to cook" },
      { id: "enoki-mushrooms", label: "Enoki", note: "Thin, for soups" },
    ],
  },
  {
    // Alfredo instead of tomato is not a substitution, it is a different meal.
    id: "pasta-sauce-type",
    base: "tomato-sauce",
    label: "Sauce",
    members: [
      { id: "tomato-sauce", label: "Tomato", note: "The default red sauce" },
      { id: "arrabbiata-sauce", label: "Arrabbiata", note: "Tomato, with chilli" },
      { id: "rose-sauce", label: "Rosé", note: "Tomato and cream" },
      { id: "vodka-sauce", label: "Vodka" },
      { id: "alfredo-sauce", label: "Alfredo", note: "White, creamy" },
      { id: "pesto-sauce", label: "Pesto", note: "Basil and oil - no tomato" },
    ],
  },
  {
    id: "soup-type",
    base: "tomato-soup",
    label: "Soup",
    members: [
      { id: "tomato-soup", label: "Tomato" },
      { id: "chicken-noodle-soup", label: "Chicken noodle" },
      { id: "vegetable-soup", label: "Vegetable" },
      { id: "cream-of-mushroom-soup", label: "Cream of mushroom", note: "Also a recipe base" },
      { id: "minestrone-soup", label: "Minestrone" },
      { id: "split-pea-soup", label: "Split pea" },
    ],
  },
  {
    id: "egg-size",
    base: "eggs",
    label: "Size",
    members: [
      { id: "medium-eggs", label: "Medium" },
      { id: "eggs", label: "Large", note: "What recipes assume" },
      { id: "extra-large-eggs", label: "Extra large" },
      { id: "jumbo-eggs", label: "Jumbo" },
    ],
  },
  {
    id: "butter-salt",
    base: "butter",
    label: "Salt",
    members: [
      // No `variant` on this one: plain `butter` IS the salted pack, and the
      // curated card in lib/catalog/curated.ts is a photograph of it.
      { id: "butter", label: "Salted", note: "For toast and cooking" },
      { id: "butter", variant: "unsalted", label: "Unsalted", note: "For baking" },
    ],
  },
  {
    id: "bread-loaf",
    base: "bread",
    label: "Loaf",
    members: [
      { id: "white-bread", label: "White" },
      { id: "bread", label: "Whole wheat" },
      { id: "multigrain-bread", label: "Multigrain" },
      { id: "sourdough-bread", label: "Sourdough" },
    ],
  },
  {
    id: "rice-grain",
    base: "rice",
    label: "Grain",
    members: [
      { id: "white-rice", label: "White", note: "Long grain" },
      { id: "rice", label: "Basmati", note: "For biryani and pulao" },
      { id: "jasmine-rice", label: "Jasmine", note: "For Thai dishes" },
      { id: "brown-rice", label: "Brown", note: "Nuttier, slower to cook" },
    ],
  },
  {
    // The one family the catalog cannot supply on its own.
    //
    // Chocolate and strawberry cream cheese are limited editions: no catalog
    // entry, no seeded price, no harvested photograph. What there IS is the
    // designer's own cards for the cream-cheese pop-up, each with a real tub
    // photographed on white and a real shop and price beside it. Those were
    // sitting in a row of "alternatives" underneath the product, which is the
    // job this chooser now does properly - so they move up here and the row
    // goes away. See `related` in data/productPop.ts, which still owns them.
    id: "cream-cheese-flavour",
    base: "cream-cheese",
    label: "Flavour",
    members: [
      { id: "cream-cheese", label: "Original", note: "Philadelphia, whipped" },
      {
        id: "cream-cheese",
        cardId: "cc-rel-chocolate",
        label: "Chocolate",
        note: "Limited edition",
      },
      {
        id: "cream-cheese",
        cardId: "cc-rel-strawberry",
        label: "Strawberry",
        note: "Limited edition",
      },
      {
        // The one savoury member, and the only one under a different brand -
        // the designer photographed Walmart's own herb and garlic tub rather
        // than Philadelphia's. That is fine here: this chooser asks which
        // FLAVOUR, and the brand line on the card answers whose it is.
        id: "cream-cheese",
        cardId: "cc-rel-gv-herb",
        label: "Herb & garlic",
        note: "Savoury - for bagels",
      },
    ],
  },
  {
    // The one that decides whether the shopper can use what they bought at
    // all. Whole beans without a grinder, or pods without the machine that
    // takes them, are not coffee - they are a trip back to the shop.
    id: "coffee-form",
    base: "coffee",
    label: "Form",
    members: [
      { id: "coffee", label: "Ground", note: "For a drip machine or press" },
      { id: "whole-bean-coffee", label: "Whole bean", note: "Needs a grinder" },
      { id: "coffee-pods", label: "Pods", note: "Single-serve machines only" },
      { id: "instant-coffee", label: "Instant", note: "Just add water" },
      { id: "decaf-coffee", label: "Decaf" },
    ],
  },
  {
    // Only reachable because data/bareWords.ts says what "tea" means. Without
    // that the word resolved to a Garment Steamer, and a family whose base
    // nobody can land on is a family that never opens.
    id: "tea-type",
    base: "orange-pekoe-tea-bags",
    label: "Tea",
    members: [
      { id: "orange-pekoe-tea-bags", label: "Orange pekoe", note: "Everyday black tea" },
      { id: "earl-grey-tea-bags", label: "Earl Grey", note: "Black, with bergamot" },
      { id: "green-tea-bags", label: "Green" },
      { id: "peppermint-tea-bags", label: "Peppermint", note: "Caffeine free" },
      { id: "herbal-tea-bags", label: "Herbal", note: "Caffeine free" },
    ],
  },
  {
    id: "sugar-type",
    base: "sugar",
    label: "Type",
    members: [
      { id: "sugar", label: "Granulated", note: "The default for baking" },
      { id: "brown-sugar", label: "Brown", note: "Molasses - for cookies" },
      { id: "icing-sugar", label: "Icing", note: "For frosting and dusting" },
    ],
  },
  {
    id: "cooking-oil",
    base: "olive-oil",
    label: "Oil",
    members: [
      { id: "olive-oil", label: "Olive", note: "Dressings and low heat" },
      { id: "canola-oil", label: "Canola", note: "Neutral, high heat" },
      { id: "vegetable-oil", label: "Vegetable", note: "Neutral, everyday frying" },
      { id: "avocado-oil", label: "Avocado", note: "Highest smoke point" },
      { id: "coconut-oil", label: "Coconut", note: "Solid at room temperature" },
    ],
  },
  {
    // Not interchangeable in the way they look. A russet falls apart into a
    // fluffy mash and a waxy red holds its shape in a salad, so the wrong
    // potato is the wrong dish.
    id: "potato-type",
    base: "potato",
    label: "Type",
    members: [
      { id: "potato", label: "White", note: "All-rounder" },
      { id: "russet-potatoes", label: "Russet", note: "Fluffy - mash and baking" },
      { id: "yukon-gold-potatoes", label: "Yukon Gold", note: "Buttery, holds together" },
      { id: "red-potatoes", label: "Red", note: "Waxy - for salads" },
      { id: "baby-potatoes", label: "Baby", note: "Roast whole" },
    ],
  },
  {
    // Barely the same purchase: a whole bird, a tray of breasts and a pack of
    // mince are three different evenings.
    id: "chicken-cut",
    base: "chicken-breast",
    label: "Cut",
    members: [
      { id: "chicken-breast", label: "Breast", note: "Lean, quick to cook" },
      { id: "chicken-thighs", label: "Thighs", note: "Richer, hard to overcook" },
      { id: "chicken-drumsticks", label: "Drumsticks" },
      { id: "whole-chicken", label: "Whole bird", note: "For roasting" },
      { id: "ground-chicken", label: "Ground" },
    ],
  },
  {
    id: "ground-beef-lean",
    base: "ground-beef",
    label: "Leanness",
    members: [
      { id: "ground-beef", label: "Regular", note: "Most fat - best for burgers" },
      { id: "lean-ground-beef", label: "Lean" },
      { id: "extra-lean-ground-beef", label: "Extra lean", note: "For sauces and chili" },
    ],
  },
  {
    // The longest list here, and the one that most needs its notes.
    //
    // Eleven apples sound like a wall, and would be if the rows said nothing
    // but a name - "Empire" tells a shopper nothing. Ordered tart to sweet
    // and annotated by what each one is FOR, the list reads as a scale
    // instead: the top of it bakes, the bottom of it goes in a lunchbox.
    id: "apple-type",
    base: "gala-apples",
    label: "Variety",
    members: [
      { id: "granny-smith-apples", label: "Granny Smith", note: "Tart - the pie apple" },
      { id: "mcintosh-apples", label: "McIntosh", note: "Soft - cooks down to sauce" },
      { id: "empire-apples", label: "Empire", note: "Tart-sweet, holds its shape" },
      { id: "cosmic-crisp-apples", label: "Cosmic Crisp", note: "Very crisp, keeps for months" },
      { id: "honeycrisp-apples", label: "Honeycrisp", note: "Crisp and sweet" },
      { id: "pink-lady-apples", label: "Pink Lady", note: "Sweet-tart and firm" },
      { id: "ambrosia-apples", label: "Ambrosia", note: "Sweet, slow to brown" },
      { id: "gala-apples", label: "Gala", note: "Sweet - for eating" },
      { id: "fuji-apples", label: "Fuji", note: "The sweetest" },
      { id: "golden-delicious-apples", label: "Golden Delicious", note: "Sweet, bakes well" },
      { id: "red-delicious-apples", label: "Red Delicious", note: "Mild, thin skin" },
    ],
  },
  {
    // "Vanilla" for the base is read off the photographs, not guessed: every
    // verified shot for the plain `ice-cream` product - Breyers, Compliments,
    // Great Value, Irresistibles - is a vanilla tub.
    id: "ice-cream-flavour",
    base: "ice-cream",
    label: "Flavour",
    members: [
      { id: "ice-cream", label: "Vanilla", note: "The default tub" },
      { id: "chocolate-ice-cream", label: "Chocolate" },
      { id: "strawberry-ice-cream", label: "Strawberry" },
      { id: "neapolitan-ice-cream", label: "Neapolitan", note: "All three at once" },
      { id: "cookies-and-cream-ice-cream", label: "Cookies & cream" },
      { id: "mint-chip-ice-cream", label: "Mint chip" },
      { id: "maple-walnut-ice-cream", label: "Maple walnut" },
    ],
  },
  {
    // Strictly these are different KINDS rather than flavours of one thing -
    // a tortilla chip is not a potato chip. They belong together anyway,
    // because "get some chips" is answered by any of them, and which one
    // arrives changes the evening.
    id: "chips-kind",
    base: "potato-chips",
    label: "Chips",
    members: [
      { id: "potato-chips", label: "Plain potato" },
      { id: "ketchup-chips", label: "Ketchup", note: "The Canadian one" },
      { id: "kettle-chips", label: "Kettle", note: "Thicker, crunchier" },
      { id: "tortilla-chips", label: "Tortilla", note: "For nachos and salsa" },
      { id: "corn-chips", label: "Corn" },
      { id: "pita-chips", label: "Pita", note: "For hummus and dips" },
      { id: "veggie-chips", label: "Veggie" },
    ],
  },
  {
    id: "soft-drink-flavour",
    base: "cola",
    label: "Flavour",
    members: [
      { id: "cola", label: "Cola" },
      { id: "diet-cola", label: "Diet cola", note: "No sugar" },
      { id: "lemon-lime-soda", label: "Lemon-lime" },
      { id: "ginger-ale", label: "Ginger ale" },
      { id: "cream-soda", label: "Cream soda" },
      { id: "orange-soda", label: "Orange" },
      { id: "club-soda", label: "Club soda", note: "Unsweetened - for mixing" },
    ],
  },
  {
    // Only reachable because data/bareWords.ts says "fish" means salmon.
    // Before that the word found Fish Flakes, which is aquarium fish food.
    id: "fish-fillet",
    base: "salmon",
    label: "Fish",
    members: [
      { id: "salmon", label: "Salmon", note: "Rich and oily" },
      { id: "trout-fillet", label: "Trout" },
      { id: "cod-fillet", label: "Cod", note: "Mild and flaky" },
      { id: "haddock-fillet", label: "Haddock", note: "For fish and chips" },
      { id: "halibut-fillet", label: "Halibut", note: "Firm and meaty" },
      { id: "pickerel-fillet", label: "Pickerel", note: "Freshwater, delicate" },
      { id: "tilapia-fillet", label: "Tilapia", note: "Mild, the cheapest" },
    ],
  },
  {
    id: "yogurt-type",
    base: "greek-yogurt",
    label: "Type",
    members: [
      { id: "greek-yogurt", label: "Greek", note: "Thick, high protein" },
      { id: "balkan-style-yogurt", label: "Balkan", note: "Plain and creamy" },
      { id: "vanilla-yogurt", label: "Vanilla", note: "Sweetened" },
      { id: "plant-based-yogurt", label: "Plant-based", note: "Dairy free" },
      { id: "lactose-free-yogurt", label: "Lactose free" },
    ],
  },
  {
    // The mildest family here, and deliberately so: colour is mostly colour.
    // It earns its place because a recipe that says "red pepper" means it,
    // and because the four are priced differently.
    id: "bell-pepper-colour",
    base: "green-bell-pepper",
    label: "Colour",
    members: [
      { id: "green-bell-pepper", label: "Green", note: "Grassier, cheapest" },
      { id: "red-bell-pepper", label: "Red", note: "Sweetest" },
      { id: "yellow-bell-pepper", label: "Yellow" },
      { id: "orange-bell-pepper", label: "Orange" },
    ],
  },
  {
    id: "flour-type",
    base: "flour",
    label: "Type",
    members: [
      { id: "flour", label: "All-purpose", note: "The default for most baking" },
      { id: "whole-wheat-flour", label: "Whole wheat" },
      { id: "cake-flour", label: "Cake", note: "Softer crumb" },
    ],
  },
];

/** Stable key for one member within its family. */
export function memberKey(member: VariantMember): string {
  if (member.cardId) return member.cardId;
  return member.variant ? `${member.id}:${member.variant}` : member.id;
}

/**
 * The family a resolved product belongs to, and which member it is.
 *
 * `productId` is the CATALOG id ("milk"), not the resolved card's id
 * ("p-milk-2") - a curated photo changes what the card looks like, not which
 * product it is. `variant` is the qualifier the shopper's words produced, so
 * "unsalted butter" lands on the unsalted member rather than the salted one.
 *
 * Returns null for the overwhelming majority of products, which is correct:
 * six families is the whole list, deliberately.
 */
export function familyFor(
  productId: string | undefined,
  variant: string | null = null,
): { family: VariantFamily; member: VariantMember } | null {
  if (!productId) return null;
  const wanted = variant?.toLowerCase() ?? null;

  for (const family of VARIANT_FAMILIES) {
    const candidates = family.members.filter((m) => m.id === productId);
    if (candidates.length === 0) continue;

    // An exact qualifier match wins; otherwise the plainest member there is -
    // no qualifier and no hand-authored card. "Unsalted butter" must not land
    // on the salted pack, and nobody who asks for "cream cheese" should be
    // handed the chocolate one.
    const exact = wanted ? candidates.find((m) => m.variant?.toLowerCase() === wanted) : null;
    const member =
      exact ?? candidates.find((m) => !m.variant && !m.cardId) ?? candidates[0];
    return { family, member };
  }

  return null;
}
