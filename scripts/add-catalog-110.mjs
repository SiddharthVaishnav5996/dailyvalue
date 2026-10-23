/*
 * Add ~110 more generic items: South Asian staples, kitchen tools, party
 * supplies, flowers and plants, deli and prepared, health, alcohol extras,
 * small gaps, clothing basics, and 10 everyday grocery replacements.
 * Same structure and pricing as add-catalog-300.mjs:
 *   lcbo     Alcohol: LCBO price only.
 *   walmart  non-grocery categories: Walmart price only.
 *   grocery  everything else: freshco / walmart / nofrills / metro.
 * Idempotent: ids already in the catalog are skipped.
 * Run:  node scripts/add-catalog-110.mjs   (add --dry to preview)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ITEMS = `${ROOT}data/items.json`;
const PRODUCTS = `${ROOT}data/products.json`;

// [id, name, emoji, unit, size, base, terms, imageMode?, offQuery?]

// 1. South Asian staples - Pantry, 4 stores
const SOUTH_ASIAN = [
  ["toor-dal", "Toor Dal (Split Pigeon Peas)", "🫘", "bag", "907 g", 6.99, ["toor dal", "tur dal", "arhar dal"], "brand", "toor dal"],
  ["moong-dal", "Moong Dal (Split Mung Beans)", "🫘", "bag", "907 g", 6.49, ["moong dal", "mung dal", "yellow moong dal"], "brand", "moong dal"],
  ["chana-dal", "Chana Dal (Split Chickpeas)", "🫘", "bag", "907 g", 5.99, ["chana dal", "split chickpeas", "bengal gram dal"], "brand", "chana dal"],
  ["urad-dal", "Urad Dal (Split Black Gram)", "🫘", "bag", "907 g", 7.49, ["urad dal", "black gram dal", "split urad"], "brand", "urad dal"],
  ["garam-masala", "Garam Masala", "🌶️", "jar", "100 g", 4.49, ["garam masala", "indian spice blend"], "brand", "garam masala"],
  ["chai-masala", "Chai Masala Spice Blend", "🫚", "jar", "100 g", 4.99, ["chai masala", "masala chai spice", "tea masala"], "brand", "chai masala"],
  ["turmeric-powder", "Ground Turmeric", "🟡", "jar", "100 g", 3.99, ["turmeric powder", "ground turmeric", "haldi powder"], "brand", "ground turmeric powder"],
  ["jaggery", "Jaggery Block", "🟤", "pack", "500 g", 4.99, ["jaggery", "jaggery block", "indian jaggery"], "brand", "jaggery"],
  ["papadums", "Papadums", "🫓", "pack", "200 g", 3.49, ["papad", "papadums", "pappadums"], "brand", "papadums"],
  ["mango-pickle", "Mango Pickle", "🥭", "jar", "300 g", 3.99, ["mango pickle", "indian mango pickle", "aam ka achar"], "brand", "mango pickle"],
  ["sambar-powder", "Sambar Powder", "🌶️", "box", "200 g", 3.99, ["sambar powder", "sambar masala"], "brand", "sambar powder"],
  ["besan", "Chickpea Flour (Besan)", "🌾", "bag", "907 g", 5.49, ["besan", "gram flour", "chickpea flour"], "brand", "besan chickpea flour"],
  ["semolina", "Semolina (Sooji)", "🌾", "bag", "907 g", 3.99, ["semolina", "sooji", "rava"], "brand", "semolina"],
  ["green-cardamom-pods", "Green Cardamom Pods", "🫛", "jar", "50 g", 9.99, ["green cardamom", "cardamom pods", "whole cardamom"], "brand", "green cardamom pods"],
  ["poha", "Flattened Rice (Poha)", "🍚", "bag", "500 g", 3.49, ["poha", "flattened rice", "beaten rice"], "brand", "poha flattened rice"],
  ["mustard-seeds", "Whole Mustard Seeds", "🌱", "jar", "100 g", 3.49, ["mustard seeds", "whole mustard seed", "rai seeds"], "brand", "mustard seeds"],
];

// 2. Kitchen tools - Home, Walmart only
const KITCHEN = [
  ["can-opener", "Manual Can Opener", "🥫", "each", "1 ct", 9.99, ["can opener", "manual can opener"]],
  ["silicone-spatula", "Silicone Spatula", "🍳", "each", "1 ct", 6.99, ["spatula", "silicone spatula", "rubber spatula"]],
  ["kitchen-tongs", "Stainless Steel Kitchen Tongs", "🍴", "each", "12 in", 9.99, ["kitchen tongs", "tongs", "cooking tongs"]],
  ["soup-ladle", "Stainless Steel Ladle", "🥄", "each", "1 ct", 7.99, ["ladle", "soup ladle"]],
  ["vegetable-peeler", "Vegetable Peeler", "🥕", "each", "1 ct", 5.99, ["vegetable peeler", "potato peeler", "veggie peeler"]],
  ["box-grater", "Box Grater", "🧀", "each", "4 sided", 14.99, ["box grater", "cheese grater", "grater"]],
  ["wire-whisk", "Stainless Steel Whisk", "🥣", "each", "10 in", 6.99, ["whisk", "wire whisk", "balloon whisk"]],
  ["rolling-pin", "Wooden Rolling Pin", "🥖", "each", "1 ct", 12.99, ["rolling pin", "wooden rolling pin"]],
  ["muffin-tin", "Non-Stick Muffin Tin", "🧁", "each", "12 cup", 12.99, ["muffin tin", "muffin pan", "12 cup muffin pan"]],
  ["digital-kitchen-scale", "Digital Kitchen Scale", "⚖️", "each", "5 kg", 19.99, ["kitchen scale", "digital kitchen scale", "food scale"]],
  ["disposable-aluminum-pans", "Disposable Aluminum Pans", "🍱", "pack", "5 ct", 12.99, ["disposable pans", "aluminum foil pans", "disposable aluminum pans"]],
  ["potato-masher", "Potato Masher", "🥔", "each", "1 ct", 7.99, ["potato masher", "vegetable masher"]],
  ["pizza-cutter", "Pizza Cutter Wheel", "🍕", "each", "1 ct", 7.99, ["pizza cutter", "pizza wheel"]],
  ["kitchen-scissors", "Kitchen Scissors", "✂️", "each", "1 ct", 9.99, ["kitchen scissors", "kitchen shears", "herb scissors"]],
  ["silicone-baking-mat", "Silicone Baking Mat", "🍪", "each", "1 ct", 12.99, ["silicone baking mat", "baking mat", "reusable baking mat"]],
];

// 3. Party supplies - Seasonal, Walmart only
const PARTY = [
  ["birthday-candles", "Birthday Candles", "🎂", "pack", "24 ct", 2.99, ["birthday candles", "cake candles"]],
  ["party-plates", "Party Paper Plates", "🍽️", "pack", "24 ct", 5.99, ["party plates", "birthday plates", "printed party plates"]],
  ["party-cups", "Plastic Party Cups", "🥤", "pack", "50 ct", 6.99, ["party cups", "red party cups", "plastic party cups"]],
  ["party-streamers", "Party Streamers", "🎊", "pack", "3 rolls", 3.99, ["streamers", "party streamers", "crepe paper streamers"]],
  ["party-balloons", "Latex Party Balloons", "🎈", "pack", "30 ct", 5.99, ["party balloons", "latex balloons", "helium balloons"]],
  ["sparklers", "Sparklers", "🎇", "pack", "10 ct", 7.99, ["sparklers", "handheld sparklers"]],
  ["canada-day-flags", "Canada Day Flags", "🍁", "pack", "12 ct", 5.99, ["canada day flags", "canadian flags", "mini canada flags"]],
  ["thanksgiving-table-decor", "Thanksgiving Table Decor Set", "🦃", "set", "12 pc", 17.99, ["thanksgiving decor", "thanksgiving table decor", "fall table centrepiece"]],
  ["citronella-candles", "Citronella Candles", "🕯️", "pack", "2 ct", 9.99, ["citronella candles", "mosquito candles", "bug repellent candles"]],
  ["party-tablecloth", "Plastic Party Tablecloth", "🎉", "pack", "3 ct", 6.99, ["party tablecloth", "plastic tablecloth", "disposable tablecloth"]],
];

// 4a. Cut flowers - Produce, 4 stores
const FLOWERS = [
  ["mixed-flower-bouquet", "Mixed Flower Bouquet", "💐", "each", "1 bunch", 12.99, ["mixed bouquet", "flower bouquet", "fresh flowers"]],
  ["dozen-roses", "Dozen Roses", "🌹", "dozen", "12 stems", 24.99, ["dozen roses", "red roses", "rose bouquet"]],
  ["tulips-bunch", "Tulips Bunch", "🌷", "bunch", "10 stems", 9.99, ["tulips", "tulip bunch", "fresh tulips"]],
  ["sunflowers-bunch", "Sunflowers Bunch", "🌻", "bunch", "5 stems", 9.99, ["sunflowers", "sunflower bunch", "fresh sunflowers"]],
];

// 4b. Potted plants - Garden, Walmart only
const PLANTS = [
  ["potted-orchid", "Potted Orchid", "🪻", "each", "4 in pot", 24.99, ["potted orchid", "orchid plant", "orchid"]],
  ["potted-succulent", "Potted Succulent", "🪴", "each", "3 in pot", 5.99, ["potted succulent", "succulent plant", "succulent"]],
  ["mum-plant", "Potted Chrysanthemum (Mum)", "🌼", "each", "6 in pot", 9.99, ["mum plant", "garden mums", "potted mum"]],
  ["peace-lily", "Peace Lily Plant", "🪴", "each", "6 in pot", 19.99, ["peace lily", "peace lily plant", "white lily plant"]],
  ["aloe-vera-plant", "Potted Aloe Vera Plant", "🪴", "each", "4 in pot", 8.99, ["aloe plant", "potted aloe vera", "aloe vera plant"]],
  ["potted-herb-plant", "Potted Herb Plant", "🌿", "each", "4 in pot", 4.99, ["potted herbs", "herb plant", "basil plant"]],
  ["poinsettia", "Poinsettia Plant", "🎄", "each", "6 in pot", 14.99, ["poinsettia", "christmas poinsettia", "poinsettia plant"]],
];

// 5. Deli and prepared - Deli, 4 stores
const DELI = [
  ["potato-salad", "Deli Potato Salad", "🥔", "tub", "500 g", 5.99, ["potato salad", "deli potato salad", "creamy potato salad"], "brand", "potato salad"],
  ["pasta-salad", "Deli Pasta Salad", "🍝", "tub", "500 g", 5.99, ["pasta salad", "deli pasta salad", "italian pasta salad"], "brand", "pasta salad"],
  ["macaroni-salad", "Deli Macaroni Salad", "🥗", "tub", "500 g", 5.49, ["macaroni salad", "deli macaroni salad"], "brand", "macaroni salad"],
  ["egg-salad", "Deli Egg Salad", "🥚", "tub", "500 g", 5.99, ["egg salad", "deli egg salad", "egg salad spread"], "brand", "egg salad"],
  ["chicken-salad", "Deli Chicken Salad", "🐔", "tub", "400 g", 7.99, ["chicken salad", "deli chicken salad"], "brand", "chicken salad"],
  ["deli-coleslaw", "Deli Coleslaw", "🥬", "tub", "450 g", 4.99, ["deli coleslaw", "creamy coleslaw", "cole slaw"], "brand", "deli coleslaw"],
  ["cheese-tray", "Cheese Tray", "🧀", "each", "700 g", 19.99, ["cheese tray", "cheese platter"], "brand", "cheese tray"],
  ["fruit-tray", "Fresh Fruit Tray", "🍉", "each", "1.4 kg", 19.99, ["fruit tray", "fruit platter", "fresh fruit tray"], "brand", "fruit tray"],
  ["bruschetta-topping", "Bruschetta Topping", "🍅", "tub", "250 g", 4.99, ["bruschetta topping", "tomato bruschetta", "deli bruschetta"], "brand", "bruschetta topping"],
  ["sushi-tray", "Sushi Tray", "🍣", "each", "24 pc", 19.99, ["sushi tray", "sushi platter", "california roll tray"], "brand", "sushi tray"],
  ["sandwich-platter", "Sandwich Platter", "🥪", "each", "24 pc", 22.99, ["sandwich platter", "sandwich tray", "party sandwich tray"], "brand", "sandwich platter"],
];

// 6. Health - Health, Walmart only (maps to the pharmacy department)
const HEALTH = [
  ["laxative-tablets", "Laxative Tablets", "💊", "box", "30 ct", 9.99, ["laxative", "laxatives", "constipation relief"], "brand", "laxative tablets"],
  ["disposable-face-masks", "Disposable Face Masks", "😷", "box", "50 ct", 9.99, ["disposable face masks", "surgical masks", "3 ply masks"], "brand", "disposable face masks"],
  ["covid-rapid-tests", "COVID-19 Rapid Antigen Tests", "🧪", "box", "5 ct", 29.99, ["covid rapid tests", "rapid antigen tests", "covid test kit"], "brand", "covid rapid antigen test"],
  ["heating-pad", "Electric Heating Pad", "🔥", "each", "12 x 15 in", 24.99, ["heating pad", "electric heating pad", "heat pad"]],
  ["reusable-ice-pack", "Reusable Gel Ice Pack", "🧊", "each", "1 ct", 9.99, ["reusable ice pack", "gel ice pack", "hot cold pack"]],
  ["blood-pressure-monitor", "Upper Arm Blood Pressure Monitor", "🩺", "each", "1 ct", 49.99, ["blood pressure monitor", "bp monitor", "blood pressure cuff"]],
  ["weekly-pill-organizer", "Weekly Pill Organizer", "💊", "each", "7 day", 7.99, ["pill organizer", "pill box", "weekly pill case"]],
  ["saline-nasal-spray", "Saline Nasal Spray", "👃", "bottle", "30 mL", 6.99, ["saline nasal spray", "saline spray", "saline mist"], "brand", "saline nasal spray"],
  ["knee-brace", "Adjustable Knee Brace", "🦵", "each", "1 ct", 19.99, ["knee brace", "knee support", "knee compression sleeve"]],
  ["epsom-salt", "Epsom Salt", "🛁", "bag", "2 kg", 7.99, ["epsom salt", "epsom bath salts", "magnesium sulfate"], "brand", "epsom salt"],
];

// 7. Alcohol extras - Alcohol, LCBO only
const ALCOHOL_EXTRA = [
  ["non-alcoholic-wine-750", "Non-Alcoholic Red Wine 750 mL", "🍷", "bottle", "750 mL", 12.95, ["non alcoholic wine", "alcohol free wine", "dealcoholized wine"]],
  ["sake-720", "Sake 720 mL", "🍶", "bottle", "720 mL", 18.95, ["sake", "japanese rice wine", "junmai sake"]],
  ["sweet-vermouth-750", "Sweet Vermouth 750 mL", "🍸", "bottle", "750 mL", 15.95, ["sweet vermouth", "red vermouth", "vermouth"]],
  ["aromatic-bitters-200", "Aromatic Bitters 200 mL", "🍸", "bottle", "200 mL", 14.95, ["aromatic bitters", "cocktail bitters", "bitters"]],
  ["margarita-mix-1l", "Margarita Mix 1 L", "🍹", "bottle", "1 L", 8.95, ["margarita mix", "margarita cocktail mix"]],
  ["port-wine-750", "Port Wine 750 mL", "🍷", "bottle", "750 mL", 21.95, ["port wine", "ruby port", "tawny port"]],
];

// 8. Smaller gaps
const GAP_ELECTRONICS = [
  ["laptop-bag", "Laptop Bag", "💼", "each", "15.6 in", 29.99, ["laptop bag", "laptop sleeve", "laptop carrying case"]],
  ["mouse-pad", "Mouse Pad", "🖱️", "each", "1 ct", 9.99, ["mouse pad", "desk mouse pad", "gaming mouse pad"]],
  ["phone-tripod", "Phone Tripod", "📱", "each", "1 ct", 19.99, ["phone tripod", "smartphone tripod", "selfie tripod"]],
];
const GAP_HOME = [
  ["carry-on-suitcase", "Carry-On Suitcase", "🧳", "each", "21 in", 79.99, ["carry on suitcase", "carry on luggage", "carry on bag"]],
  ["travel-pillow", "Memory Foam Travel Pillow", "✈️", "each", "1 ct", 19.99, ["travel pillow", "neck pillow", "u shaped travel pillow"]],
];
const GAP_HARDWARE = [
  ["furnace-filter", "Furnace Filter", "🌬️", "each", "16 x 25 x 1 in", 9.99, ["furnace filter", "furnace filters", "hvac furnace filter"]],
  ["weatherstripping-tape", "Weatherstripping Tape", "🚪", "roll", "10 m", 7.99, ["weatherstripping tape", "weather stripping", "door seal tape"]],
];
const GAP_HOUSEHOLD = [
  ["recycling-bin", "Recycling Bin", "♻️", "each", "60 L", 14.99, ["recycling bin", "blue box bin", "recycle bin"], "generic"],
];
const GAP_OFFICE = [
  ["postage-stamps", "Permanent Postage Stamps", "✉️", "pack", "10 ct", 13, ["postage stamps", "canada post stamps", "book of stamps"]],
];

// 9. Clothing basics - Clothing, Walmart only
const CLOTHING = [
  ["athletic-socks-6", "Athletic Crew Socks 6-Pack", "🧦", "pack", "6 pr", 12.99, ["athletic socks", "sport socks", "crew socks"]],
  ["mens-boxer-briefs-3", "Men's Boxer Briefs 3-Pack", "🩲", "pack", "3 ct", 19.99, ["boxer briefs", "mens boxer briefs", "mens underwear"]],
  ["womens-underwear-5", "Women's Underwear 5-Pack", "🩲", "pack", "5 ct", 14.99, ["womens underwear", "ladies underwear", "womens briefs"]],
  ["crew-neck-tshirt", "Crew-Neck T-Shirt", "👕", "each", "Adult", 9.99, ["t shirt", "crew neck tee", "plain tee"]],
  ["kids-tshirt", "Kids' T-Shirt", "👕", "each", "Youth", 7.99, ["kids t shirt", "childrens t shirt", "kids tee"]],
  ["winter-toque", "Winter Toque", "🧢", "each", "1 ct", 9.99, ["toque", "winter hat", "knit beanie"]],
  ["knit-scarf", "Knit Scarf", "🧣", "each", "1 ct", 12.99, ["knit scarf", "winter scarf", "scarf"]],
  ["winter-gloves", "Winter Gloves", "🧤", "pair", "1 pair", 12.99, ["winter gloves", "insulated gloves", "thermal gloves"]],
  ["rain-boots", "Rain Boots", "🥾", "pair", "1 pair", 29.99, ["rain boots", "rubber boots", "wellies"]],
  ["flip-flops", "Flip Flops", "🩴", "pair", "1 pair", 6.99, ["flip flops", "beach sandals", "thong sandals"]],
  ["pyjama-set", "Pyjama Set", "🛌", "set", "2 pc", 24.99, ["pyjama set", "pajama set", "pyjamas"]],
  ["pullover-hoodie", "Pullover Hoodie", "🧥", "each", "Adult", 24.99, ["hoodie", "pullover hoodie", "hooded sweatshirt"]],
  ["sweatpants", "Fleece Sweatpants", "👖", "each", "Adult", 19.99, ["sweatpants", "jogger sweatpants", "fleece sweatpants"]],
  ["kids-snow-pants", "Kids' Snow Pants", "❄️", "each", "Youth", 39.99, ["kids snow pants", "snow pants", "childrens snow pants"]],
  ["womens-leggings", "Women's Leggings", "👖", "each", "Adult", 14.99, ["leggings", "womens leggings", "stretch leggings"]],
  ["mens-jeans", "Men's Straight-Fit Jeans", "👖", "each", "Adult", 34.99, ["mens jeans", "jeans", "straight fit jeans"]],
];

// 10. Everyday replacements for removed niche items (grocery, 4 stores)
const REPL_MEAT = [
  ["pollock-fillets", "Pollock Fillets", "🐟", "pack", "per lb", 8.99, ["pollock", "pollock fillet", "alaska pollock"], "generic", "raw pollock fillet"],
  ["sole-fillets", "Sole Fillets", "🐟", "pack", "per lb", 13.99, ["sole fillet", "lemon sole", "dover sole"], "generic", "raw sole fillet"],
];
const REPL_BAKERY = [
  ["crumpets", "Crumpets", "🥞", "pack", "6 ct", 3.99, ["crumpets", "english crumpets"], "brand", "crumpets"],
];
const REPL_PANTRY = [
  ["taco-shells", "Hard Taco Shells", "🌮", "box", "12 ct", 3.49, ["taco shells", "hard taco shells", "crunchy taco shells"], "brand", "taco shells"],
  ["cornmeal", "Yellow Cornmeal", "🌽", "bag", "907 g", 3.99, ["cornmeal", "yellow cornmeal", "corn meal"], "brand", "yellow cornmeal"],
  ["almond-extract", "Pure Almond Extract", "🌰", "bottle", "59 mL", 6.99, ["almond extract", "pure almond extract"], "brand", "almond extract"],
];
const REPL_BEVERAGES = [
  ["earl-grey-tea-bags", "Earl Grey Tea Bags", "🍵", "box", "20 ct", 4.99, ["earl grey tea", "earl grey", "bergamot tea"], "brand", "earl grey tea bags"],
  ["peppermint-tea-bags", "Peppermint Tea Bags", "🍵", "box", "20 ct", 3.99, ["peppermint tea", "mint tea", "herbal mint tea"], "brand", "peppermint tea bags"],
  ["caesar-cocktail-mix", "Caesar Cocktail Mix", "🍅", "bottle", "1.89 L", 5.99, ["caesar mix", "clamato", "clamato juice"], "brand", "caesar cocktail mix clamato"],
];
const REPL_HOUSEHOLD = [
  ["reusable-grocery-bags", "Reusable Grocery Bags", "🛍️", "pack", "5 ct", 4.99, ["reusable grocery bags", "reusable shopping bags", "reusable bags"], "generic"],
];

// ---------------------------------------------------------------------------
// Pricing (same as add-catalog-300.mjs)
// ---------------------------------------------------------------------------
const STORE_MULTIPLIERS = { freshco: 1.0, walmart: 0.93, nofrills: 0.96, metro: 1.07 };
const WALMART_MULT = 0.93;

function wobble(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = (h >>> 0) / 4294967296;
  return (u - 0.5) * 0.12;
}
const round2 = (n) => Math.round(n * 100) / 100;

const MODE = {
  Alcohol: "lcbo",
  Home: "walmart", Seasonal: "walmart", Garden: "walmart", Health: "walmart",
  Electronics: "walmart", Hardware: "walmart", "School & Office": "walmart", Clothing: "walmart",
  Pantry: "grocery", Produce: "grocery", Deli: "grocery", Household: "grocery",
  Meat: "grocery", Bakery: "grocery", Beverages: "grocery",
};

// [group label, category, rows]
export const GROUPS = [
  ["1 South Asian staples", "Pantry", SOUTH_ASIAN],
  ["2 Kitchen tools", "Home", KITCHEN],
  ["3 Party supplies", "Seasonal", PARTY],
  ["4a Cut flowers", "Produce", FLOWERS],
  ["4b Potted plants", "Garden", PLANTS],
  ["5 Deli and prepared", "Deli", DELI],
  ["6 Health", "Health", HEALTH],
  ["7 Alcohol extras", "Alcohol", ALCOHOL_EXTRA],
  ["8 Gaps: Electronics", "Electronics", GAP_ELECTRONICS],
  ["8 Gaps: Home", "Home", GAP_HOME],
  ["8 Gaps: Hardware", "Hardware", GAP_HARDWARE],
  ["8 Gaps: Household", "Household", GAP_HOUSEHOLD],
  ["8 Gaps: School & Office", "School & Office", GAP_OFFICE],
  ["9 Clothing basics", "Clothing", CLOTHING],
  ["10 Replacements: Meat", "Meat", REPL_MEAT],
  ["10 Replacements: Bakery", "Bakery", REPL_BAKERY],
  ["10 Replacements: Pantry", "Pantry", REPL_PANTRY],
  ["10 Replacements: Beverages", "Beverages", REPL_BEVERAGES],
  ["10 Replacements: Household", "Household", REPL_HOUSEHOLD],
];

/** Every new item as an items.json-shaped record. `group` is for reporting only. */
export function buildNewItems() {
  const out = [];
  for (const [group, category, rows] of GROUPS) {
    for (const [id, name, emoji, unit, size, base, terms, imageMode = "generic", offQuery] of rows) {
      out.push({
        id, name, brand: "", category, unit, size, base, emoji,
        searchTerms: terms,
        imageMode,
        offQuery: offQuery ?? name.toLowerCase(),
        group,
      });
    }
  }
  return out;
}

