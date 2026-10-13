/*
 * Seed a product photo - PNG, transparent background - for every item in the
 * 1000-item catalogue.
 * ---------------------------------------------------------------------------
 * WHY THIS SCRIPT AND NOT scripts/seed-brand-photos.mjs
 *
 * That script downloads one JPEG per store brand and calls it done. Two
 * things have changed since it was written:
 *
 *   1. The catalogue is growing from 39 items to about 1000, and not all of
 *      them are branded packaged goods. A loose tomato or a chicken breast
 *      does not have a "brand" - it needs one honest photo of the food
 *      itself, not a hunt through Open Food Facts for a packshot that does
 *      not exist. That is `imageMode: "generic"` below.
 *
 *      REVISED: this originally sourced generic photos from Wikimedia
 *      Commons free-text search (with an Open Food Facts fallback). Measured
 *      result: semantically loose matches that are actively wrong, not just
 *      mediocre - "chicken breast" returned a raw egg yolk, "garlic" an
 *      18th-century botanical illustration, "salmon" tuna sashimi. Wikipedia
 *      lead images and OFF category search were no better (chicken breast ->
 *      live chickens in a market; onions -> freeze-dried onion). Replaced
 *      entirely with two pre-harvested retailer CDN sources - Walmart Canada
 *      and Loblaws - matched locally against the item's own name/searchTerms
 *      with the exact same rejectGate() used for brand matching. See
 *      attemptGenericItem() / evaluateRetailerCandidate().
 *   2. Every card in this app needs a TRANSPARENT PNG, not a JPEG on
 *      whatever background the original photographer shot it on. Source
 *      photos arrive with white seamless paper, grey studio backdrops, wood
 *      counters, other products in frame - anything. This script's actual
 *      job, the part that took the most work to get right, is turning that
 *      mess into a consistent 600x600 cutout on nothing.
 *
 * THE SOURCING ARCHITECTURE - ENUMERATE ONCE, MATCH LOCALLY
 *
 * The obvious design is "for each item, search Open Food Facts". That was
 * tried first and measured to be the wrong shape for this job, for reasons
 * that have nothing to do with rate limits:
 *
 *   - Store-brand matching (STEP 4's whole point) is naturally a BRAND
 *     question, not an item question: "what does Great Value sell in
 *     Canada?" is one query whose answer serves all thousand items, not a
 *     thousand separate small queries that each reinvent brand-grouping.
 *   - Measured: search.openfoodfacts.org's new endpoint returns every
 *     Canadian product for a given store brand in ~14 pages at
 *     page_size=100 (Great Value: 1395 products, confirmed by paging
 *     through it and checking for duplicate codes - there were none). Nine
 *     store brands cost roughly 50 requests, once, ever. That is genuinely
 *     less network traffic than searching per item, and it turns "group
 *     hits by store brand" from a per-item scramble into a single indexed
 *     table that every one of the thousand items is matched against locally
 *     - fast, offline, and rerunnable in seconds while the matching rules
 *       get tuned. See enumerateBrandCatalogue() / loadOrBuildCatalogue().
 *
 *   A note on query syntax, since it is easy to get subtly wrong and have it
 *   fail silently: `q=<free text> AND countries_tags:"en:canada"` returns
 *   ZERO hits - the literal word AND breaks the parser the moment one side
 *   of it is unstructured free text. So does wrapping free text itself in
 *   quotes ("peanut butter" alone -> 0 hits). What actually works, verified
 *   against dozens of queries: drop the word AND and just put the clauses
 *   next to each other separated by a space - `q=peanut butter
 *   countries_tags:"en:canada"` for free text, or
 *   `q=brands:"Great Value" countries_tags:"en:canada"` for two field
 *   clauses. Every hit that came back under that syntax actually carried
 *   "en:canada" in `countries_tags` - checked, not assumed, because a query
 *   that parses to something unintended but still returns HTTP 200 is a
 *   silent failure mode this project has already been bitten by once
 *   (off_new.json in the repo root is an earlier, unfiltered probe of this
 *   same endpoint - global peanut butter brands, not Canadian ones).
 *
 * THE BILINGUAL TRAP
 *
 * Canada is bilingual and a lot of Great Value / No Name / Compliments
 * products are filed in French: "Arachides" is peanuts, "Tartinade de
 * fromage à la crème" is cream cheese spread, "Extrait de vanille pure" is
 * vanilla extract. Matching only against English text silently drops these
 * AND risks mismatching them. So a candidate's "vocabulary" is built from
 * FOUR signals, in preference order, and unioned:
 *
 *   1. categories_tags (language-independent taxonomy, e.g. "en:peanuts") -
 *      precise when present, but only on ~40% of hits (measured).
 *   2. product_name_en, when Open Food Facts has it (~30% of hits, measured).
 *   3. product_name run word-by-word through a French->English lexicon (see
 *      loadLexicon() - a small built-in list, extended by a scratchpad file
 *      a sibling process may produce, loaded if present and skipped quietly
 *      if not).
 *   4. product_name as-is, which is what actually carries English rows.
 *
 * See candidateSignals() / evaluateOffCandidate().
 *
 * STEP 4'S RULE, ENFORCED IN CODE: A WRONG PHOTO IS WORSE THAN NO PHOTO
 *
 * lib/catalog/curated.ts already lives by this rule for the hand-curated
 * set. This script enforces the same thing for everything it touches, via
 * rejectGate(): a candidate is thrown out if it shares no meaningful word
 * with the item at all, AND (separately) if it shares a word but ALSO
 * carries a modifier word the item never asked for. That second check is
 * the one that matters: "butter" and "peanut butter" share the word
 * "butter", so a naive substring/contains match would happily hand a jar of
 * peanut butter to a shopper looking for butter. This is the actual bug it
 * exists to prevent, not a hypothetical - the CURRENT (pre-existing, human
 * curated years ago... no, seed-brand-photos.mjs-seeded) data/brandPhotos.json
 * already contains this exact mistake under the "butter" key, filed there by
 * the old less-strict pipeline. It was left alone (existing entries are
 * never touched - see STEP 6) but it is the textbook case this script's
 * modifier-word guard exists to stop from happening again.
 *
 * BACKGROUND REMOVAL - TWO PATHS, CHOSEN PER IMAGE
 *
 * Border whiteness (sample ~40 points per edge, count R,G,B all > 235)
 * decides the path:
 *
 *   - >= 95% white border: a plain BFS flood fill inward from the border,
 *     with a colour-distance tolerance (~18) against the AVERAGE of those
 *     same border samples. Deterministic, instant, no model needed. This
 *     must be a flood fill and not "every near-white pixel in the whole
 *     image becomes transparent" - a global threshold happily punches a
 *     hole through a white label, a glass of milk, or an egg, because those
 *     pixels are also near-white and a global rule cannot tell "this white
 *     is the background" from "this white is the product". A flood fill
 *     can, because it only ever eats pixels connected to the border.
 *   - < 95% white border: @imgly/background-removal-node (an actual
 *     segmentation model, ONNX, running locally - see below). Measured on
 *     real source photos, this is the COMMON case (most product photography
 *     is not shot on a clean white seamless), not a rare fallback, so it
 *     needs to actually work, not just exist.
 *
 * If the ML package will not install or run after a genuine attempt, this
 * degrades to the flood fill path with a looser tolerance for every image
 * that would have gone to the model - and says so loudly in the run report,
 * rather than quietly shipping photos with their backgrounds still on.
 *
 * WORTH KNOWING: the model files (~85MB for the "medium" model) ship INSIDE
 * the npm package itself (node_modules/@imgly/background-removal-node/dist/
 * is ~127MB) and are read from a local file:// path - confirmed by running
 * it with debug logging on. There is no first-run internet download the way
 * the package's own README implies; the "slow first call" is entirely the
 * cost of reading and initializing an 85MB ONNX model from disk, which is
 * why it is warmed up once, here, before the timed per-item loop begins.
 *
 * TWO COPIES OF SHARP IN ONE PROCESS SEGFAULTS - THE package.json OVERRIDE
 *
 * @imgly/background-removal-node depends on its own sharp (~0.32.x), which
 * npm installs as a SEPARATE nested copy because it does not satisfy this
 * project's sharp (0.35.4). Both are native addons that statically link
 * their own build of libvips/GLib. Load both into one Node process - which
 * happens the instant this script both calls sharp() directly AND calls
 * @imgly's removeBackground() - and it segfaults immediately with GLib
 * errors like "invalid unclassed type '(NULL)'" (two different GLib type
 * systems fighting over the same process). Not a maybe: this crashed every
 * single run before package.json got `"overrides": { "sharp": "0.35.4" }`,
 * which forces npm to dedupe to the ONE copy this project already has
 * instead of installing @imgly's own. @imgly's actual use of sharp
 * (src/codecs.ts: sharp(buffer).metadata() / .raw().toBuffer()) is basic
 * enough that the newer version serves it fine. If `npm install` ever
 * re-introduces a nested node_modules/@imgly/background-removal-node/
 * node_modules/sharp, that override has been lost - put it back.
 *
 * RESUMABILITY AND WHAT IS AND IS NOT TOUCHED
 *
 * Same philosophy as seed-brand-photos.mjs: load what is already on disk,
 * skip what is already there, write after every single item so a crash or a
 * Ctrl-C keeps the work. Two manifests exist side by side:
 *
 *   - data/brandPhotos.json (EXTENDED, never rewritten wholesale) - brand
 *     packshots, keyed productSlug -> brandKey -> photo, exactly the shape
 *     lib/catalog/brandPhotos.ts already reads. New PNG entries are added
 *     next to the existing JPEG ones. A pre-existing entry - recognisable
 *     because its `image` ends in .jpg - is NEVER overwritten or deleted,
 *     with or without --refresh; --refresh only re-does entries THIS script
 *     previously wrote (recognisable by .png). The file is backed up to the
 *     scratchpad before this run's first write, belt-and-suspenders on top
 *     of "additive only".
 *   - data/itemPhotos.json (NEW) - generic photos, keyed itemId -> photo.
 *
 * Filenames use the item's OWN id (`{brand-slug}-{item-id}.png`,
 * `{item-id}.png`), because that is what the 1000-item file will hand this
 * script and ids are not guaranteed to equal slug(name) the way they mostly
 * do in the current 39-item data/products.json (17 of the 39 already
 * differ - "milk" the id vs "2% Milk" the name, for one). The MANIFEST KEY
 * for brand photos has to stay slug(productName) regardless, because that
 * is what lib/catalog/brandPhotos.ts looks up at runtime - the filename and
 * the manifest key are allowed to differ and here they deliberately do.
 *
 * BOTH FILE PATTERNS LIVE IN ONE DIRECTORY: public/stores/Brand Photos/.
 * There used to be a second folder (Item Photos) for generic items; it has
 * been merged away on request - one product-image directory for the whole
 * app, not two. The two filename shapes above cannot collide with each
 * other or with the 86 pre-existing legacy .jpg files: every brand photo is
 * prefixed with its brand's own slug ("great-value-ketchup.png"), and every
 * generic photo is a bare item id ("banana.png") - no item id is ever also
 * a brand slug prefix, so the two namespaces stay disjoint by construction.
 * See BRAND_PHOTO_DIR / BRAND_PHOTO_URL below - both filename patterns
 * write there, there is no separate ITEM_PHOTO_DIR any more.
 *
 * Anything with no acceptable image is recorded to data/imageGaps.json with
 * why, for a later manual pass - not silently dropped.
 *
 * Run the whole thousand with:  npm run seed-images
 * Run it against a custom or partial list:
 *   node scripts/seed-item-images.mjs --items=path/to/items.json --limit=25
 */

import { existsSync, readFileSync } from "node:fs";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

/*
 * The scratchpad is Claude Code's per-session temp directory for this
 * project - not tracked, not part of the repo's file-scope contract for
 * this script. Two rebuildable things live there rather than in data/:
 *
 *   - offCanadaCatalogue.json: the enumerated brand catalogue (stage 1,
 *     above). It is a cache of a network call, not source data, and this
 *     script's own file-scope only permits writing under data/ for the
 *     three manifests it owns - so a cache belongs in the scratchpad, not
 *     as a fourth data/ file.
 *   - a timestamped backup of data/brandPhotos.json, taken once before this
 *     run's first write to it.
 *
 * Hardcoded because Claude Code hands this exact path to the session; a
 * human running this script later can override it with SCRATCHPAD_DIR.
 */
