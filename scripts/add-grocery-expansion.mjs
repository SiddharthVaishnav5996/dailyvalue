/*
 * Grocery expansion: ~410 generic Dairy, Produce, Frozen and canned/jarred
 * Pantry items.
 * ---------------------------------------------------------------------------
 * The catalog had thin coverage of everyday fridge, freezer and pantry
 * staples ("Medium Eggs", "Frozen Cauliflower Florets", "Canned Pinto Beans",
 * "Yukon Gold Potatoes"...), so those searches fell through to the nearest
 * fuzzy match or an AI-guessed product. Giving them catalog ids means the
 * planner can pick them by id and they resolve the same way every time.
 *
 * Generic items only ("Butter", "Frozen Peas") - never a brand. Real Canadian
 * pack sizes and estimated 2026 CAD shelf prices (not scraped).
 *
 * PRICING
 *
 * Unlike the electronics/furniture script (Walmart only), these are plain
 * grocery items, so every one gets a price at ALL FOUR seeded grocery stores
 * using exactly the formula in expand-catalog.mjs: base * (store multiplier +
 * deterministic hash wobble).
 *
 * ALIASES
 *
 * Each item carries 2-4 lowercase searchTerms that shoppers actually type.
 * No name or alias may equal any other item's name or alias (existing or new),
 * and no alias may be a bare generic word ("beans", "soup"...) - those would
 * steal searches from the specific items. scripts/check-grocery-expansion.mjs
 * enforces both; run it after editing this file.
 *
 * Idempotent: ids already in the catalog are skipped.
 * Run:  node scripts/add-grocery-expansion.mjs   (add --dry to preview)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ITEMS = `${ROOT}data/items.json`;
const PRODUCTS = `${ROOT}data/products.json`;

/** Copied verbatim from expand-catalog.mjs / seed.mjs. */
const STORE_MULTIPLIERS = { freshco: 1.0, walmart: 0.93, nofrills: 0.96, metro: 1.07 };

function wobble(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = (h >>> 0) / 4294967296; // [0,1)
  return (u - 0.5) * 0.12;
}
const round2 = (n) => Math.round(n * 100) / 100;

function pricesFor(id, base) {
  const prices = {};
  for (const [storeId, mult] of Object.entries(STORE_MULTIPLIERS)) {
    prices[storeId] = round2(Math.max(0.5, base * (mult + wobble(`${id}:${storeId}`))));
  }
  return prices;
}

const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Row: [name, emoji, unit, size, base CAD, searchTerms]. id = slug(name).

/* ------------------------------------------------------------------ DAIRY */
const DAIRY = [
  // Eggs
  ["Medium Eggs", "🥚", "dozen", "12 ct", 4.29, ["medium eggs", "medium size eggs"]],
  ["Jumbo Eggs", "🥚", "dozen", "12 ct", 5.49, ["jumbo eggs", "jumbo size eggs"]],
  ["Large Eggs 18-Pack", "🥚", "carton", "18 ct", 6.99, ["18 eggs", "18 count eggs", "egg flat"]],
  ["Brown Eggs", "🥚", "dozen", "12 ct", 4.99, ["brown eggs", "brown shell eggs"]],
  ["Organic Eggs", "🥚", "dozen", "12 ct", 6.99, ["organic eggs", "certified organic eggs"]],
  ["Hard-Boiled Eggs", "🥚", "pack", "6 ct", 5.49, ["hard boiled eggs", "peeled eggs", "boiled eggs"]],
  // Butter and spreads
  ["Organic Butter", "🧈", "block", "454 g", 8.49, ["organic butter", "organic unsalted butter"]],
  ["European-Style Butter", "🧈", "block", "250 g", 5.99, ["european butter", "cultured butter", "irish butter"]],
  ["Garlic Butter", "🧈", "tub", "200 g", 4.49, ["garlic butter", "herb garlic butter"]],
  ["Soft Margarine Tub", "🧈", "tub", "850 g", 4.99, ["soft margarine", "tub margarine"]],
  ["Olive Oil Spread", "🧈", "tub", "425 g", 4.49, ["olive oil spread", "olive oil margarine"]],
  // Milk and milk alternatives
  ["Organic 2% Milk", "🥛", "carton", "2 L", 6.49, ["organic milk", "organic 2% milk"]],
  ["Organic Whole Milk", "🥛", "carton", "2 L", 6.49, ["organic whole milk", "organic homogenized milk"]],
  ["Bagged Milk", "🥛", "bag", "4 L", 6.19, ["bagged milk", "milk bags", "4 litre milk"]],
  ["Ultra-Filtered Milk", "🥛", "carton", "1.5 L", 5.49, ["ultra filtered milk", "high protein milk", "fairlife"]],
  ["A2 Milk", "🥛", "carton", "2 L", 6.99, ["a2 milk", "a2 protein milk"]],
  ["Goat Milk", "🥛", "carton", "1 L", 5.99, ["goat milk", "goats milk"]],
  ["Cashew Milk", "🥛", "carton", "1.89 L", 4.99, ["cashew milk", "cashew beverage"]],
  ["Pea Protein Milk", "🥛", "carton", "1.89 L", 5.49, ["pea milk", "pea protein milk", "ripple milk"]],
  ["Hemp Milk", "🥛", "carton", "1.89 L", 5.29, ["hemp milk", "hemp beverage"]],
  ["Barista Oat Milk", "🥛", "carton", "946 mL", 4.49, ["barista oat milk", "barista milk", "oat milk for coffee"]],
  ["Chocolate Almond Milk", "🥛", "carton", "1.89 L", 4.99, ["chocolate almond milk", "chocolate almond beverage"]],
  ["Half and Half Cream 18%", "🥛", "carton", "473 mL", 3.79, ["half and half", "18% cream", "half and half cream"]],
  ["Cooking Cream 15%", "🥛", "carton", "500 mL", 3.49, ["cooking cream", "15% cream", "light cooking cream"]],
  // Cultured, yogurts, desserts, dips
  ["Crème Fraîche", "🥛", "tub", "200 mL", 3.99, ["creme fraiche", "french sour cream"]],
  ["Quark", "🥛", "tub", "250 g", 4.49, ["quark", "quark cheese"]],
  ["Skyr", "🥛", "tub", "450 g", 4.99, ["skyr", "icelandic skyr", "icelandic yogurt"]],
  ["Vanilla Yogurt", "🥛", "tub", "650 g", 3.99, ["vanilla yogurt", "french vanilla yogurt"]],
  ["Strawberry Yogurt", "🥛", "tub", "650 g", 3.99, ["strawberry yogurt", "strawberry fruit yogurt"]],
  ["Balkan-Style Yogurt", "🥛", "tub", "650 g", 3.79, ["balkan yogurt", "balkan style yogurt", "creamy yogurt"]],
  ["Fat-Free Greek Yogurt", "🥛", "tub", "750 g", 5.29, ["fat free greek yogurt", "0% greek yogurt", "nonfat greek yogurt"]],
  ["Vanilla Greek Yogurt", "🥛", "tub", "650 g", 5.49, ["vanilla greek yogurt", "flavoured greek yogurt"]],
  ["High-Protein Yogurt", "🥛", "pack", "4x150 g", 5.99, ["high protein yogurt", "protein yogurt", "ratio yogurt"]],
  ["Probiotic Drink", "🥛", "pack", "5x65 mL", 5.49, ["probiotic drink", "yakult", "fermented milk drink"]],
  ["Mango Lassi", "🥛", "bottle", "500 mL", 3.99, ["mango lassi", "lassi", "indian yogurt drink"]],
  ["Rice Pudding", "🥛", "pack", "4x100 g", 4.29, ["rice pudding", "refrigerated rice pudding"]],
  ["Tzatziki", "🥛", "tub", "250 g", 4.29, ["tzatziki", "greek cucumber dip", "tzatziki dip"]],
  // Plant-based and lactose-free
  ["Vegan Cheese Shreds", "🧀", "bag", "220 g", 5.99, ["vegan cheese", "dairy free cheese", "plant based cheese shreds"]],
  ["Vegan Cream Cheese", "🧀", "tub", "227 g", 5.49, ["vegan cream cheese", "dairy free cream cheese", "plant based cream cheese"]],
  ["Lactose-Free Cream Cheese", "🧀", "tub", "227 g", 4.99, ["lactose free cream cheese", "lactose free spreadable cheese"]],
  // Creamers
  ["Oat Milk Creamer", "🥛", "carton", "946 mL", 5.29, ["oat creamer", "oat milk creamer", "plant based creamer"]],
  ["French Vanilla Creamer", "🥛", "carton", "946 mL", 4.99, ["french vanilla creamer", "vanilla creamer", "vanilla coffee creamer"]],
  ["Hazelnut Creamer", "🥛", "carton", "946 mL", 4.99, ["hazelnut creamer", "hazelnut coffee creamer"]],
  ["Sugar-Free Creamer", "🥛", "carton", "946 mL", 4.99, ["sugar free creamer", "zero sugar creamer"]],
  ["Single-Serve Creamers", "🥛", "box", "24 ct", 5.49, ["creamer cups", "single serve creamers", "creamer pods"]],
  // Cheese
  ["Mild Cheddar Cheese", "🧀", "block", "400 g", 6.99, ["mild cheddar", "mild cheddar cheese block"]],
  ["Medium Cheddar Cheese", "🧀", "block", "400 g", 6.99, ["medium cheddar", "medium cheddar cheese block"]],
  ["Old Cheddar Cheese", "🧀", "block", "400 g", 7.49, ["old cheddar", "aged cheddar", "sharp cheddar"]],
  ["Extra Old Cheddar Cheese", "🧀", "block", "400 g", 7.99, ["extra old cheddar", "extra sharp cheddar"]],
  ["White Cheddar Cheese", "🧀", "block", "400 g", 7.49, ["white cheddar", "white cheddar block"]],
  ["Shredded Cheddar", "🧀", "bag", "320 g", 6.49, ["shredded cheddar", "grated cheddar"]],
  ["Shredded Tex-Mex Cheese", "🧀", "bag", "320 g", 6.49, ["tex mex cheese", "shredded mexican cheese", "taco cheese"]],
  ["Shredded Four Cheese Blend", "🧀", "bag", "320 g", 6.49, ["four cheese blend", "shredded cheese blend", "pizza cheese"]],
  ["Bocconcini", "🧀", "tub", "200 g", 4.99, ["bocconcini", "fresh mozzarella", "mozzarella pearls"]],
  ["Burrata", "🧀", "pack", "2 ct", 6.99, ["burrata", "burrata cheese"]],
  ["Mascarpone", "🧀", "tub", "250 g", 4.99, ["mascarpone", "mascarpone cheese"]],
  ["Camembert", "🧀", "wheel", "125 g", 5.49, ["camembert", "camembert cheese"]],
  ["Asiago Cheese", "🧀", "wedge", "200 g", 5.99, ["asiago", "aged asiago"]],
  ["Gruyère Cheese", "🧀", "wedge", "200 g", 8.99, ["gruyere", "gruyere cheese"]],
  ["Manchego Cheese", "🧀", "wedge", "200 g", 8.99, ["manchego", "spanish sheep cheese"]],
  ["Halloumi", "🧀", "block", "200 g", 5.99, ["halloumi", "grilling cheese", "halloumi cheese"]],
  ["Pecorino Romano", "🧀", "wedge", "200 g", 8.49, ["pecorino", "pecorino romano", "romano cheese"]],
  ["Smoked Gouda", "🧀", "wedge", "200 g", 5.99, ["smoked gouda", "smoked cheese"]],
  ["Gorgonzola", "🧀", "wedge", "150 g", 5.99, ["gorgonzola", "gorgonzola cheese"]],
  ["Mini Wax Cheese Rounds", "🧀", "pack", "6 ct", 5.99, ["mini cheese rounds", "babybel", "wax cheese"]],
  ["Cheddar Slices", "🧀", "pack", "10 ct", 4.49, ["cheddar slices", "sliced cheddar"]],
  ["Sliced Mozzarella", "🧀", "pack", "10 ct", 4.99, ["sliced mozzarella", "mozzarella slices"]],
  ["Whipped Cream Cheese", "🧀", "tub", "227 g", 4.49, ["whipped cream cheese", "soft cream cheese"]],
  ["Crumbled Feta", "🧀", "tub", "200 g", 4.99, ["crumbled feta", "feta crumbles"]],
  ["Parmigiano Reggiano", "🧀", "wedge", "200 g", 9.99, ["parmigiano reggiano", "parmigiano", "parmesan wedge"]],
];

