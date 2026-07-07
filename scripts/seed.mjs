/*
 * DailyValue catalog seeder
 * ---------------------------------------------------------------------------
 * Generates data/products.json from a single curated grocery list.
 *
 * Design notes:
 *  - No public API exists for live Freshco/Walmart pricing, so per-store PRICES
 *    are SIMULATED — but deterministically (hash-based), so the catalog is
 *    reproducible and the "cheapest store" varies believably per item.
 *  - Product visuals are EMOJI tiles rather than photos. (We prototyped pulling
 *    photos from the open Open Food Facts API, but its crowd-sourced matches
 *    were too inconsistent for a clean grid — e.g. "onion" returned a Pringles
 *    can. Consistent tiles look more intentional and never break.)
 *
 * Run:  node scripts/seed.mjs   (or: npm run seed)
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "products.json");

// storeId → base price multiplier (see data/stores.ts for the store list).
const STORE_MULTIPLIERS = {
  freshco: 1.0,
  walmart: 0.93,
  nofrills: 0.96,
  metro: 1.07,
};

/** Curated catalog. `base` is the baseline CAD price before per-store variance. */
const ITEMS = [
  // --- Dairy & eggs ---
  { id: "cream-cheese", name: "Cream Cheese", emoji: "🧀", category: "Dairy", unit: "block", size: "250 g", base: 4.49, terms: ["cream cheese", "philadelphia"] },
  { id: "butter", name: "Butter", emoji: "🧈", category: "Dairy", unit: "block", size: "454 g", base: 5.99, terms: ["butter", "unsalted butter", "salted butter"] },
  { id: "eggs", name: "Large Eggs", emoji: "🥚", category: "Dairy", unit: "dozen", size: "12 ct", base: 3.99, terms: ["egg", "eggs", "large eggs"] },
  { id: "milk", name: "2% Milk", emoji: "🥛", category: "Dairy", unit: "carton", size: "2 L", base: 4.29, terms: ["milk", "whole milk", "2% milk"] },
  { id: "sour-cream", name: "Sour Cream", emoji: "🥛", category: "Dairy", unit: "tub", size: "500 mL", base: 3.29, terms: ["sour cream"] },
  { id: "whipping-cream", name: "Whipping Cream", emoji: "🥛", category: "Dairy", unit: "carton", size: "473 mL", base: 4.79, terms: ["heavy cream", "whipping cream", "cream", "double cream"] },
  { id: "cheddar", name: "Cheddar Cheese", emoji: "🧀", category: "Dairy", unit: "block", size: "400 g", base: 6.49, terms: ["cheddar", "cheese", "cheddar cheese"] },
  { id: "greek-yogurt", name: "Greek Yogurt", emoji: "🥣", category: "Dairy", unit: "tub", size: "750 g", base: 5.49, terms: ["yogurt", "greek yogurt", "plain yogurt"] },

  // --- Produce ---
  { id: "blueberries", name: "Blueberries", emoji: "🫐", category: "Produce", unit: "pack", size: "170 g", base: 3.99, terms: ["blueberries", "fresh blueberries", "blueberry"] },
  { id: "strawberries", name: "Strawberries", emoji: "🍓", category: "Produce", unit: "pack", size: "454 g", base: 4.49, terms: ["strawberries", "strawberry"] },
  { id: "lemon", name: "Lemon", emoji: "🍋", category: "Produce", unit: "each", size: "1 ct", base: 0.79, terms: ["lemon", "lemons", "lemon juice", "lemon zest"] },
  { id: "banana", name: "Bananas", emoji: "🍌", category: "Produce", unit: "bunch", size: "per lb", base: 0.69, terms: ["banana", "bananas"] },
  { id: "onion", name: "Yellow Onion", emoji: "🧅", category: "Produce", unit: "each", size: "1 ct", base: 0.89, terms: ["onion", "onions", "yellow onion"] },
  { id: "garlic", name: "Garlic", emoji: "🧄", category: "Produce", unit: "bulb", size: "1 ct", base: 0.99, terms: ["garlic", "garlic clove", "garlic cloves", "minced garlic"] },
  { id: "tomato", name: "Tomatoes", emoji: "🍅", category: "Produce", unit: "each", size: "per lb", base: 2.49, terms: ["tomato", "tomatoes"] },
  { id: "potato", name: "Potatoes", emoji: "🥔", category: "Produce", unit: "bag", size: "5 lb", base: 4.99, terms: ["potato", "potatoes"] },
  { id: "spinach", name: "Baby Spinach", emoji: "🥬", category: "Produce", unit: "pack", size: "142 g", base: 3.49, terms: ["spinach", "baby spinach"] },
  { id: "avocado", name: "Avocado", emoji: "🥑", category: "Produce", unit: "each", size: "1 ct", base: 1.49, terms: ["avocado", "avocados"] },

  // --- Bakery & grains ---
  { id: "graham-crackers", name: "Graham Crackers", emoji: "🍪", category: "Bakery", unit: "box", size: "200 g", base: 3.49, terms: ["graham crackers", "graham cracker crumbs", "digestive biscuits", "biscuits"] },
  { id: "bread", name: "Whole Wheat Bread", emoji: "🍞", category: "Bakery", unit: "loaf", size: "675 g", base: 3.29, terms: ["bread", "loaf", "sliced bread"] },
  { id: "flour", name: "All-Purpose Flour", emoji: "🌾", category: "Pantry", unit: "bag", size: "2.5 kg", base: 4.99, terms: ["flour", "all-purpose flour", "all purpose flour"] },
  { id: "spaghetti", name: "Spaghetti", emoji: "🍝", category: "Pantry", unit: "box", size: "500 g", base: 1.99, terms: ["pasta", "spaghetti", "noodles"] },
  { id: "rice", name: "Basmati Rice", emoji: "🍚", category: "Pantry", unit: "bag", size: "2 kg", base: 8.99, terms: ["rice", "basmati rice", "white rice"] },

  // --- Pantry & baking ---
  { id: "sugar", name: "Granulated Sugar", emoji: "🍬", category: "Pantry", unit: "bag", size: "2 kg", base: 3.79, terms: ["sugar", "granulated sugar", "white sugar", "caster sugar"] },
  { id: "brown-sugar", name: "Brown Sugar", emoji: "🍯", category: "Pantry", unit: "bag", size: "1 kg", base: 3.29, terms: ["brown sugar"] },
  { id: "vanilla", name: "Vanilla Extract", emoji: "🌼", category: "Pantry", unit: "bottle", size: "43 mL", base: 5.49, terms: ["vanilla", "vanilla extract"] },
  { id: "baking-powder", name: "Baking Powder", emoji: "🧂", category: "Pantry", unit: "tin", size: "227 g", base: 2.99, terms: ["baking powder"] },
  { id: "olive-oil", name: "Olive Oil", emoji: "🫒", category: "Pantry", unit: "bottle", size: "1 L", base: 9.99, terms: ["olive oil", "oil", "cooking oil"] },
  { id: "salt", name: "Table Salt", emoji: "🧂", category: "Pantry", unit: "box", size: "1 kg", base: 1.49, terms: ["salt", "table salt", "sea salt"] },
  { id: "black-pepper", name: "Black Pepper", emoji: "🌶️", category: "Pantry", unit: "jar", size: "100 g", base: 3.49, terms: ["pepper", "black pepper"] },
  { id: "honey", name: "Honey", emoji: "🍯", category: "Pantry", unit: "jar", size: "500 g", base: 6.49, terms: ["honey"] },
  { id: "peanut-butter", name: "Peanut Butter", emoji: "🥜", category: "Pantry", unit: "jar", size: "1 kg", base: 5.99, terms: ["peanut butter"] },
  { id: "tomato-sauce", name: "Tomato Pasta Sauce", emoji: "🍅", category: "Pantry", unit: "jar", size: "680 mL", base: 2.79, terms: ["tomato sauce", "pasta sauce", "marinara"] },

  // --- Meat & protein ---
  { id: "chicken-breast", name: "Chicken Breast", emoji: "🍗", category: "Meat", unit: "pack", size: "per lb", base: 7.99, terms: ["chicken", "chicken breast"] },
  { id: "ground-beef", name: "Ground Beef", emoji: "🥩", category: "Meat", unit: "pack", size: "per lb", base: 6.49, terms: ["ground beef", "beef", "minced beef"] },
  { id: "bacon", name: "Bacon", emoji: "🥓", category: "Meat", unit: "pack", size: "375 g", base: 6.99, terms: ["bacon"] },
  { id: "salmon", name: "Salmon Fillet", emoji: "🐟", category: "Meat", unit: "pack", size: "per lb", base: 12.99, terms: ["salmon", "salmon fillet"] },

  // --- Beverages ---
  { id: "orange-juice", name: "Orange Juice", emoji: "🧃", category: "Beverages", unit: "carton", size: "1.75 L", base: 4.49, terms: ["orange juice", "oj"] },
  { id: "coffee", name: "Ground Coffee", emoji: "☕", category: "Beverages", unit: "bag", size: "900 g", base: 12.99, terms: ["coffee", "ground coffee"] },
];

/** Deterministic per-(product,store) price wobble in the range [-0.06, +0.06]. */
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

function pricesFor(item) {
  const prices = {};
  for (const [storeId, mult] of Object.entries(STORE_MULTIPLIERS)) {
    const p = item.base * (mult + wobble(`${item.id}:${storeId}`));
    prices[storeId] = round2(Math.max(0.5, p));
  }
  return prices;
}

const products = ITEMS.map((item) => ({
  id: item.id,
  name: item.name,
  brand: "",
  category: item.category,
  unit: item.unit,
  size: item.size,
  emoji: item.emoji,
  searchTerms: item.terms,
  prices: pricesFor(item),
}));

await writeFile(OUT, JSON.stringify(products, null, 2) + "\n", "utf8");
console.log(`Wrote ${products.length} products to data/products.json`);