const SCRATCHPAD =
  process.env.SCRATCHPAD_DIR ||
  "C:\\Users\\siddh\\AppData\\Local\\Temp\\claude\\C--Users-siddh-OneDrive-Desktop-Dev-Projects\\ac7a53b8-06c8-4398-80c3-9bfa77c55db7\\scratchpad";

const BRANDS_TS = join(ROOT, "data", "brands.ts");
const BRAND_PHOTOS_JSON = join(ROOT, "data", "brandPhotos.json");
const ITEM_PHOTOS_JSON = join(ROOT, "data", "itemPhotos.json");
const IMAGE_GAPS_JSON = join(ROOT, "data", "imageGaps.json");
/** The validated, in-repo French->English lexicon a sibling process produces. */
const REPO_LEXICON = join(ROOT, "data", "frEnGroceryLexicon.json");
const DEFAULT_ITEMS_JSON = join(ROOT, "data", "items.json");

/*
 * ONE directory for every product image this script writes - brand
 * packshots AND generic items alike. (Previously generic items had their
 * own "Item Photos" folder; merged away so the app has a single product-
 * image directory, not two.) The two filename conventions never collide:
 * brand photos are always `{brand-slug}-{item-id}.png` (a brand prefix no
 * generic file would ever have), generic photos are always the bare
 * `{item-id}.png`. data/brandPhotos.json and data/itemPhotos.json stay two
 * separate manifests, keyed differently, as before - only the folder on
 * disk merged.
 */
const BRAND_PHOTO_DIR = join(ROOT, "public", "stores", "Brand Photos");
const BRAND_PHOTO_URL = "/stores/Brand Photos";

const CATALOGUE_CACHE = join(SCRATCHPAD, "offCanadaCatalogue.json");
const SCRATCHPAD_LEXICON = join(SCRATCHPAD, "fr-en-grocery-lexicon.json");

/*
 * The two pre-harvested retailer TSVs (name<TAB>path, one row per product)
 * this run's generic-item sourcing is built on. Harvested by a sibling
 * process, not by this script - see the HARD CONSTRAINT in this script's
 * header about never scripting a retailer's search/listing pages. Living in
 * the scratchpad for the same reason offCanadaCatalogue.json does: a cache
 * of someone else's catalogue, not source data this script's file-scope owns.
 */
const WALMART_TSV = join(SCRATCHPAD, "harvest.tsv");
const LOBLAWS_TSV = join(SCRATCHPAD, "loblaws.tsv");
const WALMART_IMAGE_BASE = "https://i5.walmartimages.ca/";
/* odnBg=FFFFFF forces a flat white background - measured, this is WHY the
 * cheap deterministic flood-fill path applies to every Walmart image. */
const WALMART_IMAGE_PARAMS = "?odnHeight=800&odnWidth=800&odnBg=FFFFFF";
const LOBLAWS_IMAGE_BASE = "https://digital.loblaws.ca/";

const USER_AGENT = "DailyValue/1.0 (personal project)";
/* Open Food Facts and Wikimedia are APIs that ask for an honest UA and get
 * one. The retailer image CDNs are a different case - measured directly,
 * plain fetch() with this project's own UA string works inconsistently
 * against them, a normal browser UA does not. This is only ever used to GET
 * the two CDN image hosts above; see the HARD CONSTRAINT about never
 * scripting a retailer's search or listing pages with it. */
const RETAILER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/* Politeness delays. The new search-a-licious endpoint is not the old
 * ten-calls-a-minute cgi/search.pl, but it still deserves a gap between
 * requests rather than being hammered. */
const OFF_DELAY_MS = 450;
const RETAILER_DELAY_MS = 300;
/* The legacy endpoint (gap-filler only) genuinely is the old, slow, easily
 * -503'd one - same numbers seed-brand-photos.mjs already uses. */
const LEGACY_DELAY_MS = 9000;
const LEGACY_RETRY_MS = 25000;

/* Background removal tuning. */
const WHITE_THRESHOLD = 235; // a channel counts as "white" above this
const WHITE_RATIO_CUTOFF = 0.95; // border white-pixel share that picks the deterministic path
const FLOOD_TOLERANCE = 18; // colour distance allowed while flowing inward
const FLOOD_TOLERANCE_DEGRADED = 42; // looser tolerance when the ML path is unavailable
const SQUARE_MARGIN = 0.88; // trimmed subject occupies this fraction of the padded square (~6% margin per side)
const FINAL_SIZE = 600;
const MIN_SHORT_SIDE = 250;
const MIN_OPAQUE_COVERAGE = 0.12;
const MAX_OPAQUE_COVERAGE = 0.98;
/* Alpha channel presence alone doesn't mean "already transparent" - a lot of
 * ordinary opaque PNGs carry an unused, always-255 alpha channel. This is the
 * average alpha of ~160 border-sampled pixels below which an image counts as
 * genuinely pre-cut-out (e.g. some Loblaws PNGs ship this way already). */
const PRE_TRANSPARENT_BORDER_ALPHA = 40;

/*
 * DEFECT 1 fix: quantize every PNG on write. Measured directly against this
 * project's own output: palette:true + quality:82 + effort:8 gives a 79%
 * size reduction (352KB -> 86KB, 643KB -> 107KB) with the alpha channel
 * intact and no visible quality loss on a 600x600 product cutout. Applied
 * ONLY to the final encode in normalizeCutout() - never to the intermediate
 * trimmed/squared buffers, which stay lossless PNG because they get fed back
 * into sharp for further processing, not written to disk.
 */
