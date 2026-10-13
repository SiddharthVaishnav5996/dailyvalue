# 🛒 DailyValue

**Type a sentence. Get a priced shopping cart, compared across every store.**

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
- **Works with zero setup.** No keys? It still runs. Each key you add turns on more.

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
  │    curated (real photos) -> catalog (real prices) -> generated (hashed)
  │
  5. Give every offer its brand      data/brands.ts
  │    national brand everywhere, or each shop's own
  │
  6. Rank offers by price + stars    lib/catalog/resolve.ts
  │
  7. Attach photos                   lib/catalog/brandPhotos.ts, lib/images/pexels.ts
  ▼
  { reply, tables, products } ─▶ UI renders ─▶ cart ─▶ checkout
```

Three ideas carry the whole design:

**Structured output.** Gemini is called with a `responseSchema`, so it *cannot* return anything but our shape. Groq has no equivalent, so it gets the shape in its prompt and leans on a shared repair layer. See [`lib/ai/schema.ts`](lib/ai/schema.ts).

**One type, three providers.** Gemini, Groq and the offline engine all return the same `AIPlan`. Nothing downstream knows which answered. Swapping providers is a one-line change in [`lib/ai/plan.ts`](lib/ai/plan.ts).

**Hand-made beats generated.** Around 36 products already had real photography, fitted to the card frame. A search that lands on one keeps its own photo, its own copy, and its own hand-written store prices. Only what those cannot cover falls through to the 39-product catalog, and only what neither covers is generated and priced deterministically by hash, so an air conditioner costs the same on every machine, forever, with no database. See [`lib/catalog/curated.ts`](lib/catalog/curated.ts) and [`lib/catalog/pricing.ts`](lib/catalog/pricing.ts).

**A brand belongs to a shop, or to nobody.** Philadelphia is sold everywhere, so comparing its price across stores is the point. Great Value is Walmart's and exists nowhere else, so quoting it at Costco is fiction — which the app used to do. [`data/brands.ts`](data/brands.ts) records who owns what, verified rather than recalled, and the resolver gives every offer the brand that shop would really hand you. An item with no brand of its own then reads Great Value / No Name / Compliments down the comparison instead of three identical nameless rows.

📘 **Full walkthrough:** every concept above is explained from first principles, with line-by-line code notes, in the project's [AI Integration Field Notes](https://claude.ai/artifact/Jy2T73PafC65HX3qaKwdZn).

---

## 🧰 Tech stack (all free / $0)

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router) + TypeScript | Server routes hide the keys; free Vercel hosting |
| Styling | **CSS Modules**, one per component | Scoped; tokens in [`styles/tokens.css`](styles/tokens.css) |
| AI, primary | **Google Gemini** | The only free tier that *enforces* a JSON schema |
| AI, fallback | **Groq** (GPT-OSS 120B) | Different company, different hardware, independent failure |
| Fuzzy match | **fuse.js** | Maps messy item names to catalog products |
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

- The 39 seeded grocery products carry fixed prices generated once by [`scripts/seed.mjs`](scripts/seed.mjs).
- Everything else is priced by **hashing** the product name and store id, so the same product always costs the same amount at the same shop — reproducible, and the cheapest store still varies believably per item.
- [`data/stores.ts`](data/stores.ts) records which **departments** each of the 13 retailers stocks. That is why a mattress reaches Canadian Tire and never FreshCo, and why wine reaches the LCBO.
- [`data/brands.ts`](data/brands.ts) records each chain's **own brands** and the departments they cover. Brand names were checked on the web rather than recalled, and a brand only covers what it really covers — Beauti-Tone is paint, so it is never offered as a cordless drill.

**Branded photographs** come from [Open Food Facts](https://world.openfoodfacts.org), a free community database. Its search endpoint allows roughly ten calls a minute and one search here needs fourteen, so it is queried *offline* by `npm run seed-photos` and the results are committed to `data/brandPhotos.json`. Photographs are contributed by shoppers and licensed CC-BY-SA. Hand-photographed curated cards always outrank them.

Prices are presented as a comparison demo, not live data.

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
data/                      # stores, seeded catalog, checkout demo content
  brands.ts                # who owns which store brand, and what it covers
  brandPhotos.json         # seeded packshots (npm run seed-photos)
styles/tokens.css          # design tokens
```

---

## 🗺️ Roadmap

- **Alternative products for every item.** Hand-built Product-pops already show them; generated products show only the store comparison.
- **Branded photos beyond the catalog.** Seeded packshots cover the 39 catalog products; anything the AI invents still falls back to generic photography.
- **Automated tests for the product matcher.** It was verified against 24 phrases it must refuse and 16 it must still match, but as a one-off check. Those lists belong in a test suite.
- **Rate limiting per visitor**, so one person cannot spend the daily quota.
- **An evaluation set** of real queries with expected output, to tell a prompt improvement from a prompt change.
- **Real pricing** wherever a public retailer API exists (e.g. Kroger).

---

## ☁️ Deploy

Push to GitHub and import into **Vercel**. Set `GEMINI_API_KEY`, `GROQ_API_KEY` and `PEXELS_API_KEY` in the project's environment variables.

One caveat worth knowing: the Pexels cache lives in the server's memory, so it resets on every deploy and is not shared between serverless instances. Production would move it to Redis.
