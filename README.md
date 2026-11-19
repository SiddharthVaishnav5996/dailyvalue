# 🛒 DailyValue

**Type a sentence. Get a priced shopping cart, compared across every store.**

**▶ Try it live: [dailyvalue.vercel.app](https://dailyvalue.vercel.app)**

Not a search box with keywords — a sentence.

- _"Help me prepare a blueberry cheesecake"_ → a recipe's ingredients, matched to real products
- _"My fridge is empty, refill it with vegetables and wine"_ → a restock list across the right aisles
- _"I need a bed mattress and an air conditioner"_ → Walmart, Costco, Lowe's and Canadian Tire, priced

Ask it the weather and it politely declines. That is deliberate, and it is enforced in three places.

> Portfolio project by Siddharth Vaishnav.

---

## ✨ What it does

- **Natural language → a shopping list.** Any dish, any restock, any retail goods.
- **A hard scope guardrail.** Food, groceries, drinks, household and retail only.
- **Cross-store price comparison** across 13 Canadian retailers, cheapest and best-rated pre-selected.
- **Store brands, handled properly.** Ask for bread and each shop offers its own — Great Value at Walmart, No Name at No Frills, Compliments at Sobeys. Ask for Great Value and the shops that cannot sell it say so.
- **Brand loyalty.** Star a brand once and every later search opens on it, wherever it is sold, instead of on whatever is cheapest.
- **Recipes you can keep.** Ask to cook something and the reply includes the method, with a one-press PDF download that works on any device, desktop or mobile.
- **Real multi-turn conversation.** "I don't like digestive biscuits" rebuilds the list, keeping everything else.
- **Automatic failover** across two AI providers, then a built-in engine that needs no network at all.
- **Works from the keyboard.** Pop-ups take focus and give it back, menus use the arrow keys, buttons name their product, the text colours were audited to WCAG AA contrast, and the Add button has a 44px tap area.
- **Works with zero setup.** No keys? It still runs. Each key you add turns on more.

---

## 📊 Results

- **2,201 products across 13 Canadian stores**: a curated catalog, not every item on every shelf.
- **98.7% of products (2,173) have a photo a person checked.**
- **82% fewer AI input tokens** on a measured search after adding retrieval (RAG): 15,308 → 2,696. Caching was already discounting most of the old prompt, so the saving at full price is 41%.
- **Tested on the live build by 20 people.** 9 came back to re-test, and all 9 finished the whole trip: AI search, sign-in, choosing a variant, switching store, checkout.
- **A keyboard-only run of the whole trip** found 3 gaps. All 3 are fixed.

---

## 🧠 How the AI works

Everything runs **server-side** in a Next.js Route Handler, so the API keys never reach the browser.

```
POST /api/search
  │
  1. Validate the request            app/api/search/route.ts
  │
  2. Ask for a plan                  lib/ai/plan.ts
  │    Gemini  ──(429/500/timeout)─▶  Groq  ──(fails)─▶  built-in engine
  │    all three return the same AIPlan
  │
  3. Out of scope? Reply and stop. No table, no cart. ◀── guardrail
  │
  4. Resolve items to products       lib/catalog/resolve.ts
  │    curated (hand-made cards) -> catalog (estimated prices) -> generated (hashed)
  │
  5. Give every offer its brand      data/brands.ts
  │    national brand everywhere, or each shop's own
  │
  6. Rank offers by price + stars    lib/catalog/resolve.ts
  │
  7. Attach photos                   lib/catalog/imageDb.ts, brandPhotos.ts, lib/images/pexels.ts
  ▼
  { reply, tables, products } ─▶ UI renders ─▶ cart ─▶ checkout
```

Three ideas carry the whole design:

**Structured output.** Gemini is called with a `responseSchema`, so it *cannot* return anything but our shape. Groq has no equivalent, so it gets the shape in its prompt and leans on a shared repair layer. See [`lib/ai/schema.ts`](lib/ai/schema.ts).

**One type, three providers.** Gemini, Groq and the offline engine all return the same `AIPlan`. Nothing downstream knows which answered. Swapping providers is a one-line change in [`lib/ai/plan.ts`](lib/ai/plan.ts).

**Hand-made beats generated.** Around 36 products already had real photography, fitted to the card frame. A search that lands on one keeps its own photo, its own copy, and its own hand-written store prices. Only what those cannot cover falls through to the 2,201-product catalog, and only what neither covers is generated and priced deterministically by hash, so an air conditioner costs the same on every machine, forever, with no database. See [`lib/catalog/curated.ts`](lib/catalog/curated.ts) and [`lib/catalog/pricing.ts`](lib/catalog/pricing.ts).

**A brand belongs to a shop, or to nobody.** Philadelphia is sold everywhere, so comparing its price across stores is the point. Great Value is Walmart's and exists nowhere else, so quoting it at Costco is fiction — which the app used to do. [`data/brands.ts`](data/brands.ts) records who owns what, verified rather than recalled, and the resolver gives every offer the brand that shop would really hand you. An item with no brand of its own then reads Great Value / No Name / Compliments down the comparison instead of three identical nameless rows.

---

## 🧰 Tech stack (all free / $0)

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router) + TypeScript | Server routes hide the keys; free Vercel hosting |
| Styling | **CSS Modules**, one per component | Scoped; tokens in [`styles/tokens.css`](styles/tokens.css) |
| AI, primary | **Google Gemini** | The only free tier that *enforces* a JSON schema |
| AI, fallback | **Groq** (GPT-OSS 120B) | Different company, different hardware, independent failure |
| Fuzzy match | **fuse.js** | Maps messy item names to catalog products |
| Photos, checked | **Store and brand websites** | 4,124 packshots, each one checked by a person ([`docs/HARVEST.md`](docs/HARVEST.md)) |
| Photos, branded | **Open Food Facts** | Real Canadian packshots, seeded offline (CC-BY-SA) |
| Photos, generic | **Pexels** | 200/hour free, cached in-process |
| Recipe PDFs | **jsPDF** | Built in the browser on any device; loaded only on first use |
| Hosting | **Vercel** | One-click deploy |