const PNG_QUANTIZE_OPTS = { palette: true, quality: 82, effort: 8, compressionLevel: 9 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ============================================================ arguments */

function parseArgs(argv) {
  const args = {
    items: DEFAULT_ITEMS_JSON,
    limit: null,
    only: null,
    refresh: false,
    concurrency: 1,
    recatalogue: false,
  };
  for (const raw of argv) {
    if (raw === "--refresh") args.refresh = true;
    else if (raw === "--recatalogue") args.recatalogue = true;
    else if (raw.startsWith("--items=")) args.items = raw.slice("--items=".length);
    else if (raw.startsWith("--limit=")) args.limit = parseInt(raw.slice("--limit=".length), 10);
    else if (raw.startsWith("--only="))
      args.only = new Set(
        raw
          .slice("--only=".length)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    else if (raw.startsWith("--concurrency="))
      args.concurrency = Math.max(1, parseInt(raw.slice("--concurrency=".length), 10) || 1);
  }
  return args;
}

/* ==================================================== text / word rules */

/** Lowercase, accents stripped ("crème" -> "creme") so fr/en compare cleanly. */
const stripAccents = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** "2% Milk" -> "2-milk". Must match the key lib/catalog/brandPhotos.ts looks up. */
const slug = (value) =>
  stripAccents(String(value))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Brand names compared without punctuation, e.g. for the manifest's brandKey. */
const flatten = (value) => stripAccents(String(value)).toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Words that don't change what a product IS - drop them before the modifier check. */
const STOPWORDS = new Set([
  "a","an","the","and","or","with","of","in","for","to","by","on","at","is","are",
  "de","du","des","la","le","les","et","au","aux","en","sans","avec","pour","un","une","à","a",
]);
const UNIT_WORDS = new Set([
  "g","kg","mg","mcg","ml","l","litre","litres","liter","liters","oz","lb","lbs",
  "ct","count","pack","pk","each","ea","fl","floz","pt","qt","gal","cm","in",
]);
/* Packaging/marketing adjectives common enough on labels in EITHER language
 * that treating them as "this changes the product" would reject good
 * matches for no reason. Anything NOT in this list, not a unit, not a
 * stopword, not part of the brand's own name, and not already in the item's
 * vocabulary is treated as a real modifier - see rejectGate(). */
const DESCRIPTOR_WORDS = new Set([
  // Marketing / quality adjectives - harmless on either side of the label.
  "natural","naturel","naturelle","pure","original","originale","classic","classique",
  "premium","select","selected","fine","fresh","frais","fraiche","whole","grade",
  "product","produit","quality","qualite","real","taste","gout","new","nouveau",
  "extra","added","reduced","low","light","lite","regular","format","grand","grande",
  "petit","petite","size","canadian","canadien","canadienne","produced","biologique",
  "organic","bio",
  // Store-brand name words. Normally stripped per-brand via the brandWords
  // set passed into evaluateOffCandidate, but the generic-item OFF fallback
  // (attemptGenericItem) has no specific brand in play and passes an empty
  // set - so a store-branded product surfacing there still needs these
  // words treated as neutral rather than as a rejecting "modifier".
  "great","value","signature","president","s","choice","black","label","no","name",
  "sans","nom","compliments","selection","western","family","irresistibles",
  "kirkland","pc",
  // Form / packaging / process words - describe HOW the product was made or
  // packaged, not WHAT it fundamentally is. A stick of butter is still
  // butter. Deliberately narrow: this must never grow to include a word
  // like "peanut" or "chocolate" or "flavoured" that changes WHAT the
  // product is - that is the exact case this whole guard exists to catch
  // (see the file header). Learned from real Open Food Facts rows during
  // testing: "Salted Churned Butter Sticks" and "Churned Unsalted Butter
  // Sticks" are both plain dairy butter and were being wrongly rejected for
  // carrying "churned" / "sticks" before these were added.
  "churned","whipped","cultured","spreadable","softened","stick","sticks","block",
  "tub","cup","jar","bag","bottle","carton","can","tin","bar","brick","loaf","wrapped",
  "sliced","diced","shredded","grated","minced","crushed","chopped","cut","halves",
  "pieces","piece",
  // Retailer catalogue sales-unit/packaging words, added for the Walmart
  // Canada / Loblaws generic-item sourcing (DEFECT 3). Measured directly
  // against the harvested TSVs: Walmart rows are routinely suffixed "Sold in
  // singles" / "Sold in bunches", and "Boneless Skinless" is how virtually
  // every packaged chicken breast is labelled - none of these describe a
  // DIFFERENT product the way "peanut" or "mini" would, so they belong here
  // on the same terms as "churned"/"whipped" above. Deliberately NOT
  // extended to colour or cultivar words ("royal", "gold", "roma") - those
  // do distinguish one product from another and are left to reject, per
  // this file's "wrong photo is worse than no photo" rule.
  "sold","singles","bunch","bunches","boneless","skinless",
  // Texture words for spreads/nut butters - found LIVE by DEFECT 2's own
  // validation pass: without these, "Peanut Butter creamy natural" /
  // "Smooth Peanut Butter" / "crunchy peanut butter" all fail against the
  // "Peanut Butter" item on the texture word alone, get removed, and the
  // resulting empty slot then re-matches something genuinely wrong ("Peanut
  // pieces", OFF category en:peanuts - chopped nuts, not a spread) since
  // that candidate's only remaining word after the fix-less offender scan
  // was already-whitelisted "pieces". Same family as creamy/smooth/crunchy
  // never changing WHAT the product is - a jar of peanut butter is smooth
  // OR crunchy OR creamy and still peanut butter.
  "creamy","smooth","crunchy","chunky",
  // Same pattern, found LIVE by the first full-catalogue validation pass:
  // grade/processing/safety words that describe an INTENSITY or a
  // manufacturing step, not a different product. "Extra Virgin" is the
  // standard olive-oil grade (greatvalue's "EXTRA VIRGIN OLIVE OIL" was
  // being rejected for "virgin" alone); "pasteurized" is a near-universal
  // dairy-safety step, not a variant; "unbleached" flour looks and is used
  // identically to bleached; old/medium/sharp/mild/aged describe cheddar's
  // AGING intensity, not a different cheese - a block of cheddar looks the
  // same regardless. Deliberately NOT extending this to words that DO
  // denote a different cut/prep even though they feel similarly "mild" in
  // isolation - "smoked" (bacon) and "roast" (coffee/beef) were considered
  // and rejected: smoked salmon looks nothing like a raw salmon fillet, and
  // "roast" would just as easily bridge a whole beef roast into matching
  // pre-cut stewing cubes. When a word's neutrality depends on which OTHER
  // item might be in the catalogue, it stays a real offender.
  "virgin","pasteurized","unbleached","bleached","old","medium","sharp","mild","aged",
  // Canadian labeling convention, not noise: plant-based milk alternatives
  // are routinely sold as "Almond Beverage" / "Soy Beverage" / "Boisson
  // d'amande" rather than "milk" (dairy-labeling rules restrict who gets to
  // say "milk"). Confirmed against a real catalogue row during testing -
  // Kirkland Signature's actual soy milk is filed as "Kirkland Signature
  // Soy Beverage" - so without this, every plant milk in the catalogue
  // would reject on the one word that is effectively its category name.
  "beverage","beverages","boisson","boissons",
]);

/** lowercase, accent-stripped words; punctuation and pure numbers dropped. */
function tokenize(text) {
  return stripAccents(String(text).toLowerCase())
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .filter((w) => !/^\d+$/.test(w))
    .filter((w) => w.length > 1);
}

/** The words a set of texts is allowed to be found by - stopwords already dropped. */
function wordSet(...texts) {
  const set = new Set();
  for (const t of texts) if (t) for (const w of tokenize(t)) if (!STOPWORDS.has(w)) set.add(w);
  return set;
}

/** Every word the item itself is described by: its name and its search terms. */
/*
 * The item's distinguishing words: every word of its NAME that actually
 * identifies the product, with generic descriptors dropped.
 *
 * "Cream Cheese" -> {cream, cheese}.  "Large Eggs" -> {eggs}, because
 * "large" is a size, not an identity.  "Olive Oil" -> {olive, oil}.
 *
 * A candidate must carry ALL of these. Requiring only ONE shared word is
 * what let "Cream soda" and "Ice cream" match Cream Cheese, "Sunflower
 * Oil" match Olive Oil, and "Butter Chicken" match Butter - each shares a
 * word with the item and is a completely different product. Measured on
 * real store-brand rows, not hypothetical.
 */
function itemKeyWords(item) {
  const out = new Set();
  for (const w of wordSet(item.name)) {
    if (STOPWORDS.has(w) || UNIT_WORDS.has(w) || DESCRIPTOR_WORDS.has(w)) continue;
    // Numbers are strengths and sizes, never identity. "2% Milk" must not
    // demand a literal "2" - almost no label repeats it, and requiring it
    // returned ZERO photos for milk. The item is milk; the 2% is a variant.
    if (/^\d+$/.test(w)) continue;
    out.add(w);
  }
  // Degenerate case: a name made entirely of descriptors. Fall back to the
  // full name so we never end up requiring nothing at all.
  if (out.size === 0) for (const w of wordSet(item.name)) out.add(w);
  return out;
}

/*
 * The milk-fat level a label is claiming, as a number, or null.
 *
 * "2% Milk", "1% Milk", "Whole Milk" and "Skim Milk" are four different
 * products that a shopper picks between deliberately, but they are one single
 * word to a word matcher: strip the numeral and the descriptor "whole" and
 * every one of them reduces to "milk". So all four were being given the same
 * photograph - a 2% carton could appear on the Whole Milk card.
 *
 * Canadian cartons state the fat either as a percentage or as a name, so both
 * are read here. "Partly skimmed" is deliberately NOT mapped: it covers both
 * 1% and 2% and so proves nothing on its own.
 */
function fatLevelOf(text) {
  const t = stripAccents(String(text)).toLowerCase();

  // An explicit percentage wins - "2% m.f.", "3.25 %", "0%".
  const pct = t.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (pct) return parseFloat(pct[1].replace(",", "."));

  if (/\b(skim|ecreme|ecremee|fat[\s-]?free|sans[\s-]?gras|0\s*m\.?f\.?)\b/.test(t)) return 0;
  if (/\b(whole|homogenized|homogenised|homo|entier|entiere)\b/.test(t)) return 3.25;

  return null;
}

/** Two fat claims that cannot be the same carton. */
function fatConflict(itemText, candidateText) {
  const want = fatLevelOf(itemText);
  if (want === null) return null;
  const got = fatLevelOf(candidateText);
  // A label that never states its fat is not evidence of the wrong one.
  if (got === null) return null;
  if (Math.abs(want - got) < 0.01) return null;
  return { want, got };
}

function itemVocabulary(item) {
  return wordSet(item.name, ...(item.searchTerms || []));
}

/*
 * The shared reject gate.
 * ---------------------------------------------------------------------------
 * Two independent checks, both from STEP 4, run against two DIFFERENT word
 * sets:
 *
 *   1. Relevance: `relevanceVocab` must share AT LEAST ONE meaningful word
 *      with the item. No shared word at all means this is a photo of a
 *      completely different thing. relevanceVocab is the WIDE net - it
 *      includes categories_tags words, because "en:peanuts" finding a
 *      shared word is exactly the point of carrying that signal at all.
 *
 *   2. The modifier guard: every OTHER significant word in `offenderVocab`
 *      must already belong to the item's own vocabulary (or be a brand
 *      word / unit / stopword / neutral descriptor). This is what stops
 *      "Butter" matching "Peanut Butter" - they share the word "butter",
 *      but "peanut" is a modifier word the item never asked for. Any real
 *      product variant - "chocolate", "flavoured", "smoked" - gets caught
 *      the same way.
 *
 *      offenderVocab is deliberately NARROWER than relevanceVocab: it must
 *      exclude categories_tags words. A taxonomy tag like "en:dairies" ->
 *      "dairies" is metadata, not something a product NAME would ever
 *      contain, so a short item name/searchTerms list will essentially
 *      never mention it - running the offender scan over category words
 *      would reject almost everything that carries any categories_tags at
 *      all. Measured directly: "Salted Butter" (categories en:dairies,
 *      en:fats, en:spreads) was being rejected for "dairies"/"fats"/
 *      "spreads" before this split existed, which threw out every genuine
 *      plain-butter row across every store brand's catalogue.
 */
/*
 * Words that change WHAT A PRODUCT IS.
 *
 * This is the guard that stops "Butter" matching "Peanut Butter", and it is
 * deliberately a REJECT list rather than the inverse.
 *
 * The earlier version rejected any word that was not on an allow list. That
 * reads as cautious and is actually the opposite: every label carries words
 * nobody enumerated, so it threw away correct matches in bulk. Measured on
 * real rows it rejected "100% Italian Extra Virgin Olive Oil" for olive-oil,
 * "Naturally Smoked Bacon" for bacon and "pasteurized cream cheese" for
 * cream-cheese - all three plainly the right product - and brand coverage
 * sat at 30 items out of 787. The allow list could only ever be grown one
 * failure at a time, and each new source brought fresh vocabulary with it.
 *
 * So the default is now ACCEPT, and only a word naming a DIFFERENT food or a
 * DIFFERENT product form rejects. Ordinary descriptors - smoked, virgin,
 * churned, Italian - no longer disqualify anything, because they describe
 * the same product. Keep this list about identity, never about adjectives.
 */
const PRODUCT_CHANGING_WORDS = new Set([
  // Head nouns of different dishes/foods, added after a measured
  // over-acceptance: "Butter Chicken", "Butter Croissants", "Potato &
  // Bacon Flatbread" and "Saucisses cheddar bacon" all carry the item's
  // word but are plainly other products.
  "chicken","poulet","beef","boeuf","pork","porc","turkey","dinde","ham","jambon",
  "sausage","sausages","saucisse","saucisses","croissant","croissants","flatbread",
  "hummus","houmous","soda","fudge","seeds","graines","pancake","waffle","gaufre",
  "glace","creme glacee","yogurt","yogourt","pudding","mousse","salad","salade",
  // NB: deliberately NOT "spread"/"tartinade" - "Cream Cheese Spread" is
  // genuinely cream cheese. The coconut fake is caught by "coconut" and
  // "style", which is the right reason to reject it.
  "gnocchi","pickles","pickle","cornichons","relish","dip","trempette",
  "pierogi","ravioli","dumpling","samosa","eggroll",
  /*
   * Head nouns of OTHER specific foods.
   *
   * Listing these is safe even when the catalogue has an item for one of
   * them: the offender scan skips any word already in the item's own
   * vocabulary, so "feta" only rejects when the item is NOT feta. That is
   * what stops "Feta lait de chevre" being filed as 2% Milk (it reached the
   * milk item through the French "lait") and "Haricots verts au beurre"
   * being filed as Butter.
   */
  /*
   * Shelf-stable milk is NOT fresh milk. "Lait evapore", "Evaporated Milk"
   * and "low fat sweetened condensed milk" were all being filed as the photo
   * for 2% Milk, Whole Milk and 1% Milk, because after the numeric "2"/"1"
   * and the descriptor "whole" are dropped the only word left to match is
   * "milk" - and a can of evaporated milk matches it perfectly. A shopper
   * looking for a 2L carton is not being shown a tin.
   */
  "evaporated","evapore","evaporee","condensed","condense","condensee",
  "powdered","poudre","sterilized","uht",
  // Frozen desserts read as milk too - "Neapolitan Ice Milk" turned up as the
  // photo for 2% Milk once the evaporated tins were excluded. Safe to list:
  // the Ice Cream item carries "ice" in its own vocabulary, so this only
  // rejects when the item is NOT a frozen dessert.
  "ice","neapolitan","sherbet","sorbet","gelato","popsicle",
  "feta","gouda","gruyere","mozzarella","brie","camembert","ricotta","parmesan",
  "emmental","havarti","provolone","asiago","chevre","colby","halloumi","paneer",
  "haricots","beans","pois","peas","lentils","lentilles","chickpeas","carottes",
  "brocoli","epinards","asperges","champignons","mais","corn","potato","patate",
  "rice","riz","pasta","pates","noodle","nouilles","couscous","quinoa",
  // Different foods entirely. "peanut" here is what keeps butter honest.
  "peanut","peanuts","arachide","arachides","almond","almonds","amande","amandes",
  "cashew","cashews","hazelnut","noisette","walnut","pecan","pistachio","macadamia",
  "soy","soya","soja","oat","avoine","coconut","noix","coco","hemp","cashou",
  "chocolate","chocolat","cocoa","cacao","caramel","honey","miel","maple","erable",
  // A different FORM of the same ingredient is a different product on a shelf.
  "powder","poudre","paste","pate","concentrate","concentre","extract","extrait",
  "crumbles","crumble","bits","flakes","granules","syrup","sirop","jelly","jam",
  "sauce","dressing","vinaigrette","marinade","soup","soupe","broth","bouillon",
  "juice","jus","beverage","boisson","drink","smoothie","cocktail",
  // A different BAKED/PREPARED good made from the same thing.
  "pita","bagel","tortilla","cracker","crackers","biscuit","cookie","cookies",
  "cake","gateau","muffin","pie","tarte","pastry","donut","bun","roll","wrap",
  "chip","chips","crisps","croustilles","popcorn","candy","bonbon","dessert",
  // "-style" and "flavoured" mean it is imitating the thing, not being it.
  "style","flavour","flavor","flavoured","flavored","saveur","arome","aromatise",
  "substitute","alternative","imitation","vegan","vegetalien",
  // Prepared meals are not the raw ingredient.
  "pizza","lasagna","sandwich","burrito","nuggets","fingers","patties","meal","repas",
]);

function rejectGate({ relevanceVocab, offenderVocab, extraAllowedWords, definingVocab, candidateText }, item) {
  // Fat level first: it is cheap, and it is the only thing that separates
  // 2% / 1% / whole / skim milk, which are otherwise the same single word.
  if (candidateText) {
    const clash = fatConflict(`${item.name} ${(item.searchTerms || []).join(" ")}`, candidateText);
    if (clash) {
      return {
        ok: false,
        reason: `wrong milk fat: item is ${clash.want}%, candidate is ${clash.got}%`,
      };
    }
  }

  const iv = itemVocabulary(item);
  /*
   * The item's defining words must be found in the product's NAME, never in
   * its categories_tags.
   *
   * Category tags are far too broad to prove identity. Measured: Gouda,
   * Gruyere, feta, Mozzarella, Monterey Jack, cottage cheese and sour cream
   * all carry a category like "en:fermented-milk-products", whose words
   * include "milk" - so every one of them satisfied a demand for "milk" and
   * got written as the photo for 2% Milk. The run had purged those exact
   * seven rows as wrong moments earlier and then re-matched them.
   *
   * Categories stay useful for RANKING and for tier attribution below, but
   * they cannot on their own establish that this is the right product.
   */
  const defining = definingVocab || relevanceVocab;
  const relFolded = new Set();
  for (const w of defining) for (const f of pluralForms(w)) relFolded.add(f);
  const relHas = (w) => {
    if (defining.has(w) || relFolded.has(w)) return true;
    for (const f of pluralForms(w)) if (defining.has(f) || relFolded.has(f)) return true;
    return false;
  };
  const need = itemKeyWords(item);
  const missing = [];
  for (const w of need) if (!relHas(w)) missing.push(w);
  if (missing.length > 0) {
    return {
      ok: false,
      reason: `missing the item's defining word(s): ${missing.slice(0, 3).join(", ")}`,
    };
  }
  let matchedWord = null;
  for (const w of relevanceVocab) { if (iv.has(w)) { matchedWord = w; break; } }
  if (!matchedWord) return { ok: false, reason: "shares no meaningful word with the item name/searchTerms" };

  const offenders = [];
  for (const w of offenderVocab) {
    if (iv.has(w)) continue;
    if (!PRODUCT_CHANGING_WORDS.has(w)) continue;
    if (extraAllowedWords && extraAllowedWords.has(w)) continue;
    offenders.push(w);
  }
  if (offenders.length > 0) {
    return {
      ok: false,
      reason: `names a different product: ${offenders.slice(0, 4).join(", ")}`,
    };
  }
  return { ok: true, matchedWord };
}

/* ============================================================== lexicon */

/*
 * Small built-in French->English safety net, in case the sibling agent's
 * scratchpad lexicon has not landed yet (or never does). Covers roughly
 * what this project's OWN 39-item test catalogue is likely to meet in
 * Quebec-filed Open Food Facts listings - not meant to be exhaustive. The
 * external file, when present, is merged on top and normally does the real
 * work for the full 1000-item run.
 */
const BUILTIN_FR_EN = {
  beurre: "butter", fromage: "cheese", lait: "milk", oeufs: "eggs", oeuf: "egg",
  poulet: "chicken", boeuf: "beef", riz: "rice", farine: "flour", sucre: "sugar",
  sel: "salt", poivre: "pepper", miel: "honey", vanille: "vanilla", confiture: "jam",
  pain: "bread", epinards: "spinach", tomate: "tomato", tomates: "tomatoes",
  oignon: "onion", oignons: "onions", ail: "garlic", citron: "lemon", banane: "banana",
  bananes: "bananas", fraise: "strawberry", fraises: "strawberries", bleuet: "blueberry",
  bleuets: "blueberries", avocat: "avocado", saumon: "salmon", cafe: "coffee",
  creme: "cream", yogourt: "yogurt", yaourt: "yogurt", brasse: "stirred",
  pates: "pasta", huile: "oil", olive: "olive", levure: "baking", chimique: "powder",
  cornichon: "pickle", cornichons: "pickles", arachide: "peanut", arachides: "peanuts",
  extrait: "extract", naturel: "natural", naturelle: "natural", pomme: "apple",
  pommes: "apples", terre: "earth", patate: "potato", patates: "potatoes",
  grains: "grain", longs: "long", blanc: "white", cremeux: "creamy", moulu: "ground",
  moulue: "ground", noire: "black", noir: "black", cerises: "cherries",
  margarine: "margarine", vegetale: "vegetable", liquide: "liquid",
  pasteurise: "pasteurized", cajou: "cashew", roties: "roasted", grosse: "large",
  gros: "large", petit: "small", tartinade: "spread", biscuits: "biscuits",
  digestifs: "digestives", entiere: "whole", ecreme: "skim", partiellement: "partially",
};

async function loadLexicon() {
  // Prefer the validated, in-repo lexicon (data/frEnGroceryLexicon.json) -
  // it is now real project data, checked in by the sibling process that
  // built it. Fall back to the scratchpad copy (an earlier hand-off point),
  // then to the small built-in list, degrading gracefully at each step.
  let external = {};
  let loadedFrom = null;
  for (const candidate of [REPO_LEXICON, SCRATCHPAD_LEXICON]) {
    try {
      external = JSON.parse(await fs.readFile(candidate, "utf8"));
      loadedFrom = candidate;
      break;
    } catch {
      /* try the next candidate */
    }
  }
  if (loadedFrom) {
    console.log(`  bilingual lexicon: loaded ${Object.keys(external).length} entries from ${loadedFrom}`);
  } else {
    console.log(
      `  bilingual lexicon: neither ${REPO_LEXICON} nor the scratchpad copy was found - using the ${Object.keys(BUILTIN_FR_EN).length}-word built-in fallback`,
    );
  }
  const merged = {};
  for (const [k, v] of Object.entries(BUILTIN_FR_EN)) merged[stripAccents(k.toLowerCase())] = v;
  for (const [k, v] of Object.entries(external)) merged[stripAccents(String(k).toLowerCase())] = v;
  return merged;
}

/* ===================================================== store brand names */

/**
 * Store brand display names, pulled out of data/brands.ts with a regex - a
 * script cannot import TypeScript. Same brittle-on-purpose approach as
 * seed-brand-photos.mjs: fail loudly if the file's shape changed, rather
 * than quietly enumerating zero brands.
 */
async function storeBrandNamesFromFile() {
  const ts = await fs.readFile(BRANDS_TS, "utf8");
  const names = [...ts.matchAll(/name: "([^"]+)"/g)].map((m) => m[1]);
  if (names.length < 10) {
    throw new Error(`Only found ${names.length} brand names in data/brands.ts - the file's shape must have changed.`);
  }
  return names;
}

/* ==================================================== HTTP with retries */

async function fetchJsonWithRetry(url, { attempts = 4, baseDelay = 1000, userAgent = USER_AGENT } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(baseDelay * 2 ** i);
    }
  }
  throw lastErr;
}