/* ---------------------------------------------------------------- PRODUCE */
const PRODUCE = [
  // Fruit gaps: apples
  ["McIntosh Apples", "🍎", "bag", "3 lb", 5.49, ["mcintosh apples", "macintosh apples", "mac apples"]],
  ["Fuji Apples", "🍎", "bag", "3 lb", 5.99, ["fuji apples", "fuji apple"]],
  ["Red Delicious Apples", "🍎", "bag", "3 lb", 5.49, ["red delicious apples", "red delicious"]],
  ["Golden Delicious Apples", "🍎", "bag", "3 lb", 5.49, ["golden delicious apples", "golden delicious"]],
  ["Pink Lady Apples", "🍎", "bag", "3 lb", 6.49, ["pink lady apples", "cripps pink apples"]],
  ["Ambrosia Apples", "🍎", "bag", "3 lb", 6.49, ["ambrosia apples", "ambrosia apple"]],
  ["Empire Apples", "🍎", "bag", "3 lb", 5.49, ["empire apples", "empire apple"]],
  ["Cosmic Crisp Apples", "🍎", "pack", "per lb", 2.99, ["cosmic crisp apples", "cosmic crisp"]],
  // Pears, citrus, grapes, tropical, stone fruit
  ["Bosc Pears", "🍐", "pack", "per lb", 2.29, ["bosc pears", "bosc pear"]],
  ["Anjou Pears", "🍐", "pack", "per lb", 2.29, ["anjou pears", "green anjou pears"]],
  ["Asian Pears", "🍐", "each", "1 ct", 1.99, ["asian pears", "nashi pear"]],
  ["Cara Cara Oranges", "🍊", "bag", "4 lb", 7.99, ["cara cara oranges", "pink navel oranges"]],
  ["Valencia Oranges", "🍊", "bag", "4 lb", 6.99, ["valencia oranges", "juicing oranges"]],
  ["Tangerines", "🍊", "bag", "2 lb", 4.99, ["tangerines", "tangerine"]],
  ["Meyer Lemons", "🍋", "pack", "per lb", 4.99, ["meyer lemons", "meyer lemon"]],
  ["Key Limes", "🍋", "bag", "454 g", 3.99, ["key limes", "key lime"]],
  ["Pomelo", "🍊", "each", "1 ct", 4.99, ["pomelo", "pummelo"]],
  ["Dragon Fruit", "🍈", "each", "1 ct", 4.49, ["dragon fruit", "pitaya", "pitahaya"]],
  ["Lychee", "🍒", "pack", "per lb", 8.99, ["lychee", "lychees", "fresh lychee"]],
  ["Guava", "🍈", "each", "1 ct", 1.99, ["fresh guava", "guava fruit"]],
  ["Whole Coconut", "🥥", "each", "1 ct", 3.49, ["whole coconut", "fresh coconut", "brown coconut"]],
  ["Apricots", "🍑", "pack", "per lb", 3.99, ["fresh apricots", "apricot fruit"]],
  ["Prune Plums", "🍑", "pack", "per lb", 3.49, ["prune plums", "italian plums"]],
  ["Black Grapes", "🍇", "bag", "2 lb", 5.99, ["black grapes", "black seedless grapes"]],
  ["Cotton Candy Grapes", "🍇", "bag", "2 lb", 7.99, ["cotton candy grapes", "sweet grapes"]],
  ["Pomegranate Arils", "🔴", "pack", "150 g", 4.99, ["pomegranate arils", "pomegranate seeds"]],
  ["Fresh Jackfruit", "🍈", "pack", "per lb", 2.99, ["jackfruit", "fresh jackfruit"]],
  ["Fresh Fruit Bowl", "🍓", "pack", "500 g", 6.99, ["fresh fruit bowl", "cut fruit", "fruit salad"]],
  ["Mini Bananas", "🍌", "bunch", "per lb", 1.29, ["mini bananas", "baby bananas", "lady finger bananas"]],
  ["Organic Bananas", "🍌", "bunch", "per lb", 0.99, ["organic bananas", "organic banana"]],
  ["Ataulfo Mango", "🥭", "each", "1 ct", 1.99, ["ataulfo mango", "honey mango", "champagne mango"]],
  // Lettuce and leafy greens, sprouts
  ["Butter Lettuce", "🥬", "each", "1 ct", 3.49, ["butter lettuce", "boston lettuce", "bibb lettuce"]],
  ["Green Leaf Lettuce", "🥬", "each", "1 ct", 2.49, ["green leaf lettuce", "leaf lettuce"]],
  ["Red Leaf Lettuce", "🥬", "each", "1 ct", 2.49, ["red leaf lettuce", "red lettuce"]],
  ["Romaine Hearts", "🥬", "pack", "3 ct", 4.49, ["romaine hearts", "hearts of romaine"]],
  ["Baby Kale", "🥬", "bag", "142 g", 3.99, ["baby kale", "baby kale greens"]],
  ["Lacinato Kale", "🥬", "bunch", "1 ct", 3.29, ["lacinato kale", "dinosaur kale", "tuscan kale"]],
  ["Mustard Greens", "🥬", "bunch", "1 ct", 2.99, ["mustard greens", "fresh mustard greens"]],
  ["Dandelion Greens", "🥬", "bunch", "1 ct", 3.49, ["dandelion greens", "dandelion leaves"]],
  ["Escarole", "🥬", "each", "1 ct", 2.99, ["escarole", "batavian endive"]],
  ["Frisée", "🥬", "each", "1 ct", 3.99, ["frisee", "curly endive"]],
  ["Choy Sum", "🥬", "bunch", "per lb", 2.49, ["choy sum", "chinese flowering cabbage"]],
  ["Gai Lan", "🥬", "bunch", "per lb", 2.99, ["gai lan", "chinese broccoli", "kai lan"]],
  ["Shredded Lettuce", "🥬", "bag", "227 g", 3.29, ["shredded lettuce", "taco lettuce"]],
  ["Microgreens", "🌱", "pack", "50 g", 3.99, ["microgreens", "micro greens"]],
  ["Alfalfa Sprouts", "🌱", "pack", "125 g", 2.99, ["alfalfa sprouts", "sandwich sprouts"]],
  ["Pea Shoots", "🌱", "pack", "100 g", 3.99, ["pea shoots", "pea sprouts"]],
  // Mushrooms
  ["Shiitake Mushrooms", "🍄", "pack", "227 g", 4.99, ["shiitake mushrooms", "shiitake"]],
  ["Oyster Mushrooms", "🍄", "pack", "227 g", 4.99, ["oyster mushrooms", "pearl oyster mushrooms"]],
  ["Enoki Mushrooms", "🍄", "pack", "200 g", 2.99, ["enoki mushrooms", "enoki"]],
  ["Sliced White Mushrooms", "🍄", "pack", "227 g", 3.49, ["sliced mushrooms", "sliced white mushrooms"]],
  ["Mushroom Medley", "🍄", "pack", "227 g", 4.99, ["mushroom medley", "mixed mushrooms", "gourmet mushrooms"]],
  // Cabbage family, cut veg, kits
  ["Savoy Cabbage", "🥬", "each", "per lb", 1.29, ["savoy cabbage", "curly cabbage"]],
  ["Coleslaw Mix", "🥬", "bag", "397 g", 3.29, ["coleslaw mix", "shredded cabbage mix"]],
  ["Shredded Carrots", "🥕", "bag", "300 g", 2.49, ["shredded carrots", "grated carrots"]],
  ["Broccoli Slaw", "🥦", "bag", "340 g", 3.49, ["broccoli slaw", "broccoli salad mix"]],
  ["Cauliflower Florets", "🥦", "pack", "400 g", 4.49, ["cauliflower florets", "cut cauliflower"]],
  ["Fresh Cauliflower Rice", "🥦", "bag", "340 g", 3.99, ["cauliflower rice", "riced cauliflower"]],
  ["Zucchini Noodles", "🥒", "pack", "255 g", 4.49, ["zucchini noodles", "zoodles", "spiralized zucchini"]],
  ["Cubed Butternut Squash", "🎃", "pack", "400 g", 4.99, ["cubed butternut squash", "cut butternut squash", "butternut squash cubes"]],
  ["Romanesco", "🥦", "each", "1 ct", 4.99, ["romanesco", "romanesco cauliflower"]],
  ["Vegetable Tray", "🥕", "each", "1 ct", 12.99, ["vegetable tray", "veggie tray", "veggie platter"]],
  ["Stir-Fry Vegetable Kit", "🥕", "kit", "400 g", 5.49, ["fresh stir fry kit", "stir fry veggie kit"]],
  ["Kale Salad Kit", "🥬", "kit", "300 g", 5.49, ["kale salad kit", "kale caesar kit"]],
  ["Southwest Salad Kit", "🥬", "kit", "340 g", 5.49, ["southwest salad kit", "southwest chopped salad"]],
  ["Asian Salad Kit", "🥬", "kit", "340 g", 5.49, ["asian salad kit", "sesame ginger salad kit"]],
  ["Spinach Salad Kit", "🥬", "kit", "300 g", 5.29, ["spinach salad kit", "spinach bacon salad kit"]],
  // Roots, tubers, alliums
  ["Yukon Gold Potatoes", "🥔", "bag", "5 lb", 6.49, ["yukon gold potatoes", "yukon gold", "yellow potatoes"]],
  ["Red Potatoes", "🥔", "bag", "3 lb", 4.99, ["red potatoes", "red skin potatoes"]],
  ["White Potatoes", "🥔", "bag", "10 lb", 7.99, ["white potatoes", "10 lb potatoes"]],
  ["Fingerling Potatoes", "🥔", "pack", "680 g", 4.99, ["fingerling potatoes", "fingerlings"]],
  ["Japanese Sweet Potato", "🍠", "each", "per lb", 2.49, ["japanese sweet potato", "white sweet potato"]],
  ["Taro Root", "🥔", "each", "per lb", 2.99, ["taro root", "taro"]],
  ["Cassava", "🥔", "each", "per lb", 1.99, ["cassava", "yuca", "cassava root"]],
  ["Lotus Root", "🥔", "each", "per lb", 5.99, ["lotus root", "renkon"]],
  ["Sunchokes", "🥔", "pack", "per lb", 4.99, ["sunchokes", "jerusalem artichoke"]],
  ["Watermelon Radish", "🥕", "each", "per lb", 3.49, ["watermelon radish", "red meat radish"]],
  ["Rainbow Carrots", "🥕", "bag", "454 g", 3.99, ["rainbow carrots", "heirloom carrots"]],
  ["Golden Beets", "🍠", "bunch", "1 ct", 3.49, ["golden beets", "yellow beets"]],
  ["Galangal", "🌿", "each", "per lb", 7.99, ["galangal", "fresh galangal"]],
  ["Cooking Onions", "🧅", "bag", "3 lb", 3.99, ["cooking onions", "3 lb onions", "onion bag"]],
  ["Cipollini Onions", "🧅", "pack", "400 g", 3.99, ["cipollini onions", "cipollini"]],
  ["Peeled Garlic", "🧄", "pack", "100 g", 2.99, ["peeled garlic", "peeled garlic pack"]],
  ["Black Garlic", "🧄", "pack", "60 g", 5.99, ["black garlic", "fermented garlic"]],
  ["Chinese Chives", "🌿", "bunch", "1 ct", 2.49, ["chinese chives", "garlic chives"]],
  // Peppers
  ["Orange Bell Pepper", "🫑", "each", "1 ct", 1.99, ["orange pepper", "orange bell pepper"]],
  ["Mini Sweet Peppers", "🫑", "bag", "340 g", 3.99, ["mini sweet peppers", "snack peppers", "baby sweet peppers"]],
  ["Bell Pepper Trio", "🫑", "pack", "3 ct", 4.99, ["tri colour peppers", "3 pack peppers", "bell pepper trio"]],
  ["Banana Peppers", "🌶️", "pack", "per lb", 3.49, ["banana peppers", "hungarian wax peppers"]],
  ["Poblano Peppers", "🌶️", "pack", "per lb", 3.99, ["poblano peppers", "poblano", "pasilla peppers"]],
  ["Serrano Peppers", "🌶️", "pack", "per lb", 4.99, ["serrano peppers", "serrano"]],
  ["Habanero Peppers", "🌶️", "pack", "per lb", 6.99, ["habanero peppers", "habanero"]],
  ["Scotch Bonnet Peppers", "🌶️", "pack", "per lb", 6.99, ["scotch bonnet peppers", "scotch bonnet"]],
  ["Anaheim Peppers", "🌶️", "pack", "per lb", 3.99, ["anaheim peppers", "anaheim chili"]],
  ["Fresno Peppers", "🌶️", "pack", "per lb", 4.99, ["fresno peppers", "fresno chili"]],
  ["Shishito Peppers", "🌶️", "pack", "170 g", 3.99, ["shishito peppers", "shishito"]],
  ["Cubanelle Peppers", "🌶️", "pack", "per lb", 3.49, ["cubanelle peppers", "italian frying peppers"]],
  // Tomatoes
  ["Beefsteak Tomatoes", "🍅", "pack", "per lb", 2.99, ["beefsteak tomatoes", "beefsteak tomato"]],
  ["Tomatoes on the Vine", "🍅", "pack", "per lb", 3.49, ["vine tomatoes", "tomatoes on the vine", "vine ripened tomatoes"]],
  ["Grape Tomatoes", "🍅", "pack", "300 g", 3.99, ["grape tomatoes", "grape tomato"]],
  ["Heirloom Tomatoes", "🍅", "pack", "per lb", 5.99, ["heirloom tomatoes", "heirloom tomato"]],
  ["Campari Tomatoes", "🍅", "pack", "454 g", 4.49, ["campari tomatoes", "cocktail tomatoes"]],
  ["Tomatillos", "🍅", "pack", "per lb", 2.99, ["tomatillos", "tomatillo", "husk tomatoes"]],
  // Squash, gourds, pods and other veg
  ["Kabocha Squash", "🎃", "each", "per lb", 1.99, ["kabocha squash", "kabocha", "japanese pumpkin"]],
  ["Delicata Squash", "🎃", "each", "per lb", 2.49, ["delicata squash", "delicata", "sweet potato squash"]],
  ["Buttercup Squash", "🎃", "each", "per lb", 1.99, ["buttercup squash", "buttercup"]],
  ["Pie Pumpkin", "🎃", "each", "1 ct", 4.99, ["pie pumpkin", "sugar pumpkin", "cooking pumpkin"]],
  ["Pickling Cucumbers", "🥒", "pack", "per lb", 2.99, ["pickling cucumbers", "kirby cucumbers"]],
  ["Bitter Melon", "🥒", "each", "per lb", 3.99, ["bitter melon", "bitter gourd", "karela"]],
  ["Long Beans", "🫛", "bunch", "340 g", 3.99, ["long beans", "yardlong beans", "snake beans"]],
  ["Fava Beans", "🫛", "pack", "per lb", 4.99, ["fava beans", "broad beans"]],
  ["Baby Corn", "🌽", "pack", "227 g", 3.49, ["baby corn", "fresh baby corn"]],
  ["Nopales", "🌵", "pack", "454 g", 3.49, ["nopales", "cactus paddles", "nopal"]],
  ["Chinese Eggplant", "🍆", "each", "per lb", 2.99, ["chinese eggplant", "asian eggplant", "japanese eggplant"]],
  ["Celery Hearts", "🥬", "pack", "2 ct", 3.99, ["celery hearts", "celery heart"]],
  ["White Asparagus", "🌱", "pack", "454 g", 7.99, ["white asparagus", "white asparagus spears"]],
  // Herbs
  ["Fresh Sage", "🌿", "pack", "15 g", 2.49, ["fresh sage", "sage leaves"]],
  ["Fresh Oregano", "🌿", "pack", "15 g", 2.49, ["fresh oregano", "oregano leaves"]],
  ["Fresh Curry Leaves", "🌿", "pack", "20 g", 2.99, ["curry leaves", "fresh curry leaves"]],
  ["Kaffir Lime Leaves", "🌿", "pack", "20 g", 3.49, ["kaffir lime leaves", "makrut lime leaves", "lime leaves"]],
];