/** The `prices` object for one new item, by its category's pricing mode. */
export function pricesFor(it) {
  const mode = MODE[it.category];
  if (!mode) throw new Error(`no pricing mode for category ${it.category}`);
  if (mode === "lcbo") return { lcbo: round2(it.base * (1.0 + wobble(`${it.id}:lcbo`))) };
  if (mode === "walmart") return { walmart: round2(it.base * (WALMART_MULT + wobble(`${it.id}:walmart`))) };
  const prices = {};
  for (const [storeId, mult] of Object.entries(STORE_MULTIPLIERS)) {
    prices[storeId] = round2(Math.max(0.5, it.base * (mult + wobble(`${it.id}:${storeId}`))));
  }
  return prices;
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  const DRY = process.argv.includes("--dry");
  const items = JSON.parse(readFileSync(ITEMS, "utf8"));
  const products = JSON.parse(readFileSync(PRODUCTS, "utf8"));
  const have = new Set([...items.map((i) => i.id), ...products.map((p) => p.id)]);

  const added = {};
  const addedGroups = {};
  let skipped = 0;
  for (const { group, ...it } of buildNewItems()) {
    if (have.has(it.id)) {
      skipped++;
      continue;
    }
    have.add(it.id);
    items.push(it);
    products.push({
      id: it.id, name: it.name, brand: "", category: it.category, unit: it.unit,
      size: it.size, emoji: it.emoji, searchTerms: it.searchTerms,
      prices: pricesFor(it),
    });
    added[it.category] = (added[it.category] ?? 0) + 1;
    addedGroups[group] = (addedGroups[group] ?? 0) + 1;
  }

  const total = Object.values(added).reduce((a, b) => a + b, 0);
  console.log(`${total} added; ${skipped} already present. Catalog: ${products.length}.`);
  console.log("By category: " + Object.entries(added).map(([k, v]) => `${k} ${v}`).join(", "));
  console.log("By group: " + Object.entries(addedGroups).map(([k, v]) => `${k} ${v}`).join("; "));
  if (DRY) {
    console.log("--dry: nothing written.");
  } else if (total > 0) {
    writeFileSync(ITEMS, JSON.stringify(items, null, 2) + "\n");
    writeFileSync(PRODUCTS, JSON.stringify(products, null, 2) + "\n");
    console.log("Written.");
  }
}