/*
 * images.openfoodfacts.org (the photo CDN) turned out to be measurably
 * flakier than search.openfoodfacts.org (the JSON search API) - repeated
 * testing during development hit outright TCP connect timeouts
 * ("Connect Timeout Error ... images.openfoodfacts.org:443") on a real
 * share of requests, with the very next request to the same host often
 * succeeding fine. That is transient connection-level flakiness, not a bad
 * URL, so it is worth a genuine retry rather than immediately giving up on
 * the candidate.
 */
async function downloadBytes(url, { attempts = 3, baseDelay = 800, userAgent = USER_AGENT } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 500) throw new Error("suspiciously small response (placeholder or error page)");
      return buf;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(baseDelay * 2 ** i);
    }
  }
  throw lastErr;
}

/* ============================================== stage 1: OFF enumeration */

const OFF_FIELDS = [
  "code","product_name","product_name_en","product_name_fr",
  "brands","quantity","categories_tags","image_front_url","countries_tags",
].join(",");

async function fetchOffPage(query, page, pageSize) {
  const url =
    `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}` +
    `&page_size=${pageSize}&page=${page}&fields=${OFF_FIELDS}`;
  return fetchJsonWithRetry(url, { attempts: 4, baseDelay: 1200 });
}

/**
 * Page through EVERY Canadian product Open Food Facts has for one store
 * brand. ~14 pages for a brand the size of Great Value (measured: 1395
 * products, page_size=100, zero duplicate codes across pages).
 */
async function enumerateOneBrand(brandName) {
  const rows = [];
  let page = 1;
  let pageCount = 1;
  const query = `brands:"${brandName}" countries_tags:"en:canada"`;
  do {
    const json = await fetchOffPage(query, page, 100);
    const hits = json.hits || [];
    rows.push(...hits);
    pageCount = json.page_count || 0;
    page++;
    if (page <= pageCount) await sleep(OFF_DELAY_MS);
  } while (page <= pageCount && page <= 30); // 30 pages = 3000 products, far beyond any real brand
  return rows;
}

async function enumerateBrandCatalogue(brandNames) {
  const catalogue = {};
  for (const brand of brandNames) {
    try {
      const rows = await enumerateOneBrand(brand);
      catalogue[brand] = rows;
      const withCanada = rows.filter((r) => (r.countries_tags || []).includes("en:canada")).length;
      console.log(
        `  catalogued ${brand}: ${rows.length} products (${withCanada} confirmed en:canada tagged)`,
      );
    } catch (err) {
      catalogue[brand] = [];
      console.log(`  catalogued ${brand}: FAILED (${err.message})`);
    }
    await sleep(OFF_DELAY_MS);
  }
  return catalogue;
}

async function loadOrBuildCatalogue(brandNames, forceRefresh) {
  if (!forceRefresh) {
    try {
      const cached = JSON.parse(await fs.readFile(CATALOGUE_CACHE, "utf8"));
      const total = Object.values(cached).reduce((n, rows) => n + rows.length, 0);
      console.log(`Reusing cached Canadian brand catalogue: ${total} products across ${Object.keys(cached).length} brands.`);
      console.log(`  (${CATALOGUE_CACHE} - pass --recatalogue to rebuild it)`);
      return cached;
    } catch {
      /* no cache yet, or it's unreadable - fall through and build it */
    }
  }
  console.log(`Enumerating the Canadian catalogue for ${brandNames.length} store brands (about ${brandNames.length} x a few requests, once)...`);
  const catalogue = await enumerateBrandCatalogue(brandNames);
  await fs.mkdir(SCRATCHPAD, { recursive: true });
  await fs.writeFile(CATALOGUE_CACHE, JSON.stringify(catalogue));
  const total = Object.values(catalogue).reduce((n, rows) => n + rows.length, 0);
  console.log(`Catalogue built: ${total} Canadian products. Cached to ${CATALOGUE_CACHE}.\n`);
  return catalogue;
}

/* ================================================ stage 2: local matching */

/**
 * The four vocabulary signals for one Open Food Facts row, described at the
 * top of this file. Computed once per row the first time it is needed.
 */
/**
 * Translate French text through the lexicon with GREEDY LONGEST-MATCH, not
 * word-by-word. The real lexicon (data/frEnGroceryLexicon.json) is full of
 * multi-word entries that carry meaning a word-by-word lookup would never
 * find - "fromage a la creme" -> "cream cheese", "noix de cajou" ->
 * "cashews" - and worse, translating those word-by-word risks the WRONG
 * meaning ("cajou" alone is not a word; "noix" alone is "nuts", losing the
 * specific cashew). So at each position, try the longest phrase (up to 7
 * words - the lexicon's own longest key) that exists in the lexicon before
 * falling back to a single word.
 */
function lexiconTranslate(text, lexicon, maxNgram = 7) {
  const words = stripAccents(String(text).toLowerCase())
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set();
  let i = 0;
  while (i < words.length) {
    let matched = false;
    for (let n = Math.min(maxNgram, words.length - i); n >= 1; n--) {
      const phrase = words.slice(i, i + n).join(" ");
      const en = lexicon[phrase];
      if (en) {
        for (const w of tokenize(en)) out.add(w);
        i += n;
        matched = true;
        break;
      }
    }
    if (!matched) i++;
  }
  return out;
}

function candidateSignals(row, lexicon) {
  const catWords = new Set();
  for (const tag of row.categories_tags || []) {
    if (!tag.startsWith("en:")) continue;
    for (const w of tokenize(tag.slice(3).replace(/-/g, " "))) if (!STOPWORDS.has(w)) catWords.add(w);
  }

  const hasName = row.product_name && row.product_name !== "undefined";
  const nameEn = row.product_name_en && row.product_name_en !== "undefined" ? wordSet(row.product_name_en) : new Set();
  const rawName = hasName ? wordSet(row.product_name) : new Set();
  const lexWords = hasName ? lexiconTranslate(row.product_name, lexicon) : new Set();

  return { catWords, nameEn, lexWords, rawName };
}

/** Which tier's words actually produced the match, for the coverage report. */
function attributeTier(signals, matchedWord) {
  if (signals.catWords.has(matchedWord)) return "categories_tags";
  if (signals.nameEn.has(matchedWord)) return "product_name_en";
  if (signals.lexWords.has(matchedWord)) return "french_lexicon";
  return "raw_name";
}