/* ----------------------------------------------------------------- FROZEN */
const FROZEN = [
  // Vegetables
  ["Frozen Cauliflower Florets", "🥦", "bag", "750 g", 3.99, ["frozen cauliflower", "cauliflower florets frozen"]],
  ["Frozen Brussels Sprouts", "🥬", "bag", "750 g", 4.29, ["frozen brussels sprouts", "frozen sprouts"]],
  ["Frozen Sliced Carrots", "🥕", "bag", "750 g", 2.99, ["frozen carrots", "frozen sliced carrots"]],
  ["Frozen Asparagus Spears", "🌱", "bag", "340 g", 4.49, ["frozen asparagus", "frozen asparagus spears"]],
  ["Frozen Corn on the Cob", "🌽", "bag", "6 ct", 5.99, ["frozen corn on the cob", "frozen corn cobs"]],
  ["Frozen Pepper and Onion Strips", "🫑", "bag", "500 g", 3.99, ["frozen peppers and onions", "frozen fajita vegetables"]],
  ["Frozen Chopped Onions", "🧅", "bag", "500 g", 2.99, ["frozen chopped onions", "frozen diced onions"]],
  ["Frozen Okra", "🥒", "bag", "340 g", 3.49, ["frozen okra", "frozen cut okra"]],
  ["Frozen Butternut Squash Cubes", "🎃", "bag", "600 g", 3.99, ["frozen butternut squash", "frozen squash cubes"]],
  ["Frozen Sweet Potato Fries", "🍟", "bag", "650 g", 4.99, ["sweet potato fries", "frozen sweet potato fries"]],
  ["Frozen Cauliflower Rice", "🥦", "bag", "340 g", 3.49, ["frozen cauliflower rice", "frozen riced cauliflower"]],
  ["Frozen Peas and Carrots", "🫛", "bag", "750 g", 2.99, ["peas and carrots", "frozen peas and carrots"]],
  ["Frozen California Blend", "🥦", "bag", "750 g", 3.49, ["california blend", "frozen california vegetables"]],
  ["Frozen Kale", "🥬", "bag", "300 g", 3.49, ["frozen kale", "frozen chopped kale"]],
  ["Frozen Sliced Mushrooms", "🍄", "bag", "300 g", 3.99, ["frozen mushrooms", "frozen sliced mushrooms"]],
  ["Frozen Roasted Vegetable Medley", "🥕", "bag", "500 g", 4.49, ["frozen roasted vegetables", "roasted vegetable medley"]],
  ["Frozen Potato Wedges", "🥔", "bag", "750 g", 4.49, ["potato wedges", "frozen wedges"]],
  ["Frozen Crinkle-Cut Fries", "🍟", "bag", "1 kg", 4.49, ["crinkle cut fries", "crinkle fries"]],
  ["Frozen Waffle Fries", "🍟", "bag", "750 g", 4.99, ["waffle fries", "frozen waffle fries"]],
  ["Frozen Hash Brown Patties", "🥔", "box", "8 ct", 3.99, ["hash brown patties", "frozen hash brown patties"]],
  ["Frozen Diced Hash Browns", "🥔", "bag", "907 g", 3.99, ["diced hash browns", "southern style hash browns", "cubed hash browns"]],
  ["Frozen Petite Peas", "🫛", "bag", "750 g", 3.49, ["petite peas", "baby peas"]],
  ["Frozen Shelled Edamame", "🫛", "bag", "350 g", 4.49, ["shelled edamame", "edamame beans"]],
  // Fruit
  ["Frozen Strawberries", "🍓", "bag", "600 g", 5.99, ["frozen strawberries", "strawberries frozen"]],
  ["Frozen Blueberries", "🫐", "bag", "600 g", 6.49, ["frozen blueberries", "blueberries frozen"]],
  ["Frozen Wild Blueberries", "🫐", "bag", "600 g", 6.99, ["frozen wild blueberries", "wild blueberries"]],
  ["Frozen Raspberries", "🍓", "bag", "600 g", 7.49, ["frozen raspberries", "raspberries frozen"]],
  ["Frozen Blackberries", "🫐", "bag", "600 g", 7.49, ["frozen blackberries", "blackberries frozen"]],
  ["Frozen Cherries", "🍒", "bag", "600 g", 6.99, ["frozen cherries", "frozen dark cherries"]],
  ["Frozen Peaches", "🍑", "bag", "600 g", 5.49, ["frozen peaches", "frozen peach slices"]],
  ["Frozen Avocado Chunks", "🥑", "bag", "500 g", 6.49, ["frozen avocado", "frozen avocado chunks"]],
  ["Frozen Acai Packs", "🫐", "pack", "4x100 g", 6.99, ["acai packs", "frozen acai", "acai puree"]],
  ["Frozen Smoothie Blend", "🍓", "bag", "600 g", 5.99, ["smoothie blend", "frozen smoothie mix", "smoothie fruit mix"]],
  ["Frozen Tropical Fruit Blend", "🍍", "bag", "600 g", 5.99, ["tropical fruit blend", "frozen tropical fruit"]],
  ["Frozen Fruit Bars", "🍧", "box", "6 ct", 4.99, ["fruit bars", "frozen fruit bars", "fruit ice pops"]],
  // Meals and appetizers
  ["Chicken Tikka Masala", "🍛", "box", "400 g", 6.49, ["chicken tikka masala", "frozen tikka masala"]],
  ["Palak Paneer", "🍛", "box", "340 g", 5.99, ["palak paneer", "frozen palak paneer"]],
  ["Chana Masala", "🍛", "box", "340 g", 4.99, ["chana masala", "frozen chana masala"]],
  ["Chicken Biryani", "🍛", "box", "350 g", 5.99, ["chicken biryani", "frozen biryani"]],
  ["Vegetable Lasagna", "🍝", "box", "900 g", 8.99, ["vegetable lasagna", "veggie lasagna"]],
  ["Fettuccine Alfredo", "🍝", "box", "1 ct", 5.99, ["fettuccine alfredo", "frozen fettuccine alfredo"]],
  ["Spaghetti and Meatballs", "🍝", "box", "1 ct", 5.99, ["spaghetti and meatballs", "frozen spaghetti meatballs"]],
  ["Cheese Tortellini", "🍝", "bag", "350 g", 6.49, ["tortellini", "cheese tortellini"]],
  ["Stuffed Shells", "🍝", "box", "700 g", 8.99, ["stuffed shells", "frozen stuffed shells"]],
  ["Chicken Fried Rice", "🍚", "bag", "700 g", 5.49, ["chicken fried rice", "frozen fried rice"]],
  ["General Tao Chicken", "🍗", "box", "600 g", 8.99, ["general tao chicken", "general tso chicken"]],
  ["Sweet and Sour Chicken Balls", "🍗", "box", "600 g", 7.99, ["sweet and sour chicken", "chicken balls"]],
  ["Orange Chicken", "🍗", "box", "700 g", 9.99, ["orange chicken", "frozen orange chicken"]],
  ["Teriyaki Chicken Bowl", "🍱", "box", "1 ct", 5.99, ["teriyaki chicken bowl", "teriyaki bowl"]],
  ["Burrito Bowl", "🍱", "box", "1 ct", 5.99, ["burrito bowl", "frozen burrito bowl"]],
  ["Enchiladas", "🌯", "box", "2 ct", 6.49, ["enchiladas", "frozen enchiladas", "chicken enchiladas"]],
  ["Tamales", "🌽", "box", "6 ct", 8.99, ["tamales", "frozen tamales"]],
  ["Quesadillas", "🌮", "box", "4 ct", 6.99, ["quesadillas", "frozen quesadillas"]],
  ["Taquitos", "🌮", "box", "12 ct", 6.99, ["taquitos", "frozen taquitos", "rolled tacos"]],
  ["Egg Rolls", "🥟", "box", "6 ct", 5.99, ["egg rolls", "frozen egg rolls"]],
  ["Wontons", "🥟", "bag", "400 g", 6.99, ["wontons", "frozen wontons", "pork wontons"]],
  ["Jamaican Beef Patties", "🥟", "box", "4 ct", 6.99, ["jamaican patties", "jamaican beef patties"]],
  ["Cabbage Rolls", "🥬", "box", "900 g", 9.99, ["cabbage rolls", "frozen cabbage rolls"]],
  ["Salisbury Steak Dinner", "🍽️", "box", "1 ct", 4.99, ["salisbury steak", "salisbury steak dinner"]],
  ["Frozen Chili", "🍲", "box", "500 g", 5.49, ["frozen chili", "frozen chili con carne"]],
  ["Spanakopita", "🥧", "box", "12 ct", 8.99, ["spanakopita", "spinach pie"]],
  ["Pigs in a Blanket", "🌭", "box", "24 ct", 8.49, ["pigs in a blanket", "mini cocktail wieners"]],
  ["Popcorn Chicken", "🍗", "bag", "800 g", 10.99, ["popcorn chicken", "frozen popcorn chicken"]],
  ["Breaded Chicken Cutlets", "🍗", "box", "800 g", 11.99, ["breaded chicken cutlets", "chicken cutlets", "chicken schnitzel"]],
  ["Boneless Chicken Wings", "🍗", "bag", "800 g", 11.99, ["boneless wings", "boneless chicken wings"]],
  ["Veggie Dogs", "🌭", "box", "6 ct", 5.49, ["veggie dogs", "vegetarian hot dogs"]],
  ["Plant-Based Nuggets", "🍗", "box", "300 g", 6.49, ["plant based nuggets", "veggie nuggets", "meatless nuggets"]],
  ["Plant-Based Ground Round", "🥩", "box", "340 g", 6.99, ["plant based ground", "meatless crumbles", "veggie ground round"]],
  // Pizza
  ["Frozen Pepperoni Pizza", "🍕", "each", "1 ct", 6.99, ["pepperoni pizza", "frozen pepperoni pizza"]],
  ["Frozen Cheese Pizza", "🍕", "each", "1 ct", 5.99, ["cheese pizza", "frozen cheese pizza"]],
  ["Frozen Margherita Pizza", "🍕", "each", "1 ct", 7.49, ["margherita pizza", "frozen margherita pizza"]],
  ["Frozen Hawaiian Pizza", "🍕", "each", "1 ct", 6.99, ["hawaiian pizza", "frozen hawaiian pizza"]],
  ["Frozen Supreme Pizza", "🍕", "each", "1 ct", 7.49, ["supreme pizza", "meat lovers pizza"]],
  ["Frozen Thin Crust Pizza", "🍕", "each", "1 ct", 7.49, ["thin crust pizza", "frozen thin crust pizza"]],
  ["Frozen Personal Pizzas", "🍕", "box", "2 ct", 6.49, ["personal pizza", "mini pizza", "frozen personal pizzas"]],
  ["Pizza Bagels", "🍕", "box", "9 ct", 5.99, ["pizza bagels", "bagel pizza"]],
  ["Frozen Cauliflower Crust Pizza", "🍕", "each", "1 ct", 9.99, ["cauliflower crust pizza", "cauliflower pizza"]],
  ["Frozen Gluten-Free Pizza", "🍕", "each", "1 ct", 9.99, ["gluten free pizza", "frozen gluten free pizza"]],
  // Ice cream and desserts
  ["Chocolate Ice Cream", "🍨", "tub", "1.5 L", 6.49, ["chocolate ice cream", "chocolate ice cream tub"]],
  ["Strawberry Ice Cream", "🍨", "tub", "1.5 L", 6.49, ["strawberry ice cream", "strawberry ice cream tub"]],
  ["Neapolitan Ice Cream", "🍨", "tub", "1.5 L", 6.49, ["neapolitan ice cream", "neapolitan"]],
  ["Cookies and Cream Ice Cream", "🍨", "tub", "1.5 L", 6.99, ["cookies and cream ice cream", "cookies n cream"]],
  ["Mint Chip Ice Cream", "🍨", "tub", "1.5 L", 6.99, ["mint chip ice cream", "mint chocolate chip ice cream"]],
  ["Maple Walnut Ice Cream", "🍨", "tub", "1.5 L", 6.99, ["maple walnut ice cream", "maple ice cream"]],
  ["Gelato", "🍨", "tub", "500 mL", 7.49, ["gelato", "italian gelato"]],
  ["Dairy-Free Frozen Dessert", "🍨", "tub", "500 mL", 7.99, ["dairy free ice cream", "non dairy ice cream", "oat milk ice cream"]],
  ["Ice Cream Bars", "🍦", "box", "6 ct", 6.49, ["ice cream bars", "chocolate coated ice cream bars"]],
  ["Frozen Yogurt Bars", "🍦", "box", "6 ct", 5.99, ["frozen yogurt bars", "frozen yogurt pops"]],
  ["Fudge Bars", "🍫", "box", "12 ct", 5.99, ["fudge bars", "fudgesicles"]],
  ["Ice Cream Cake", "🎂", "each", "1 ct", 17.99, ["ice cream cake", "frozen ice cream cake"]],
  ["Frozen Pumpkin Pie", "🥧", "each", "1 ct", 6.99, ["pumpkin pie", "frozen pumpkin pie"]],
  ["Chocolate Lava Cakes", "🍰", "box", "2 ct", 6.99, ["chocolate lava cake", "molten lava cake"]],
  ["Frozen Churros", "🍩", "box", "20 ct", 7.99, ["churros", "frozen churros"]],
  // Breakfast
  ["French Toast Sticks", "🍞", "box", "12 ct", 5.49, ["french toast sticks", "frozen french toast"]],
  ["Egg Bites", "🥚", "box", "4 ct", 6.99, ["egg bites", "frozen egg bites"]],
  ["Blueberry Waffles", "🧇", "box", "8 ct", 4.99, ["blueberry waffles", "frozen blueberry waffles"]],
  ["Bagel Bites", "🥯", "box", "9 ct", 5.99, ["bagel bites", "mini pizza bagels"]],
  // Seafood
  ["Frozen Salmon Fillets", "🐟", "bag", "600 g", 12.99, ["frozen salmon fillets", "frozen salmon"]],
  ["Frozen Tilapia Fillets", "🐟", "bag", "700 g", 9.99, ["frozen tilapia", "frozen tilapia fillets"]],
  ["Frozen Cod Fillets", "🐟", "bag", "600 g", 11.99, ["frozen cod", "frozen cod fillets"]],
  ["Frozen Basa Fillets", "🐟", "bag", "800 g", 8.99, ["basa fillets", "swai fillets", "frozen basa"]],
  ["Frozen Scallops", "🐚", "bag", "400 g", 13.99, ["frozen scallops", "frozen sea scallops"]],
  ["Frozen Cooked Shrimp", "🍤", "bag", "400 g", 9.99, ["cooked shrimp", "frozen cooked shrimp"]],
  ["Frozen Jumbo Shrimp Tail-On", "🍤", "bag", "454 g", 11.99, ["tail on shrimp", "jumbo shrimp", "frozen jumbo shrimp"]],
  ["Frozen Squid Rings", "🦑", "bag", "400 g", 8.99, ["squid rings", "frozen calamari rings"]],
  ["Imitation Crab", "🦀", "pack", "227 g", 4.49, ["imitation crab", "surimi", "crab sticks"]],
  ["Frozen Ahi Tuna Steaks", "🐟", "box", "340 g", 11.99, ["tuna steaks", "frozen tuna steaks", "ahi tuna"]],
  ["Coconut Shrimp", "🍤", "box", "300 g", 9.99, ["coconut shrimp", "breaded coconut shrimp"]],
  ["Crab Cakes", "🦀", "box", "4 ct", 9.99, ["crab cakes", "frozen crab cakes"]],
  ["Salmon Burgers", "🐟", "box", "4 ct", 9.99, ["salmon burgers", "salmon patties"]],
];

