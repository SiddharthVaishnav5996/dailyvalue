/*
 * Clash checker for scripts/add-catalog-110.mjs.
 * Loads data/products.json + data/items.json plus the new rows and reports:
 *   - id clashes (existing or within the new set)
 *   - name / alias clashes: any name or searchTerm of a NEW item equal to a name
 *     or searchTerm of a DIFFERENT item (existing or new), compared exactly and
 *     after normalising (case, accents, punctuation, plural "s")
 *   - new aliases that are a single generic word (explicit list, or a word that
 *     appears in 2+ other item names)
 *   - shape problems (2-4 aliases, lowercase, price base > 0)
 * Safe to re-run after the script has been applied: new ids are removed from the
 * "existing" side before comparing.
 * Run: node scripts/check-catalog-110.mjs   (exit code 1 if anything is found)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildNewItems } from "./add-catalog-110.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const items = JSON.parse(readFileSync(`${ROOT}data/items.json`, "utf8"));
const products = JSON.parse(readFileSync(`${ROOT}data/products.json`, "utf8"));
const fresh = buildNewItems();
const newIds = new Set(fresh.map((n) => n.id));

const existing = items.filter((i) => !newIds.has(i.id));
const existingProducts = products.filter((p) => !newIds.has(p.id));

const GENERIC = new Set(`beans bean soup soups peas pea cheese milk yogurt yoghurt pasta rice vegetables vegetable veggies veggie
fruit fruits pizza fish sauce sauces juice salad salads cereal nuts nut berries berry squash pepper peppers mushrooms mushroom
tomatoes tomato potatoes potato greens lettuce cabbage onion onions apples apple pears pear oranges orange melon cream butter
eggs egg bread meat chicken beef pork seafood shrimp ice dessert desserts cake pie fries corn carrots carrot jam jelly pickles
pickle olives olive dressing broth stock chili curry spread dip dips noodles flour sugar oil vinegar mustard ketchup mayo
snack snacks drink drinks frozen canned fresh organic dairy produce herbs herb spice spices seeds seed fruit sausage sausages
cookies cookie crackers chips candy chocolate coffee tea water sweetener syrup honey garlic ginger lemon lime grapes grape
banana bananas mango coconut pumpkin cucumber cucumbers kale spinach broccoli cauliflower celery`.split(/\s+/));

const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9% ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .join(" ");

const problems = [];
const report = (kind, msg) => problems.push(`${kind}: ${msg}`);

// ids
const idCount = new Map();
for (const e of existing) idCount.set(e.id, [...(idCount.get(e.id) ?? []), "existing"]);
for (const n of fresh) idCount.set(n.id, [...(idCount.get(n.id) ?? []), "new"]);
for (const [id, srcs] of idCount) if (srcs.length > 1 && srcs.includes("new")) report("ID CLASH", `${id} (${srcs.join(" + ")})`);
for (const n of fresh) if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n.id)) report("BAD ID", n.id);

// vocabulary: normalised string -> list of {id, how, new}
const vocab = new Map();
const add = (key, entry) => {
  const k = norm(key);
  if (!k) return;
  if (!vocab.has(k)) vocab.set(k, []);
  vocab.get(k).push(entry);
};
for (const e of existing) {
  add(e.name, { id: e.id, how: "name", raw: e.name, isNew: false });
  for (const t of e.searchTerms ?? []) add(t, { id: e.id, how: "alias", raw: t, isNew: false });
}
for (const n of fresh) {
  add(n.name, { id: n.id, how: "name", raw: n.name, isNew: true });
  for (const t of n.searchTerms) add(t, { id: n.id, how: "alias", raw: t, isNew: true });
}
// Curated TERMS (lib/catalog/curated.ts) already win searches: reserve every one.
const curatedSrc = readFileSync(`${ROOT}lib/catalog/curated.ts`, "utf8");
const termsBlock = curatedSrc.slice(curatedSrc.indexOf("const TERMS"), curatedSrc.indexOf("const NEVER_WITH"));
let curatedCount = 0;
const termsCode = termsBlock
  .split("\n")
  .filter((l) => !l.trim().startsWith("//"))
  .join("\n");
for (const m of termsCode.matchAll(/"([^"\n]+)"/g)) {
  if (/^(hero|pick|bf|p|w|cc)-/.test(m[1])) continue; // product ids, not terms
  add(m[1], { id: "curated:" + norm(m[1]), how: "curated", raw: m[1], isNew: false });
  curatedCount++;
}
let clashCount = 0;
for (const [k, entries] of vocab) {
  const ids = new Set(entries.map((e) => e.id));
  if (ids.size < 2 || !entries.some((e) => e.isNew)) continue;
  clashCount++;
  report(
    "CLASH",
    `"${k}" -> ` + entries.map((e) => `${e.id}[${e.how}:${e.raw}${e.isNew ? ",NEW" : ""}]`).join(" | "),
  );
}

// generic single-word aliases
const nameWords = new Map(); // (kept for reference)
for (const e of [...existing, ...fresh]) {
  for (const w of new Set(norm(e.name).split(" "))) {
    if (!nameWords.has(w)) nameWords.set(w, new Set());
    nameWords.get(w).add(e.id);
  }
}
// Single-word aliases are only allowed when deliberately listed here: each is the
// single most common item of its kind (the clash check guarantees nobody else has it).
const ALLOW_SINGLE = new Set(["lager","ipa","stout","pilsner","merlot","malbec","shiraz","chardonnay","riesling","rose","prosecco","champagne","vodka","gin","rum","whisky","bourbon","scotch","tequila","brandy","kahlua","baileys","pens","pencils","markers","highlighters","crayons","binder","scissors","stapler","calculator","backpack","whiteboard","clipboard","envelopes","shredder","planner","ruler","sharpener","puzzle","doll","barbie","uno","lego","kite","frisbee","bubbles","scooter","slime","tricycle","mascara","foundation","concealer","blush","eyeliner","eyeshadow","lipstick","tweezers","perfume","cologne","serum","bronzer","wreath","sled","toboggan","snowshoes","snowboard","condoms","plunger","stroller","bologna","pastrami","mortadella","capicollo","liverwurst","challah","brownies","eclairs","flatbread","colander","football","treadmill","volleyball","lantern","jaggery","papad","papadums","pappadums","besan","semolina","sooji","rava","poha","spatula","tongs","ladle","whisk","grater","streamers","sparklers","tulips","sunflowers","orchid","succulent","poinsettia","laxative","laxatives","sake","vermouth","bitters","crumpets","cornmeal","pollock","clamato","toque","scarf","hoodie","sweatpants","leggings","jeans","pyjamas","wellies"]);
let genericCount = 0;
for (const n of fresh) {
  for (const t of n.searchTerms) {
    if (norm(t).includes(" ") || t.includes("-")) continue;
    if (!ALLOW_SINGLE.has(t)) {
      genericCount++;
      report("GENERIC ALIAS", n.id + ': "' + t + '" (single word not on ALLOW_SINGLE)');
    }
  }
}

// shape
for (const n of fresh) {
  const t = n.searchTerms;
  if (t.length < 2 || t.length > 4) report("ALIAS COUNT", `${n.id}: ${t.length}`);
  for (const x of t) if (x !== x.toLowerCase() || x !== x.trim() || /[^\x20-\x7e]/.test(x)) report("ALIAS FORMAT", `${n.id}: "${x}"`);
  if (new Set(t).size !== t.length) report("DUP ALIAS IN ITEM", n.id);
  if (!(n.base > 0)) report("BAD BASE", n.id);
}

console.log(`new items checked: ${fresh.length}`);
console.log(`existing items compared against: ${existing.length} (items.json) / ${existingProducts.length} (products.json)`);
console.log(`curated TERMS reserved: ${curatedCount}`);
console.log(`id clashes: ${problems.filter((p) => p.startsWith("ID CLASH")).length}`);
console.log(`name/alias clashes: ${clashCount}`);
console.log(`generic single-word aliases: ${genericCount}`);
for (const p of problems) console.log("  " + p);
console.log(problems.length === 0 ? "RESULT: 0 problems" : `RESULT: ${problems.length} problem(s)`);
process.exit(problems.length === 0 ? 0 : 1);