function evaluateOffCandidate(row, item, brandWords, lexicon) {
  const signals = candidateSignals(row, lexicon);
  // Name-derived words are the offender scan (see rejectGate's comment for
  // why categories_tags must NOT be in that scan); the relevance check gets
  // categories_tags added on top, since a shared category word is a valid,
  // even preferred, way to find the match in the first place.
  const nameVocab = new Set([...signals.nameEn, ...signals.lexWords, ...signals.rawName]);
  const relevanceVocab = new Set([...signals.catWords, ...nameVocab]);
  const verdict = rejectGate(
    {
      relevanceVocab,
      offenderVocab: nameVocab,
      extraAllowedWords: brandWords,
      definingVocab: nameVocab,
      // Raw text, not the word set: the fat check needs the "%" that
      // tokenizing throws away.
      candidateText: [row.product_name, row.product_name_en, row.quantity]
        .filter((s) => s && s !== "undefined")
        .join(" "),
    },
    item,
  );
  if (!verdict.ok) return verdict;
  return { ok: true, tier: attributeTier(signals, verdict.matchedWord) };
}

/**
 * Best surviving candidates for ONE item, against EVERY store brand's
 * cached catalogue - all in memory, no network. Keeps up to 3 per brand
 * (shortest/cleanest product_name first, since that is the one pre-download
 * signal available for OFF rows) so a download or pipeline failure on the
 * top pick can fall through to the next rather than giving up on the whole
 * brand.
 */
function resolveBrandCandidates(item, catalogue, brandNames, lexicon) {
  const results = new Map();
  for (const brandName of brandNames) {
    const rows = catalogue[brandName] || [];
    if (rows.length === 0) continue;
    const brandWords = wordSet(brandName);
    const survivors = [];
    for (const row of rows) {
      if (!row.image_front_url) continue;
      if (!row.product_name || row.product_name === "undefined") continue;
      const verdict = evaluateOffCandidate(row, item, brandWords, lexicon);
      if (verdict.ok) survivors.push({ row, tier: verdict.tier });
    }
    if (survivors.length === 0) continue;
    survivors.sort((a, b) => a.row.product_name.length - b.row.product_name.length);
    // Keep the top 5 (not just 1) survivors: the ranking here is by name
    // length only (no pre-download resolution/border-whiteness signal for
    // OFF rows), so the "cleanest name" pick occasionally turns out to be a
    // too-small photo or a background-removal casualty once actually
    // downloaded - measured during testing (378x207 and 400x225 photos both
    // failing the 250px gate). A deeper bench gives the per-brand attempt
    // loop somewhere to fall through to instead of giving up on the brand.
    results.set(brandName, survivors.slice(0, 5));
  }
  return results;
}

/* Legacy endpoint - gap-filler ONLY, never in the main per-item path. */
async function legacySearchCanada(terms) {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", terms);
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "24");
  url.searchParams.set("fields", "code,product_name,brands,quantity,image_front_url");
  url.searchParams.set("tagtype_0", "countries");
  url.searchParams.set("tag_contains_0", "contains");
  url.searchParams.set("tag_0", "canada");
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).products ?? [];
}
async function legacySearchWithRetry(terms) {
  try {
    return await legacySearchCanada(terms);
  } catch (err) {
    if (!String(err.message).includes("503")) throw err;
    await sleep(LEGACY_RETRY_MS);
    return await legacySearchCanada(terms);
  }
}

/* ========================================== retailer TSVs (generic items) */

/**
 * name<TAB>path, one row per product, harvested by a sibling process (see
 * this file's header - DEFECT 3). Tolerant of a missing file: returns an
 * empty list rather than throwing, so a run with only one TSV present still
 * works, and the per-item gap reason ends up saying so.
 */
async function parseTsv(path) {
  let raw;
  try {
    raw = await fs.readFile(path, "utf8");
  } catch {
    return null; // file not found - distinct from "found but empty"
  }
  return raw
    .split(/\r?\n/)
    .map((line) => line.split("\t"))
    .filter((parts) => parts.length === 2 && parts[0].trim() && parts[1].trim())
    .map(([name, path_]) => ({ name: name.trim(), path: path_.trim() }));
}

async function loadRetailerCatalogues() {
  const walmart = await parseTsv(WALMART_TSV);
  const loblaws = await parseTsv(LOBLAWS_TSV);
  console.log(
    `Retailer catalogues: Walmart ${walmart === null ? "TSV NOT FOUND" : `${walmart.length} rows`} (${WALMART_TSV}), ` +
      `Loblaws ${loblaws === null ? "TSV NOT FOUND" : `${loblaws.length} rows`} (${LOBLAWS_TSV})`,
  );
  return { walmart: walmart || [], loblaws: loblaws || [] };
}

const walmartImageUrl = (path) => `${WALMART_IMAGE_BASE}${path}${WALMART_IMAGE_PARAMS}`;
const loblawsImageUrl = (path) => `${LOBLAWS_IMAGE_BASE}${path}`;

/**
 * Naive English singular/plural folding, used ONLY by the retailer matcher
 * below - NOT mixed into the shared rejectGate() the brand/OFF paths use,
 * so this cannot change any brand-matching behaviour. Justified because
 * these two TSVs are terse retailer catalogue names ("Tomato, Roma", "Navel
 * Orange") that do not reliably carry the SAME inflection as the item's own
 * name/searchTerms the way a real OFF product listing usually does -
 * measured directly: without folding, "Navel Orange" (singular) is rejected
 * for the "Navel Oranges" item on the word "orange" alone, and "Tomato,
 * Roma" is rejected for "Roma Tomatoes" on "tomato" alone. Folding both into
 * the comparison fixes exactly that class of false reject without loosening
 * anything else - verified against all 213 generic items with a dry run
 * before this went anywhere near a real fetch: only 3 outcomes changed
 * (clementines, red-onion, roma-tomatoes), all correct, zero new false
 * accepts among the ~250 rejected-but-shared-a-word candidate pairs.
 */
function pluralForms(word) {
  const forms = new Set([word]);
  if (word.endsWith("ies") && word.length > 4) forms.add(word.slice(0, -3) + "y");
  else if (word.endsWith("es") && word.length > 3) forms.add(word.slice(0, -2));
  else if (word.endsWith("s") && word.length > 3) forms.add(word.slice(0, -1));
  else forms.add(word + "s");
  return forms;
}

/**
 * The retailer-TSV equivalent of evaluateOffCandidate() (the Commons
 * equivalent this used to also mirror, evaluateCommonsCandidate(), was
 * removed with the rest of the Wikimedia path - see this file's header) -
 * same two-check shape as rejectGate() (relevance, then a modifier-word
 * offender scan against DESCRIPTOR_WORDS/STOPWORDS/UNIT_WORDS, the same
 * shared sets brand matching uses), plus the plural fold above. A TSV row
 * has no brand and no categories_tags, so relevanceVocab and offenderVocab
 * are the same single word set - the same shape evaluateOffCandidate falls
 * back to when a candidate carries no category signal.
 */
function evaluateRetailerCandidate(rowName, item) {
  const clash = fatConflict(`${item.name} ${(item.searchTerms || []).join(" ")}`, rowName);
  if (clash) {
    return { ok: false, reason: `wrong milk fat: item is ${clash.want}%, candidate is ${clash.got}%` };
  }
  const rowWords = wordSet(rowName);
  const iv = itemVocabulary(item);
  const ivFolded = new Set();
  for (const w of iv) for (const f of pluralForms(w)) ivFolded.add(f);
  const has = (w) => iv.has(w) || ivFolded.has(w);

  // Same all-words rule as rejectGate(). A retailer row has to carry every
  // defining word of the item, not just one of them - "Mini Cucumbers" and
  // "English Cucumber" are different products on the same shelf, and one
  // shared word cannot tell them apart.
  const rowFolded = new Set();
  for (const w of rowWords) for (const f of pluralForms(w)) rowFolded.add(f);
  const rowHas = (w) => rowWords.has(w) || rowFolded.has(w);
  const missing = [];
  for (const w of itemKeyWords(item)) if (!rowHas(w)) missing.push(w);
  if (missing.length > 0) {
    return {
      ok: false,
      reason: `missing the item's defining word(s): ${missing.slice(0, 3).join(", ")}`,
    };
  }

  let matchedWord = null;
  for (const w of rowWords) {
    if (has(w)) {
      matchedWord = w;
      break;
    }
  }
  if (!matchedWord) return { ok: false, reason: "shares no meaningful word with the item name/searchTerms" };

  const offenders = [];
  for (const w of rowWords) {
    if (has(w)) continue;
    if (!PRODUCT_CHANGING_WORDS.has(w)) continue;
    offenders.push(w);
  }
  if (offenders.length > 0) {
    return {
      ok: false,
      reason: `names a different product: ${offenders.slice(0, 4).join(", ")}`,
    };
  }
  return { ok: true, matchedWord };
}

/**
 * Surviving rows for one generic item, best (shortest/cleanest name, same
 * convention resolveBrandCandidates uses) first.
 */
function resolveRetailerCandidates(item, rows) {
  const survivors = [];
  for (const row of rows) {
    const verdict = evaluateRetailerCandidate(row.name, item);
    if (verdict.ok) survivors.push(row);
  }
  survivors.sort((a, b) => a.name.length - b.name.length);
  return survivors.slice(0, 5);
}

/* ==================================================== background removal */

/**
 * Sample ~40 evenly spaced points along each of the 4 edges. Returns how
 * white the border is (decides the path) AND the average border colour
 * (the flood fill's reference "this is background" colour, so the two
 * pieces of work share one pass over the pixels).
 */
function sampleBorder(raw, width, height, channels) {
  const N = 40;
  const points = [];
  for (let i = 0; i < N; i++) {
    const x = Math.round((i / (N - 1)) * (width - 1));
    points.push([x, 0], [x, height - 1]);
  }
  for (let i = 0; i < N; i++) {
    const y = Math.round((i / (N - 1)) * (height - 1));
    points.push([0, y], [width - 1, y]);
  }
  let white = 0;
  let rSum = 0, gSum = 0, bSum = 0;
  for (const [x, y] of points) {
    const o = (y * width + x) * channels;
    const r = raw[o], g = raw[o + 1], b = raw[o + 2];
    rSum += r; gSum += g; bSum += b;
    if (r > WHITE_THRESHOLD && g > WHITE_THRESHOLD && b > WHITE_THRESHOLD) white++;
  }
  return {
    whiteRatio: white / points.length,
    reference: { r: rSum / points.length, g: gSum / points.length, b: bSum / points.length },
  };
}

/**
 * BFS flood fill inward from the border, tolerance measured against the
 * FIXED reference colour from sampleBorder() (not against each pixel's
 * immediate neighbour). A neighbour-chained tolerance is the more common
 * flood-fill implementation, but it drifts: a long, very gradually shading
 * background can walk the accumulated tolerance step by step into the
 * product with nothing that looks locally wrong. Comparing every candidate
 * pixel back to the same fixed reference throughout does not drift, at the
 * cost of being slightly less forgiving of a background with a real
 * gradient across it - an acceptable trade for product photography, which
 * is mostly shot on a materially flat background.
 */
function floodFillBackground(raw, width, height, channels, reference, tolerance) {
  const total = width * height;
  const visited = new Uint8Array(total);
  const alpha = new Uint8Array(total).fill(255);
  const queue = new Int32Array(total);
  let qHead = 0, qTail = 0;

  function tryFill(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    const o = i * channels;
    const dr = raw[o] - reference.r, dg = raw[o + 1] - reference.g, db = raw[o + 2] - reference.b;
    if (Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db)) > tolerance) return;
    visited[i] = 1;
    alpha[i] = 0;
    queue[qTail++] = i;
  }

  for (let x = 0; x < width; x++) { tryFill(x, 0); tryFill(x, height - 1); }
  for (let y = 0; y < height; y++) { tryFill(0, y); tryFill(width - 1, y); }
  while (qHead < qTail) {
    const i = queue[qHead++];
    const x = i % width, y = (i / width) | 0;
    tryFill(x - 1, y); tryFill(x + 1, y); tryFill(x, y - 1); tryFill(x, y + 1);
  }
  return alpha;
}

/** Soften the hard 0/255 mask edge by ~1px so it does not alias. */
async function featherAlpha(alpha, width, height) {
  return sharp(Buffer.from(alpha), { raw: { width, height, channels: 1 } })
    .blur(0.7)
    .raw()
    .toBuffer();
}