/* ----------------------------------------------------- PANTRY (canned, jarred) */
const PANTRY = [
  // Tomatoes and canned vegetables
  ["Whole Peeled Tomatoes", "🍅", "can", "796 mL", 3.29, ["whole tomatoes", "whole peeled tomatoes", "canned whole tomatoes"]],
  ["Stewed Tomatoes", "🍅", "can", "398 mL", 2.29, ["stewed tomatoes", "canned stewed tomatoes"]],
  ["San Marzano Tomatoes", "🍅", "can", "796 mL", 4.99, ["san marzano tomatoes", "san marzano"]],
  ["Fire-Roasted Diced Tomatoes", "🍅", "can", "398 mL", 2.49, ["fire roasted tomatoes", "fire roasted diced tomatoes"]],
  ["Diced Tomatoes with Green Chilies", "🍅", "can", "298 mL", 1.99, ["tomatoes with green chilies", "rotel tomatoes"]],
  ["Passata", "🍅", "jar", "680 mL", 3.49, ["passata", "strained tomatoes", "tomato passata"]],
  ["Tomato Puree", "🍅", "can", "398 mL", 1.99, ["tomato puree", "canned tomato puree"]],
  ["Canned Tomato Sauce", "🍅", "can", "213 mL", 1.19, ["canned tomato sauce", "plain tomato sauce"]],
  ["Sun-Dried Tomatoes", "🍅", "jar", "270 mL", 5.99, ["sun dried tomatoes", "sundried tomatoes"]],
  ["Cream-Style Corn", "🌽", "can", "398 mL", 1.99, ["cream style corn", "creamed corn"]],
  ["Canned Sliced Carrots", "🥕", "can", "398 mL", 1.69, ["canned carrots", "canned sliced carrots"]],
  ["Canned Artichoke Hearts", "🥫", "can", "398 mL", 3.79, ["canned artichoke hearts", "artichoke hearts"]],
  ["Marinated Artichoke Hearts", "🥫", "jar", "340 mL", 5.49, ["marinated artichoke hearts", "marinated artichokes"]],
  ["Canned Water Chestnuts", "🥫", "can", "227 mL", 1.99, ["water chestnuts", "canned water chestnuts"]],
  ["Canned Bamboo Shoots", "🥫", "can", "227 mL", 1.99, ["bamboo shoots", "canned bamboo shoots"]],
  ["Sauerkraut", "🥬", "jar", "750 mL", 3.99, ["sauerkraut", "fermented cabbage"]],
  ["Canned Young Jackfruit", "🥫", "can", "565 g", 3.49, ["young green jackfruit", "canned jackfruit"]],
  ["Roasted Red Peppers", "🫑", "jar", "340 mL", 3.99, ["roasted red peppers", "jarred red peppers"]],
  ["Pickled Jalapeño Slices", "🌶️", "jar", "375 mL", 2.99, ["pickled jalapenos", "nacho jalapenos", "jalapeno slices"]],
  ["Pepperoncini", "🌶️", "jar", "340 mL", 3.49, ["pepperoncini", "pickled pepperoncini"]],
  // Canned beans and pulses
  ["Canned Navy Beans", "🫘", "can", "540 mL", 1.79, ["navy beans", "white pea beans"]],
  ["Canned Cannellini Beans", "🫘", "can", "540 mL", 1.79, ["cannellini beans", "white kidney beans"]],
  ["Canned Pinto Beans", "🫘", "can", "540 mL", 1.79, ["pinto beans", "canned pinto beans"]],
  ["Canned Lima Beans", "🫘", "can", "398 mL", 1.99, ["butter beans", "canned lima beans"]],
  ["Canned Black-Eyed Peas", "🫘", "can", "540 mL", 1.79, ["black eyed peas", "canned black eyed peas"]],
  ["Canned Hominy", "🌽", "can", "425 mL", 2.29, ["hominy", "canned hominy", "white hominy"]],
  ["Pork and Beans", "🫘", "can", "398 mL", 1.79, ["pork and beans", "beans and pork"]],
  ["Maple Baked Beans", "🫘", "can", "398 mL", 1.99, ["maple baked beans", "baked beans in maple syrup"]],
  ["Refried Black Beans", "🫘", "can", "398 mL", 2.29, ["refried black beans", "black refried beans"]],
  // Canned fish, meat and meals
  ["Light Tuna in Oil", "🐟", "can", "170 g", 2.49, ["tuna in oil", "light tuna in oil"]],
  ["Solid White Albacore Tuna", "🐟", "can", "170 g", 3.29, ["albacore tuna", "solid white tuna"]],
  ["Tuna Pouch", "🐟", "pouch", "85 g", 2.29, ["tuna pouch", "flavoured tuna pouch", "tuna packets"]],
  ["Canned Sockeye Salmon", "🐟", "can", "213 g", 5.99, ["sockeye salmon canned", "red salmon canned"]],
  ["Canned Clams", "🐚", "can", "142 g", 2.99, ["canned clams", "baby clams"]],
  ["Canned Crab Meat", "🦀", "can", "120 g", 5.49, ["canned crab", "canned crab meat"]],
  ["Anchovy Fillets", "🐟", "tin", "50 g", 3.29, ["anchovies", "anchovy fillets", "canned anchovies"]],
  ["Corned Beef", "🥫", "can", "340 g", 4.49, ["corned beef", "canned corned beef", "bully beef"]],
  ["Luncheon Meat", "🥫", "can", "340 g", 4.49, ["luncheon meat", "spam", "canned luncheon meat"]],
  ["Canned Chili", "🥫", "can", "425 g", 3.29, ["canned chili", "chili con carne"]],
  ["Canned Beef Stew", "🥫", "can", "680 g", 4.29, ["beef stew", "canned beef stew"]],
  ["Canned Pasta in Tomato Sauce", "🥫", "can", "398 mL", 1.99, ["canned pasta", "spaghettios", "canned spaghetti"]],
  // Canned fruit and fruit fillings
  ["Canned Pears", "🍐", "can", "398 mL", 2.29, ["canned pears", "pear halves"]],
  ["Canned Mandarin Oranges", "🍊", "can", "284 mL", 1.79, ["mandarin oranges", "canned mandarins"]],
  ["Mango Pulp", "🥭", "can", "850 g", 5.49, ["mango pulp", "alphonso mango pulp"]],
  ["Crushed Pineapple", "🍍", "can", "398 mL", 1.99, ["crushed pineapple", "canned crushed pineapple"]],
  ["Cranberry Sauce", "🔴", "can", "348 mL", 2.49, ["cranberry sauce", "jellied cranberry sauce"]],
  ["Pumpkin Pie Filling", "🎃", "can", "796 mL", 3.99, ["pumpkin pie filling", "pumpkin pie mix"]],
  ["Blueberry Pie Filling", "🫐", "can", "540 mL", 4.49, ["blueberry pie filling", "blueberry filling"]],
  // Soups and broths
  ["Cream of Mushroom Soup", "🍲", "can", "284 mL", 1.99, ["cream of mushroom soup", "mushroom soup"]],
  ["Cream of Chicken Soup", "🍲", "can", "284 mL", 1.99, ["cream of chicken soup", "condensed chicken soup"]],
  ["Clam Chowder", "🍲", "can", "540 mL", 2.99, ["clam chowder", "new england clam chowder"]],
  ["Minestrone Soup", "🍲", "can", "540 mL", 2.79, ["minestrone", "minestrone soup"]],
  ["Split Pea Soup", "🍲", "can", "540 mL", 2.79, ["split pea soup", "pea and ham soup"]],
  ["Lentil Soup", "🍲", "can", "540 mL", 2.79, ["lentil soup", "canned lentil soup"]],
  ["Butternut Squash Soup", "🍲", "carton", "500 mL", 3.49, ["butternut squash soup", "squash soup"]],
  ["French Onion Soup", "🍲", "can", "540 mL", 2.79, ["french onion soup", "onion soup"]],
  ["Tomato Basil Soup", "🍲", "carton", "900 mL", 3.99, ["tomato basil soup", "boxed tomato soup"]],
  ["Instant Miso Soup", "🍲", "box", "6 ct", 4.99, ["instant miso soup", "miso soup packets"]],
  ["Onion Soup Mix", "🍲", "packet", "43 g", 1.99, ["onion soup mix", "dry onion soup mix"]],
  ["Bone Broth", "🍲", "carton", "946 mL", 6.99, ["bone broth", "chicken bone broth", "beef bone broth"]],
  ["Chicken Soup Base", "🍲", "jar", "227 g", 6.99, ["chicken soup base", "chicken base", "stock concentrate"]],
  ["Low-Sodium Chicken Broth", "🍲", "carton", "900 mL", 2.99, ["low sodium chicken broth", "low sodium chicken stock"]],
  // Pasta and cooking sauces
  ["Pizza Sauce", "🍅", "can", "398 mL", 1.99, ["pizza sauce", "canned pizza sauce"]],
  ["Rosé Sauce", "🍝", "jar", "650 mL", 4.49, ["rose sauce", "pink pasta sauce", "tomato cream sauce"]],
  ["Arrabbiata Sauce", "🍝", "jar", "650 mL", 4.49, ["arrabbiata sauce", "arrabbiata", "spicy tomato sauce"]],
  ["Vodka Sauce", "🍝", "jar", "650 mL", 4.49, ["vodka sauce", "penne alla vodka sauce"]],
  ["Meat Sauce", "🍝", "jar", "650 mL", 4.29, ["meat sauce", "bolognese sauce", "pasta meat sauce"]],
  ["Chicken Gravy", "🥫", "can", "398 mL", 2.49, ["chicken gravy", "canned chicken gravy"]],
  ["Taco Sauce", "🌮", "jar", "230 mL", 2.99, ["taco sauce", "mild taco sauce"]],
  ["Salsa Verde", "🌶️", "jar", "430 mL", 3.99, ["salsa verde", "green salsa"]],
  // Asian, BBQ, and table sauces
  ["Tartar Sauce", "🥫", "jar", "250 mL", 2.99, ["tartar sauce", "tartare sauce"]],
  ["Cocktail Sauce", "🥫", "jar", "340 mL", 3.49, ["cocktail sauce", "seafood cocktail sauce"]],
  ["Sweet Chili Sauce", "🌶️", "bottle", "350 mL", 3.49, ["sweet chili sauce", "thai sweet chili sauce"]],
  ["Honey Garlic Sauce", "🍯", "bottle", "355 mL", 3.49, ["honey garlic sauce", "honey garlic marinade"]],
  ["Plum Sauce", "🥫", "jar", "341 mL", 3.29, ["plum sauce", "duck sauce"]],
  ["Satay Sauce", "🥜", "jar", "250 mL", 3.99, ["satay sauce", "peanut sauce"]],
  ["Buffalo Wing Sauce", "🌶️", "bottle", "354 mL", 3.49, ["buffalo sauce", "wing sauce", "buffalo wing sauce"]],
  ["Steak Sauce", "🥫", "bottle", "280 mL", 3.49, ["steak sauce", "hp sauce"]],
  ["Jerk Marinade", "🌶️", "bottle", "296 mL", 4.49, ["jerk marinade", "jerk sauce", "jamaican jerk sauce"]],
  ["Green Curry Paste", "🌿", "jar", "110 g", 3.99, ["green curry paste", "thai green curry paste"]],
  ["Red Curry Paste", "🌶️", "jar", "110 g", 3.99, ["red curry paste", "thai red curry paste"]],
  ["Light Coconut Milk", "🥥", "can", "400 mL", 2.29, ["light coconut milk", "lite coconut milk"]],
  ["Chili Oil", "🌶️", "jar", "210 g", 4.99, ["chili oil", "chili crisp", "crispy chili oil"]],
  // Mustards, dressings, mayo
  ["Honey Mustard", "🍯", "bottle", "325 mL", 2.99, ["honey mustard", "honey mustard dipping sauce"]],
  ["Whole Grain Mustard", "🥫", "jar", "250 mL", 3.49, ["whole grain mustard", "grainy mustard"]],
  ["Spicy Brown Mustard", "🥫", "bottle", "400 mL", 2.99, ["spicy brown mustard", "deli mustard"]],
  ["Caesar Dressing", "🥗", "bottle", "475 mL", 4.29, ["caesar dressing", "creamy caesar dressing"]],
  ["Greek Dressing", "🥗", "bottle", "475 mL", 4.29, ["greek dressing", "greek vinaigrette"]],
  ["Sesame Ginger Dressing", "🥗", "bottle", "475 mL", 4.29, ["sesame ginger dressing", "asian dressing"]],
  ["Light Mayonnaise", "🥫", "jar", "890 mL", 5.49, ["light mayo", "light mayonnaise", "low fat mayo"]],
  ["Sandwich Spread", "🥫", "jar", "890 mL", 4.99, ["sandwich spread", "salad dressing spread", "miracle whip"]],
  ["Vegan Mayonnaise", "🥫", "jar", "355 mL", 4.99, ["vegan mayo", "egg free mayo"]],
  ["Garlic Aioli", "🧄", "jar", "250 mL", 4.49, ["garlic aioli", "aioli"]],
  // Pickled and preserved
  ["Jarred Minced Garlic", "🧄", "jar", "250 mL", 3.49, ["jarred garlic", "garlic in a jar", "chopped garlic"]],
  ["Ginger Garlic Paste", "🧄", "jar", "300 g", 3.99, ["ginger garlic paste", "ginger paste"]],
  ["Sweet Gherkins", "🥒", "jar", "375 mL", 3.49, ["gherkins", "sweet gherkins", "sweet pickles"]],
  ["Bread and Butter Pickles", "🥒", "jar", "500 mL", 3.99, ["bread and butter pickles", "sweet pickle slices"]],
  ["Kalamata Olives", "🫒", "jar", "375 mL", 4.99, ["kalamata olives", "greek olives"]],
  ["Stuffed Olives", "🫒", "jar", "375 mL", 3.99, ["stuffed olives", "pimento stuffed olives", "pimento olives"]],
  ["Mango Chutney", "🥭", "jar", "280 mL", 3.99, ["mango chutney", "chutney"]],
  // Jams, spreads, toppings
  ["Raspberry Jam", "🍓", "jar", "500 mL", 4.49, ["raspberry jam", "seedless raspberry jam"]],
  ["Apricot Jam", "🍑", "jar", "500 mL", 4.49, ["apricot jam", "apricot preserves"]],
  ["Lemon Curd", "🍋", "jar", "320 g", 4.99, ["lemon curd", "lemon spread"]],
  ["Sunflower Seed Butter", "🌻", "jar", "500 g", 6.99, ["sunflower butter", "sunflower seed butter", "sunbutter"]],
  ["Cashew Butter", "🥜", "jar", "340 g", 7.99, ["cashew butter", "cashew spread"]],
  ["Cookie Butter", "🍪", "jar", "400 g", 5.99, ["cookie butter", "biscoff spread", "speculoos spread"]],
  ["Crunchy Peanut Butter", "🥜", "jar", "1 kg", 6.49, ["crunchy peanut butter", "chunky peanut butter"]],
  ["Chocolate Syrup", "🍫", "bottle", "475 mL", 3.99, ["chocolate syrup", "chocolate sauce", "hershey syrup"]],
  ["Caramel Sauce", "🍯", "jar", "320 mL", 4.49, ["caramel sauce", "caramel topping", "caramel syrup"]],
  ["Vanilla Frosting", "🍰", "tub", "450 g", 3.99, ["vanilla frosting", "vanilla icing", "icing tub"]],
];