---

## 🚀 Getting started

```bash
npm install
cp .env.example .env.local     # then paste your keys — see below
npm run dev                    # http://localhost:3000
```

All three keys are free and none asks for a card. **The app runs without any of them.**

| Key | Get it from | Without it |
| --- | --- | --- |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com/app/apikey) | Falls back to Groq, then a keyword engine |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com/keys) | No failover if Gemini is down |
| `PEXELS_API_KEY` | [pexels.com/api](https://www.pexels.com/api/) | Cards show an emoji tile |

Environment variables are read at startup, so **restart the dev server** after editing `.env.local`.

| Script | Does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run check-keys` | Ask each provider whether your keys actually work |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run seed` | Regenerate the grocery catalog (`data/products.json`) |
| `npm run seed-photos` | Fetch real branded packshots into `data/brandPhotos.json` |

`check-keys` makes one tiny free request per key and reports what came back, so a mistyped key is caught immediately rather than showing up later as a search that quietly fell back to the offline engine. Keys are printed masked.

---

## 🏪 About the store and price data

There is **no free public API for live Canadian grocery pricing** — Walmart's is partner-gated and FreshCo has none. So prices are **simulated, but never random**:

- The catalog, [`data/products.json`](data/products.json), holds **2,201 products**. Its stored prices are **estimates**: a base 2026 shelf price per product, adjusted per store and generated once by the seed scripts (starting with [`scripts/seed.mjs`](scripts/seed.mjs)), never scraped. Most stored prices are for four supermarkets (No Frills, Walmart, FreshCo, Metro), with a few for Superstore, Costco and the LCBO.
- Every other store price is made by **hashing** the product name and store id, so the same product always costs the same amount at the same shop — reproducible, and the cheapest store still varies believably per item.
- [`data/stores.ts`](data/stores.ts) records which **departments** each of the 13 retailers stocks. That is why a mattress reaches Canadian Tire and never FreshCo, and why wine reaches the LCBO.
- [`data/brands.ts`](data/brands.ts) records each chain's **own brands** and the departments they cover. Brand names were checked on the web rather than recalled, and a brand only covers what it really covers — Beauti-Tone is paint, so it is never offered as a cordless drill.

Prices are presented as a comparison demo, not live data.

---

## 🖼️ Images

Product photos come from three places, in this order of preference:

- **Store and brand websites.** 4,124 packshots for 2,173 products, gathered with the help of AI agents following the rules in [`docs/HARVEST.md`](docs/HARVEST.md), and each one checked by a person before it was kept. Every entry in [`data/imageDb.json`](data/imageDb.json) records the page it came from, so any photo can be traced. The agents worked one store at a time, at a slow pace, and stopped at any sign-in or CAPTCHA.
- **[Open Food Facts](https://world.openfoodfacts.org)**, a free community database, licensed CC-BY-SA. Its search endpoint allows roughly ten calls a minute and one search here needs fourteen, so it is queried *offline* by `npm run seed-photos` and the results are committed to `data/brandPhotos.json`.
- **[Pexels](https://www.pexels.com)** for generic photos, under the Pexels licence.

Hand-photographed curated cards always outrank all three.

**Product images, logos and brand names belong to their owners.** They are used here only to demonstrate the app, in a non-commercial portfolio project. If you own an image and would like it removed, please open an issue and it will be taken down.

---

## 📁 Project structure

```
app/
  api/search/route.ts      # the pipeline (server-only)
  api/resolve/route.ts     # rebuilds product cards from a saved list, no AI call
  results/                 # chat + tables, then products, then checkout
components/                # one folder each = Component.tsx + Component.module.css
  RecipeCard/              # the recipe inside an AI reply, with Download PDF
lib/
  ai/
    plan.ts                # the Gemini → Groq → offline failover ladder
    schema.ts              # the JSON contract + the repair layer
    planPrompt.ts          # system prompt, incl. the scope guardrail
    providers/             # gemini.ts (SDK) and groq.ts (raw fetch)
    demo.ts                # the no-network engine
  brand/
    BrandPreferenceContext.tsx  # the brands this shopper always buys (browser only)
  catalog/
    curated.ts             # the ~36 hand-photographed products, and how to find them
    resolve.ts             # items → products → ranked store offers
    pricing.ts             # deterministic hash pricing
    brandPhotos.ts         # real packshot per brand, seeded offline
  images/pexels.ts         # photo lookup + cache
  recipe/pdf.ts            # recipe -> PDF, loaded on demand
  search/SearchContext.tsx # one search result, shared across pages
  ui/useScrollLock.ts      # freeze the page behind a modal, on the right element
  ui/useDialogFocus.ts     # keyboard focus for every pop-up: in, kept, and given back
data/                      # stores, catalog, photos, checkout demo content
  products.json            # the 2,201-product catalog, with estimated prices
  imageDb.json             # checked photos, each with the page it came from
  brands.ts                # who owns which store brand, and what it covers
  variants.ts              # kinds of a product: skim, 1%, 2%…
  bareWords.ts             # what a bare word like "tea" means
  brandPhotos.json         # seeded packshots (npm run seed-photos)
docs/HARVEST.md            # the rules the photo agents followed
styles/tokens.css          # design tokens
```

---

## 🗺️ Roadmap

**Still to fix, found by testing and the audits:**

- **A screen-reader pass of the whole trip.** The keyboard-only run is done; a screen reader is the next check.
- **Raise the text under 12px**, in the Figma file and in the app. 8px and 10px text is hard to read.
- **Reach Place Order sooner by keyboard.** "People also bought" comes before the order summary in Tab order.

**Then grow it:**

- **Live products and prices from the stores**, wherever a retailer offers a feed, in place of the curated catalog's estimates.
- **Make the voice and attach buttons work.** Both are in the search bar but don't do anything yet.
- **Suggestions from past orders and budget.** Today it remembers favourite brands and saved recipes.
- **The cheapest whole cart across stores**, not just the cheapest store for each item.
- **Photos for AI-generated products.** 98.7% of catalog products have a checked photo; products the AI invents still fall back to generic photography.
- **Alternative products for every item.** Hand-built Product-pops already show them; generated products show only the store comparison.
- **Automated tests for the product matcher.** It was verified against 24 phrases it must refuse and 16 it must still match, but as a one-off check. Those lists belong in a test suite.
- **Rate limiting per visitor**, so one person cannot spend the daily quota.
- **An evaluation set** of real queries with expected output, to tell a prompt improvement from a prompt change.

---

## ☁️ Deploy

Live at **[dailyvalue.vercel.app](https://dailyvalue.vercel.app)**. Every push to `master` rebuilds it at the same address, and a build that fails never replaces the live site.

To deploy your own copy, import the repository into **Vercel**, then set these three things in the project. The last two live only in Vercel, not in this repository, so they are easy to forget:

| Setting | Where in Vercel | Why |
| --- | --- | --- |
| `GEMINI_API_KEY`, `GROQ_API_KEY`, `PEXELS_API_KEY` | Settings → Environment Variables | The keys from `.env.local`, which is never committed. Pasting the whole file into the Key box fills in all three. |
| `npm_config_onnxruntime_node_install_cuda` = `skip` | Settings → Environment Variables (Production and Preview) | Without it, `npm install` fails on Vercel's Linux machines. The background remover used only by `scripts/seed-item-images.mjs` (`@imgly/background-removal-node`, a dev dependency) pulls in `onnxruntime-node`, whose installer tries to download a GPU add-on and gets a 404. `skip` tells it not to; the site never uses it. |
| **Git LFS: Enabled** | Settings → Git | The 4,797 product photos are stored with Git LFS. Without it, Vercel serves the small pointer files instead and every photo breaks. |

A changed setting only takes effect on the next build, so redeploy after changing one. Each build downloads the LFS photos (about 627 MB), which counts toward GitHub's monthly LFS bandwidth.

One caveat worth knowing: the Pexels cache lives in the server's memory, so it resets on every deploy and is not shared between serverless instances. Production would move it to Redis.