function combineRgbAlpha(rgbaSrc, alphaChannel, width, height) {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    out[i * 4] = rgbaSrc[i * 4];
    out[i * 4 + 1] = rgbaSrc[i * 4 + 1];
    out[i * 4 + 2] = rgbaSrc[i * 4 + 2];
    out[i * 4 + 3] = alphaChannel[i];
  }
  return out;
}

/* ----- the ML path: @imgly/background-removal-node, warmed up once ----- */

let mlModule = null;
let mlAvailable = null; // null = untested
let mlWarmupMs = null;
let mlDegradedCount = 0;

async function ensureMlReady() {
  if (mlAvailable !== null) return mlAvailable;
  try {
    mlModule = await import("@imgly/background-removal-node");
    // A tiny synthetic JPEG just to force the model load. Package quirk,
    // confirmed by reading its source (src/codecs.ts): it wraps a raw
    // Buffer in `new Blob([bytes])` with NO type, and its decoder switches
    // on blob.type - so an untyped Blob hits the `default:` branch and
    // throws "Unsupported format: " (empty string). Every call below
    // constructs the Blob with an explicit MIME type for this reason.
    const tiny = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .jpeg()
      .toBuffer();
    const blob = new Blob([tiny], { type: "image/jpeg" });
    const t0 = Date.now();
    await mlModule.removeBackground(blob, { model: "medium" });
    mlWarmupMs = Date.now() - t0;
    mlAvailable = true;
    console.log(`  ML background removal: ready (warm-up ${mlWarmupMs}ms, includes first-use model load)`);
  } catch (err) {
    console.log(`  ML background removal is NOT usable: ${err.message}`);
    console.log("  Falling back to flood-fill with a looser tolerance for every non-white-border image this run.");
    mlAvailable = false;
  }
  return mlAvailable;
}

async function removeBackgroundMl(bytes, format) {
  const mimeMap = { jpeg: "image/jpeg", jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
  const blob = new Blob([bytes], { type: mimeMap[format] || "image/jpeg" });
  const t0 = Date.now();
  const outBlob = await mlModule.removeBackground(blob, { model: "medium" });
  const ms = Date.now() - t0;
  const buf = Buffer.from(await outBlob.arrayBuffer());
  return { buffer: buf, ms };
}

/**
 * DEFECT 3 (Loblaws source): some Loblaws PNGs ship already cut out on a
 * transparent background (measured: broccoli 20145621001_EA, red onion
 * 20134101001_KG). Running those through flood-fill/ML anyway would be at
 * best wasted work and at worst wrong - sampleBorder() reads RGB channels
 * only and ignores alpha, so a transparent border's UNDERLYING rgb (often
 * black or whatever the canvas defaulted to, not white) can easily measure
 * as "not a white border" and get routed into ML background removal, which
 * has nothing left to usefully do to an image that is already cut out.
 * Decide up front, from the alpha channel itself: hasAlpha in the metadata
 * is not enough on its own (plenty of ordinary opaque PNGs carry an
 * always-255 alpha channel for no reason) - only a LOW average border alpha
 * means the border itself is actually see-through.
 */
async function detectExistingTransparency(bytes) {
  const meta = await sharp(bytes).metadata();
  if (!meta.hasAlpha) return { transparent: false };
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const N = 40;
  let aSum = 0, count = 0;
  for (let i = 0; i < N; i++) {
    const x = Math.round((i / (N - 1)) * (width - 1));
    aSum += data[(0 * width + x) * 4 + 3] + data[((height - 1) * width + x) * 4 + 3];
    count += 2;
  }
  for (let i = 0; i < N; i++) {
    const y = Math.round((i / (N - 1)) * (height - 1));
    aSum += data[(y * width + 0) * 4 + 3] + data[(y * width + (width - 1)) * 4 + 3];
    count += 2;
  }
  const avgBorderAlpha = aSum / count;
  if (avgBorderAlpha >= PRE_TRANSPARENT_BORDER_ALPHA) return { transparent: false };
  return { transparent: true, rgba: data, width, height };
}

/** Picks the path, runs it, always returns a raw RGBA buffer + which path ran. */
async function removeBackgroundForCandidate(bytes, format) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const { whiteRatio, reference } = sampleBorder(data, width, height, 4);

  if (whiteRatio >= WHITE_RATIO_CUTOFF) {
    const alpha = floodFillBackground(data, width, height, 4, reference, FLOOD_TOLERANCE);
    const feathered = await featherAlpha(alpha, width, height);
    return { rgba: combineRgbAlpha(data, feathered, width, height), width, height, path: "flood-fill", whiteRatio };
  }

  const ready = await ensureMlReady();
  if (ready) {
    const { buffer: outBuf, ms } = await removeBackgroundMl(bytes, format);
    const { data: outData, info: outInfo } = await sharp(outBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return { rgba: outData, width: outInfo.width, height: outInfo.height, path: "ml", whiteRatio, mlMs: ms };
  }

  mlDegradedCount++;
  const alpha = floodFillBackground(data, width, height, 4, reference, FLOOD_TOLERANCE_DEGRADED);
  const feathered = await featherAlpha(alpha, width, height);
  return {
    rgba: combineRgbAlpha(data, feathered, width, height),
    width,
    height,
    path: "flood-fill-degraded",
    whiteRatio,
  };
}

/* ------------------------------------------------------- shared normalize */

/**
 * trim -> pad to square (~6% margin) -> resize 600x600 contain -> PNG.
 * Shared by both background-removal paths. Returns a reject reason instead
 * of throwing when the result fails the final sanity gate, so the caller
 * can fall through to the next candidate.
 */
async function normalizeCutout(rgba, width, height) {
  const ALPHA_THRESHOLD = 10;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { ok: false, reason: "cutout is fully transparent - background removal ate the whole image" };

  const trimmedW = maxX - minX + 1, trimmedH = maxY - minY + 1;
  const trimmed = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: trimmedW, height: trimmedH })
    .png()
    .toBuffer();

  const squareSize = Math.ceil(Math.max(trimmedW, trimmedH) / SQUARE_MARGIN);
  const squared = await sharp({
    create: { width: squareSize, height: squareSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: trimmed,
        left: Math.round((squareSize - trimmedW) / 2),
        top: Math.round((squareSize - trimmedH) / 2),
      },
    ])
    .png()
    .toBuffer();

  const final = await sharp(squared)
    .resize(FINAL_SIZE, FINAL_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png(PNG_QUANTIZE_OPTS)
    .toBuffer();

  const { data, info } = await sharp(final).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  let opaque = 0;
  for (let i = 0; i < total; i++) if (data[i * 4 + 3] >= 128) opaque++;
  const coverage = opaque / total;

  if (coverage < MIN_OPAQUE_COVERAGE) {
    return { ok: false, reason: `opaque coverage ${(coverage * 100).toFixed(1)}% is under 12% - the cutout likely ate the product` };
  }
  if (coverage > MAX_OPAQUE_COVERAGE) {
    return { ok: false, reason: `opaque coverage ${(coverage * 100).toFixed(1)}% is over 98% - background likely was not removed` };
  }
  return { ok: true, buffer: final, coveragePct: coverage * 100 };
}

async function processCandidate(bytes) {
  let meta;
  try {
    meta = await sharp(bytes).metadata();
  } catch {
    return { ok: false, reason: "not a decodable image" };
  }
  if (!meta.width || !meta.height) return { ok: false, reason: "not a decodable image" };
  if (Math.min(meta.width, meta.height) < MIN_SHORT_SIDE) {
    return { ok: false, reason: `image too small (${meta.width}x${meta.height}) - short side under ${MIN_SHORT_SIDE}px` };
  }
  if (!["jpeg", "png", "webp"].includes(meta.format)) {
    return { ok: false, reason: `unsupported source format: ${meta.format}` };
  }

  const pre = await detectExistingTransparency(bytes);
  const removed = pre.transparent
    ? { rgba: pre.rgba, width: pre.width, height: pre.height, path: "already-transparent" }
    : await removeBackgroundForCandidate(bytes, meta.format);
  const normalized = await normalizeCutout(removed.rgba, removed.width, removed.height);
  if (!normalized.ok) return normalized;

  return {
    ok: true,
    buffer: normalized.buffer,
    path: removed.path,
    mlMs: removed.mlMs,
    coveragePct: normalized.coveragePct,
    sourceDims: `${meta.width}x${meta.height}`,
  };
}

/* ========================================================= run-state I/O */

function createMutex() {
  let chain = Promise.resolve();
  return (fn) => {
    const run = chain.then(fn, fn);
    chain = run.then(
      () => {},
      () => {},
    );
    return run;
  };
}