const SECTIONS = [
  ["Dairy", DAIRY],
  ["Produce", PRODUCE],
  ["Frozen", FROZEN],
  ["Pantry", PANTRY],
];

/** Packaged produce (kits, trays, cut fruit bowls) photographs like a branded pack. */
const PACKAGED_PRODUCE = /\b(Kit|Tray|Fruit Bowl)\b/;

/** Build the full list of new item records (items.json shape). */
export function buildNewItems() {
  const out = [];
  for (const [category, rows] of SECTIONS) {
    for (const [name, emoji, unit, size, base, terms] of rows) {
      const generic = category === "Produce" && !PACKAGED_PRODUCE.test(name);
      out.push({
        id: slug(name),
        name,
        brand: "",
        category,
        unit,
        size,
        base,
        emoji,
        searchTerms: terms,
        imageMode: generic ? "generic" : "brand",
        offQuery: slug(name).replace(/-/g, " "),
      });
    }
  }
  return out;
}

export { pricesFor };

/* ------------------------------------------------------------------- main */
const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  const DRY = process.argv.includes("--dry");
  const items = JSON.parse(readFileSync(ITEMS, "utf8"));
  const products = JSON.parse(readFileSync(PRODUCTS, "utf8"));
  const have = new Set([...items.map((i) => i.id), ...products.map((p) => p.id)]);

  const added = { Dairy: 0, Produce: 0, Frozen: 0, Pantry: 0 };
  let skipped = 0;
  for (const it of buildNewItems()) {
    if (have.has(it.id)) {
      skipped++;
      continue;
    }
    have.add(it.id);
    items.push(it);
    products.push({
      id: it.id,
      name: it.name,
      brand: "",
      category: it.category,
      unit: it.unit,
      size: it.size,
      emoji: it.emoji,
      searchTerms: it.searchTerms,
      prices: pricesFor(it.id, it.base),
    });
    added[it.category]++;
  }

  const total = Object.values(added).reduce((a, b) => a + b, 0);
  console.log(
    `Added ${total} (${Object.entries(added).map(([k, v]) => `${k} ${v}`).join(", ")}); ${skipped} already present.`,
  );
  console.log(`Catalog: products.json ${products.length}, items.json ${items.length}.`);
  if (DRY) {
    console.log("--dry: nothing written.");
  } else if (total > 0) {
    writeFileSync(ITEMS, JSON.stringify(items, null, 2) + "\n");
    writeFileSync(PRODUCTS, JSON.stringify(products, null, 2) + "\n");
    console.log("Written.");
  }
}