async function readJsonOrDefault(path, fallback) {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

function createStats() {
  return {
    floodFill: 0,
    floodFillDegraded: 0,
    ml: 0,
    mlTimes: [],
    alreadyTransparent: 0,
    retailerSource: {},
    wrote: 0,
    rejected: 0,
    rejectReasons: {},
    tierCounts: {},
    perItemMs: [],
  };
}

/* ========================================================= main pipeline */

async function backupBrandPhotosOnce() {
  try {
    const current = await fs.readFile(BRAND_PHOTOS_JSON, "utf8");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = join(SCRATCHPAD, `brandPhotos.backup.${stamp}.json`);
    await fs.mkdir(SCRATCHPAD, { recursive: true });
    await fs.writeFile(backupPath, current);
    console.log(`Backed up data/brandPhotos.json -> ${backupPath}`);
  } catch {
    console.log("No existing data/brandPhotos.json found to back up (that's fine on a first run).");
  }
}

/**
 * DEFECT 2 fix: the additive merge (this file's own "RESUMABILITY" section
 * above) has always assumed every entry already on disk - a .jpg from the
 * old seed-brand-photos.mjs, or a .png from an earlier run of THIS script -
 * is already good, and never re-checked it. That assumption is false:
 * data/brandPhotos.json's "butter" key currently maps kirklandsignature,
 * greatvalue AND noname to peanut butter (see this file's header - the
 * textbook case the modifier-word guard exists to catch, which slipped in
 * BEFORE that guard existed and was then preserved, untouched, by every
 * run since). Run the SAME rejectGate() every new candidate goes through
 * over every entry already on disk. The old pipeline never recorded
 * categories_tags, so the closest reconstruction is the entry's own `name`
 * (translated through the lexicon, same as a fresh OFF row's product_name
 * would be) with `brand` as the allowed brand-word set - narrower than a
 * live OFF row's signals, never wider, so this is if anything stricter than
 * the live path, not looser.
 *
 * A removed entry's underlying file is deleted too, unless another
 * SURVIVING entry still points at that exact path (a few brand variants in
 * this data share one downloaded file). The brand slot is then simply gone
 * from brandPhotos.json, so the ordinary per-item loop that follows treats
 * it as unmatched and attempts a fresh candidate, subject to the same
 * guard - same as any other gap. Runs unconditionally, every run: a pure
 * in-memory pass over ~100 entries, no network cost.
 */
async function validateExistingBrandPhotos(brandPhotos, items, lexicon) {
  const itemBySlug = new Map();
  for (const item of items) {
    const key = slug(item.name);
    if (!itemBySlug.has(key)) itemBySlug.set(key, item);
  }

  const decisions = [];
  for (const [productKey, brands] of Object.entries(brandPhotos)) {
    const item = itemBySlug.get(productKey);
    for (const [brandKey, entry] of Object.entries(brands)) {
      if (!item) {
        // Nothing in the current 1000-item catalogue carries this product
        // name any more - nothing to validate against, and the per-item
        // loop that follows will never revisit it either way. Leave it.
        decisions.push({ productKey, brandKey, entry, keep: true });
        continue;
      }
      // Hand-picked photographs live in PRODUCT_BRAND_AT (data/brands.ts),
      // which this script never writes to, so they are safe by construction.
      // This only catches a legacy entry left behind in the manifest.
      if (entry.pinned || String(entry.image || "").includes("/pinned-")) {
        // Chosen by hand. The word matcher does not get a vote on it - that
        // is the entire reason it was pinned.
        decisions.push({ productKey, brandKey, entry, keep: true });
        continue;
      }
      const nameVocab = new Set([...wordSet(entry.name), ...lexiconTranslate(entry.name || "", lexicon)]);
      const brandWords = wordSet(entry.brand || brandKey);
      const verdict = rejectGate(
        {
          relevanceVocab: nameVocab,
          offenderVocab: nameVocab,
          extraAllowedWords: brandWords,
          // The stored name and size verbatim. Without this the milk-fat
          // check cannot run here, and an entry written before that check
          // existed - a 2% carton filed as Whole Milk - survives every
          // subsequent run untouched, because nothing else can tell them
          // apart once "2%" has been tokenized away.
          candidateText: [entry.name, entry.size].filter(Boolean).join(" "),
        },
        item,
      );
      decisions.push({ productKey, brandKey, entry, keep: verdict.ok, reason: verdict.ok ? null : verdict.reason });
    }
  }

  const keptFiles = new Set();
  for (const d of decisions) if (d.keep && d.entry.image) keptFiles.add(d.entry.image.toLowerCase());

  const removed = [];
  for (const d of decisions) {
    if (d.keep) continue;
    delete brandPhotos[d.productKey][d.brandKey];
    if (Object.keys(brandPhotos[d.productKey]).length === 0) delete brandPhotos[d.productKey];
    removed.push({
      productKey: d.productKey,
      brandKey: d.brandKey,
      brand: d.entry.brand,
      name: d.entry.name,
      image: d.entry.image,
      reason: d.reason,
    });

    const imgLower = (d.entry.image || "").toLowerCase();
    if (imgLower && !keptFiles.has(imgLower)) {
      const fp = join(ROOT, "public", d.entry.image.replace(/^\//, "").replace(/\//g, "\\"));
      try {
        await fs.unlink(fp);
      } catch {
        /* file already gone, or never existed on this machine - fine either way */
      }
    }
  }

  return removed;
}

/** Attempts every store brand for one BRAND-mode item. */
async function attemptBrandItem(item, ctx) {
  const productSlugKey = slug(item.name);
  const candidatesByBrand = resolveBrandCandidates(item, ctx.catalogue, ctx.brandNames, ctx.lexicon);
  const attempts = [];
  let wrote = 0;
  let skippedExisting = 0; // brands that matched but already have a photo on file (legacy or ours)

  for (const [brandName, survivors] of candidatesByBrand) {
    const brandKey = flatten(brandName);
    const existing = ctx.brandPhotos[productSlugKey]?.[brandKey];
    const existingImage = (existing?.image || "").toLowerCase();
    // Hand-picked, so not ours to touch - not even on --refresh. Checked by
    // the flag AND the filename, because the extension guards below only knew
    // about .jpg and .png and a pinned .avif sailed straight past them.
    if (existing?.pinned || existingImage.includes("/pinned-")) { skippedExisting++; continue; }
    if (existingImage.endsWith(".jpg")) { skippedExisting++; continue; } // pre-existing legacy photo - never touched
    if (existingImage.endsWith(".png") && !ctx.refresh) { skippedExisting++; continue; } // ours already, only --refresh redoes it

    let outcome = { ok: false, reason: "no candidate downloaded" };
    for (const candidate of survivors) {
      try {
        const bytes = await downloadBytes(candidate.row.image_front_url);
        const processed = await processCandidate(bytes);
        if (!processed.ok) {
          outcome = processed;
          continue;
        }

        const brandSlug = slug(brandName);
        const fileName = `${brandSlug}-${item.id}.png`.replace(/-+/g, "-");
        await fs.mkdir(BRAND_PHOTO_DIR, { recursive: true });
        await fs.writeFile(join(BRAND_PHOTO_DIR, fileName), processed.buffer);

        ctx.brandPhotos[productSlugKey] ??= {};
        ctx.brandPhotos[productSlugKey][brandKey] = {
          brand: brandName,
          name: candidate.row.product_name.trim(),
          ...(candidate.row.quantity ? { size: candidate.row.quantity.trim() } : {}),
          image: `${BRAND_PHOTO_URL}/${fileName}`,
          code: candidate.row.code,
          source: candidate.row.image_front_url,
        };

        outcome = { ok: true, tier: candidate.tier, path: processed.path, mlMs: processed.mlMs, coveragePct: processed.coveragePct };
        wrote++;
        break;
      } catch (err) {
        outcome = { ok: false, reason: err.message };
      }
    }

    if (outcome.ok) {
      ctx.stats.wrote++;
      ctx.stats.tierCounts[outcome.tier] = (ctx.stats.tierCounts[outcome.tier] || 0) + 1;
      if (outcome.path === "flood-fill") ctx.stats.floodFill++;
      else if (outcome.path === "flood-fill-degraded") ctx.stats.floodFillDegraded++;
      else if (outcome.path === "ml") {
        ctx.stats.ml++;
        if (outcome.mlMs) ctx.stats.mlTimes.push(outcome.mlMs);
      }
    } else if (survivors.length > 0) {
      ctx.stats.rejected++;
      ctx.stats.rejectReasons[outcome.reason] = (ctx.stats.rejectReasons[outcome.reason] || 0) + 1;
    }
    attempts.push({ brand: brandName, outcome });
  }

  await ctx.saveBrandPhotos();

  // Only a REAL gap - no new photo, and nothing already covers this item -
  // gets recorded. If every brand that matched already has a photo on file
  // (even one from the old, less-strict pipeline - see the file header's
  // note about the mislabeled Kirkland "butter" entry), that is not a gap
  // needing a manual pass, it is "nothing new was needed here".
  const alreadyCovered = wrote === 0 && attempts.length === 0 && skippedExisting > 0;

  // A gap recorded on an EARLIER run (a different offQuery, a catalogue
  // that has since grown, a since-loosened rule) can go stale the moment a
  // later run succeeds or turns out to already be covered. Nothing was
  // clearing it, so data/imageGaps.json would keep listing an item as
  // needing manual attention long after it no longer did.
  if (wrote > 0 || alreadyCovered) await ctx.clearGap(item.id);

  if (wrote === 0 && !alreadyCovered) {
    ctx.stats.tierCounts.none = (ctx.stats.tierCounts.none || 0) + 1;
    const reasons =
      attempts.length > 0
        ? attempts.map((a) => `${a.brand}: ${a.outcome.reason}`).join("; ")
        : "no store brand had ANY matching Canadian product in the enumerated catalogue";
    await ctx.recordGap(item, "brand", reasons);
  }
  return { wrote, brandsAttempted: attempts.length, alreadyCovered, skippedExisting };
}

/**
 * One GENERIC item: Walmart Canada first, Loblaws second, gap otherwise -
 * see this file's header (DEFECT 3) for why Wikimedia/OFF were dropped
 * entirely rather than kept as a fallback. Same shape as attemptBrandItem:
 * try each survivor in preference order, fall through on a download/process
 * failure instead of giving up on the whole item.
 */
async function attemptGenericItem(item, ctx) {
  const existing = ctx.itemPhotos[item.id];
  if (existing && !ctx.refresh) return { wrote: 0, skipped: true };

  const attempts = [];
  let picked = null;

  for (const [sourceName, rows, urlFor] of [
    ["walmart", ctx.retailers.walmart, walmartImageUrl],
    ["loblaws", ctx.retailers.loblaws, loblawsImageUrl],
  ]) {
    if (picked) break;
    const survivors = resolveRetailerCandidates(item, rows);
    if (survivors.length === 0) {
      attempts.push(`${sourceName}: no candidate row matched (${rows.length} rows in TSV)`);
      continue;
    }
    let lastReason = null;
    for (const row of survivors) {
      const url = urlFor(row.path);
      try {
        const bytes = await downloadBytes(url, { userAgent: RETAILER_USER_AGENT });
        const processed = await processCandidate(bytes);
        if (processed.ok) {
          picked = { processed, title: row.name, source: sourceName, sourceUrl: url };
          break;
        }
        lastReason = processed.reason;
      } catch (err) {
        lastReason = err.message;
      }
      await sleep(RETAILER_DELAY_MS); // politeness gap - only reached when this candidate did NOT succeed
    }
    if (!picked) attempts.push(`${sourceName}: matched "${survivors[0].name}"${survivors.length > 1 ? ` (+${survivors.length - 1} more)` : ""} but ${lastReason || "every candidate failed"}`);
  }

  if (!picked) {
    const reason =
      attempts.length > 0
        ? attempts.join("; ")
        : "neither retailer TSV was loaded (see the catalogue line at startup)";
    await ctx.recordGap(item, "generic", reason);
    return { wrote: 0 };
  }

  const fileName = `${item.id}.png`; // bare item id - see the note by BRAND_PHOTO_DIR on why this can't collide with a brand file
  await fs.mkdir(BRAND_PHOTO_DIR, { recursive: true });
  await fs.writeFile(join(BRAND_PHOTO_DIR, fileName), picked.processed.buffer);

  ctx.itemPhotos[item.id] = {
    name: picked.title,
    image: `${BRAND_PHOTO_URL}/${fileName}`,
    source: picked.sourceUrl,
    attribution: picked.source === "walmart" ? "Walmart Canada product photo" : "Loblaws product photo",
  };
  await ctx.saveItemPhotos();
  await ctx.clearGap(item.id); // in case an earlier run recorded this item as a gap

  ctx.stats.wrote++;
  ctx.stats.retailerSource[picked.source] = (ctx.stats.retailerSource[picked.source] || 0) + 1;
  const p = picked.processed;
  if (p.path === "flood-fill") ctx.stats.floodFill++;
  else if (p.path === "flood-fill-degraded") ctx.stats.floodFillDegraded++;
  else if (p.path === "already-transparent") ctx.stats.alreadyTransparent++;
  else if (p.path === "ml") {
    ctx.stats.ml++;
    if (p.mlMs) ctx.stats.mlTimes.push(p.mlMs);
  }
  return { wrote: 1, detail: `${picked.source}:${p.path}` };
}

async function attemptItem(item, ctx) {
  if (item.imageMode === "generic") return attemptGenericItem(item, ctx);
  return attemptBrandItem(item, ctx);
}

/** Bounded-concurrency pool. Default 1 keeps this as serial/resumable as seed-brand-photos.mjs. */
async function runPool(items, concurrency, worker) {
  let idx = 0;
  const results = new Array(items.length);
  async function runOne() {
    while (idx < items.length) {
      const i = idx++;
      const t0 = Date.now();
      try {
        const r = await worker(items[i], i);
        results[i] = { ms: Date.now() - t0, ...r };
      } catch (err) {
        results[i] = { ms: Date.now() - t0, error: err.message };
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, runOne));
  return results;
}

/* =================================================== gap-filler (legacy) */

async function runLegacyGapFiller(gapItems, ctx) {
  const brandGaps = gapItems.filter((it) => it.imageMode !== "generic");
  if (brandGaps.length === 0) return;

  console.log(`\nLegacy gap-filler pass (world.openfoodfacts.org/cgi/search.pl, ${LEGACY_DELAY_MS / 1000}s spacing) for ${brandGaps.length} item(s) still missing a brand photo...`);

  for (const [i, item] of brandGaps.entries()) {
    const term = item.offQuery || item.searchTerms?.[0] || item.name;
    try {
      const rows = (await legacySearchWithRetry(term)).filter(
        (p) => p.product_name && p.brands && p.image_front_url,
      );
      const productSlugKey = slug(item.name);
      let wrote = 0;

      for (const row of rows) {
        const brandName = ctx.brandNames.find((b) => wordsStartWith(row.brands, b));
        if (!brandName) continue;
        const brandKey = flatten(brandName);
        const existingEntry = ctx.brandPhotos[productSlugKey]?.[brandKey];
        const existingImage = (existingEntry?.image || "").toLowerCase();
        // Same pin guard as the main write path above.
        if (existingEntry?.pinned || existingImage.includes("/pinned-")) continue;
        if (existingImage.endsWith(".jpg") || (existingImage.endsWith(".png") && !ctx.refresh)) continue;

        const verdict = evaluateOffCandidate(
          { ...row, categories_tags: [] },
          item,
          wordSet(brandName),
          ctx.lexicon,
        );
        if (!verdict.ok) continue;

        try {
          const bytes = await downloadBytes(row.image_front_url);
          const processed = await processCandidate(bytes);
          if (!processed.ok) continue;

          const fileName = `${slug(brandName)}-${item.id}.png`.replace(/-+/g, "-");
          await fs.mkdir(BRAND_PHOTO_DIR, { recursive: true });
          await fs.writeFile(join(BRAND_PHOTO_DIR, fileName), processed.buffer);

          ctx.brandPhotos[productSlugKey] ??= {};
          ctx.brandPhotos[productSlugKey][brandKey] = {
            brand: brandName,
            name: row.product_name.trim(),
            ...(row.quantity ? { size: String(row.quantity).trim() } : {}),
            image: `${BRAND_PHOTO_URL}/${fileName}`,
            code: row.code,
            source: row.image_front_url,
          };
          wrote++;
          ctx.stats.wrote++;
          ctx.stats.tierCounts[verdict.tier] = (ctx.stats.tierCounts[verdict.tier] || 0) + 1;
          if (processed.path === "flood-fill") ctx.stats.floodFill++;
          else if (processed.path === "flood-fill-degraded") ctx.stats.floodFillDegraded++;
          else if (processed.path === "ml") ctx.stats.ml++;
        } catch {
          /* this row failed to download/process - try the next */
        }
      }

      await ctx.saveBrandPhotos();
      if (wrote > 0) {
        await ctx.clearGap(item.id);
        console.log(`  ${i + 1}/${brandGaps.length} ${item.name} -> ${wrote} more brand photo(s) via the legacy gap-filler`);
      } else {
        console.log(`  ${i + 1}/${brandGaps.length} ${item.name} -> still nothing usable`);
      }
    } catch (err) {
      console.log(`  ${i + 1}/${brandGaps.length} ${item.name} -> legacy search failed (${err.message})`);
    }
    if (i < brandGaps.length - 1) await sleep(LEGACY_DELAY_MS);
  }
}

/** OFF's legacy endpoint returns brands as a comma string, e.g. "Great Value, Walmart". */
function wordsStartWith(candidateBrandsField, brandName) {
  const candidates = String(candidateBrandsField).split(",").map((s) => s.trim());
  const wanted = wordSet(brandName);
  const wantedArr = [...wanted];
  return candidates.some((c) => {
    const got = tokenize(c);
    return got.length >= wantedArr.length && wantedArr.every((w, i) => got[i] === w);
  });
}

/* ================================================== output verification */

async function verifyWrittenFiles(paths) {
  const results = [];
  for (const p of paths) {
    try {
      const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const cornerAlpha = data[3]; // top-left pixel's alpha channel
      const stat = await fs.stat(p);
      results.push({
        path: p,
        ok: info.channels === 4 && cornerAlpha === 0,
        channels: info.channels,
        cornerAlpha,
        width: info.width,
        height: info.height,
        bytes: stat.size,
      });
    } catch (err) {
      results.push({ path: p, ok: false, error: err.message });
    }
  }
  return results;
}

/* ================================================================= main */

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log("DailyValue - item image seeding");
  console.log("=".repeat(60));
  console.log(`items file   : ${args.items}`);
  console.log(`limit        : ${args.limit ?? "(none)"}`);
  console.log(`only         : ${args.only ? [...args.only].join(",") : "(none)"}`);
  console.log(`refresh      : ${args.refresh}`);
  console.log(`concurrency  : ${args.concurrency}`);
  console.log("");

  if (!existsSync(args.items)) {
    console.error(`Items file not found: ${args.items}`);
    console.error("Default is data/items.json, produced by a separate catalogue-generation pass.");
    console.error("For a test run, point --items at a synthesized file instead.");
    process.exit(1);
  }

  let items = JSON.parse(await fs.readFile(args.items, "utf8"));
  if (!Array.isArray(items)) items = items.items ?? [];
  if (args.only) items = items.filter((it) => args.only.has(it.id));
  if (args.limit) items = items.slice(0, args.limit);

  console.log(`Loaded ${items.length} item(s) to process.\n`);

  await backupBrandPhotosOnce();

  const brandNames = await storeBrandNamesFromFile();
  const lexicon = await loadLexicon();
  const catalogue = await loadOrBuildCatalogue(brandNames, args.recatalogue);

  const brandPhotos = await readJsonOrDefault(BRAND_PHOTOS_JSON, {});
  const itemPhotos = await readJsonOrDefault(ITEM_PHOTOS_JSON, {});
  const imageGaps = await readJsonOrDefault(IMAGE_GAPS_JSON, {});

  // DEFECT 2: validate every EXISTING brandPhotos.json entry (not just what
  // this run fetches) before anything else touches it. Anything that fails
  // the same rejectGate() a fresh candidate would is removed now, so the
  // per-item loop below sees an empty slot and attempts a real replacement.
  console.log("Validating existing data/brandPhotos.json entries against rejectGate (DEFECT 2)...");
  const removedEntries = await validateExistingBrandPhotos(brandPhotos, items, lexicon);
  if (removedEntries.length > 0) {
    await fs.writeFile(BRAND_PHOTOS_JSON, JSON.stringify(brandPhotos, null, 2) + "\n");
    console.log(`  removed ${removedEntries.length} stale/wrong entry(ies):`);
    for (const r of removedEntries) {
      console.log(`    "${r.productKey}".${r.brandKey} (${r.brand}: "${r.name}") - ${r.reason}`);
    }
  } else {
    console.log("  nothing removed - every existing entry still passes.");
  }
  // Accumulate across invocations rather than overwrite - if a run dies
  // partway through the (long, resumed-in-pieces) per-item loop below, this
  // validation step already ran and saved before the crash, so a restart's
  // OWN validation pass finds nothing left to remove and would otherwise
  // silently erase the previous run's removal record with an empty list.
  const removalLogPath = join(SCRATCHPAD, "brandPhotos-removed.json");
  const priorRemovals = await readJsonOrDefault(removalLogPath, []);
  const seen = new Set(priorRemovals.map((r) => `${r.productKey} ${r.brandKey}`));
  for (const r of removedEntries) {
    const key = `${r.productKey} ${r.brandKey}`;
    if (!seen.has(key)) {
      seen.add(key);
      priorRemovals.push(r);
    }
  }
  await fs.mkdir(SCRATCHPAD, { recursive: true });
  await fs.writeFile(removalLogPath, JSON.stringify(priorRemovals, null, 2) + "\n");
  console.log("");

  const retailers = await loadRetailerCatalogues();

  const brandPhotosMutex = createMutex();
  const itemPhotosMutex = createMutex();
  const gapsMutex = createMutex();

  const stats = createStats();

  const ctx = {
    catalogue,
    brandNames,
    lexicon,
    brandPhotos,
    itemPhotos,
    retailers,
    refresh: args.refresh,
    stats,
    saveBrandPhotos: () => brandPhotosMutex(() => fs.writeFile(BRAND_PHOTOS_JSON, JSON.stringify(brandPhotos, null, 2) + "\n")),
    saveItemPhotos: () => itemPhotosMutex(() => fs.writeFile(ITEM_PHOTOS_JSON, JSON.stringify(itemPhotos, null, 2) + "\n")),
    recordGap: (item, imageMode, reason) =>
      gapsMutex(() => {
        imageGaps[item.id] = { name: item.name, imageMode, reason, attemptedAt: new Date().toISOString() };
        return fs.writeFile(IMAGE_GAPS_JSON, JSON.stringify(imageGaps, null, 2) + "\n");
      }),
    clearGap: (itemId) =>
      gapsMutex(() => {
        delete imageGaps[itemId];
        return fs.writeFile(IMAGE_GAPS_JSON, JSON.stringify(imageGaps, null, 2) + "\n");
      }),
  };

  console.log(`Processing ${items.length} item(s) at concurrency ${args.concurrency}...\n`);
  const runStart = Date.now();
  const writtenFilesThisRun = [];

  const results = await runPool(items, args.concurrency, async (item, i) => {
    const before = { brand: Object.keys(brandPhotos[slug(item.name)] || {}).length, item: !!itemPhotos[item.id] };
    const r = await attemptItem(item, ctx);
    const label = `${String(i + 1).padStart(String(items.length).length)}/${items.length} [${item.imageMode}] ${item.name}`;
    if (r.wrote > 0) {
      console.log(`${label} -> wrote ${r.wrote} image(s) (${r.ms ?? ""}ms)${r.detail ? ` [${r.detail}]` : ""}`);
    } else if (r.skipped) {
      console.log(`${label} -> skipped (already have it; use --refresh to redo)`);
    } else if (r.alreadyCovered) {
      console.log(`${label} -> nothing new (${r.skippedExisting} matching brand(s) already have a photo on file)`);
    } else {
      console.log(`${label} -> NO IMAGE (recorded to imageGaps.json)`);
    }
    void before;
    return r;
  });

  const elapsedMs = Date.now() - runStart;

  // Collect every file this run actually wrote, for the verification pass.
  for (const item of items) {
    if (item.imageMode === "generic") {
      const p = join(BRAND_PHOTO_DIR, `${item.id}.png`);
      if (existsSync(p)) writtenFilesThisRun.push(p);
    } else {
      const rec = brandPhotos[slug(item.name)];
      if (rec) {
        for (const photo of Object.values(rec)) {
          if (photo.image?.toLowerCase().endsWith(".png")) {
            const fp = join(ROOT, "public", photo.image.replace(/^\//, "").replace(/\//g, "\\"));
            if (existsSync(fp) && !writtenFilesThisRun.includes(fp)) writtenFilesThisRun.push(fp);
          }
        }
      }
    }
  }

  // Gap-filler pass: only the items that are STILL gaps after the main pass,
  // and only for brand mode. Runs after, never blocking the main loop.
  const stillGapItems = items.filter((it) => imageGaps[it.id]);
  await runLegacyGapFiller(stillGapItems, ctx);

  /* --------------------------------------------------------- final report */

  console.log("\n" + "=".repeat(60));
  console.log("RUN REPORT");
  console.log("=".repeat(60));
  console.log(`items processed        : ${items.length}`);
  console.log(`total wall time         : ${(elapsedMs / 1000).toFixed(1)}s (${(elapsedMs / items.length).toFixed(0)}ms/item avg)`);
  console.log(`images written          : ${stats.wrote}`);
  console.log(`  flood-fill path       : ${stats.floodFill}`);
  console.log(`  flood-fill (degraded) : ${stats.floodFillDegraded}${mlAvailable === false ? "  <-- ML unavailable, see above" : ""}`);
  console.log(`  ML path               : ${stats.ml}`);
  console.log(`  already-transparent   : ${stats.alreadyTransparent}`);
  if (stats.mlTimes.length > 0) {
    const avg = stats.mlTimes.reduce((a, b) => a + b, 0) / stats.mlTimes.length;
    console.log(`    avg ML inference time: ${avg.toFixed(0)}ms  (warm-up was ${mlWarmupMs}ms, one-time)`);
  }
  if (Object.keys(stats.retailerSource).length > 0) {
    console.log(`  generic-item source   : ${Object.entries(stats.retailerSource).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  }
  console.log(`candidates rejected     : ${stats.rejected}`);
  const topReasons = Object.entries(stats.rejectReasons).sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [reason, count] of topReasons) console.log(`  x${count}  ${reason}`);
  console.log(`items with NO image     : ${Object.keys(imageGaps).length} (see data/imageGaps.json)`);
  console.log("\nmatch tier breakdown (brand-mode candidates that were accepted):");
  for (const [tier, count] of Object.entries(stats.tierCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tier.padEnd(16)}: ${count}`);
  }

  console.log("\nVerifying every PNG written this run actually has alpha + a transparent corner...");
  const verified = await verifyWrittenFiles(writtenFilesThisRun);
  const failures = verified.filter((v) => !v.ok);
  const sizes = verified.filter((v) => v.ok).map((v) => v.bytes);
  const dims = new Set(verified.filter((v) => v.ok).map((v) => `${v.width}x${v.height}`));
  console.log(`  files written this run : ${verified.length}`);
  console.log(`  passed (alpha + transparent corner): ${verified.length - failures.length}`);
  console.log(`  dimensions seen        : ${[...dims].join(", ") || "(none)"}`);
  if (sizes.length > 0) {
    const avgKb = sizes.reduce((a, b) => a + b, 0) / sizes.length / 1024;
    console.log(`  file size              : avg ${avgKb.toFixed(1)}KB, min ${(Math.min(...sizes) / 1024).toFixed(1)}KB, max ${(Math.max(...sizes) / 1024).toFixed(1)}KB`);
  }
  if (failures.length > 0) {
    console.log(`  FAILURES:`);
    for (const f of failures) console.log(`    ${f.path} - ${f.error || `channels=${f.channels} cornerAlpha=${f.cornerAlpha}`}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
