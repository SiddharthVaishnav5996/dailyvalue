# 🛒 DailyValue

**AI grocery shopping that compares every store.**

Ask for any dish — _"I want to make Blueberry Cheesecake"_ — and DailyValue writes
the recipe, extracts the ingredients, matches them to real grocery products, and
**compares prices across partner stores** (FreshCo, Walmart, No Frills, Metro) so
you always get the cheapest cart. Add everything in one tap, switch your partner
store, and check out for delivery or pickup.

> Portfolio project by Siddharth Vaishnav.

---

## ✨ Features

- **Natural-language → recipe.** Type a dish and get a full recipe back.
- **Automatic ingredient extraction** into a clean, normalized shopping list.
- **Cross-store price comparison** with the cheapest store highlighted and total savings.
- **One-tap cart** — add all ingredients, adjust quantities, switch partner store.
- **Live re-pricing** — every price on the page updates when you change stores.
- **Cart persistence** via `localStorage` (no login required).
- **Works with zero setup** — a built-in demo recipe engine runs when no AI key is
  configured, so the whole flow is usable out of the box. Add a key for real AI recipes.

---

## 🧠 How the AI works

Everything runs **server-side** (a Next.js Route Handler) so the API key never
reaches the browser:

```
User query ─▶ POST /api/recipe
                1. Gemini (structured JSON output) → recipe + normalized ingredients
                2. match()   → best catalog product per ingredient (fuzzy + exact)
                3. compare() → per-store basket totals, ranked cheapest → priciest
                ▼
        { recipe, items, comparison } ─▶ UI renders → add to cart
```

The key trick is **structured output**: Gemini is called with a `responseSchema`, so
it returns clean JSON (recipe + ingredients with search hints) rather than prose we
have to parse. See [`lib/ai/client.ts`](lib/ai/client.ts) and
[`lib/ai/prompts.ts`](lib/ai/prompts.ts).

The AI layer is **provider-agnostic** — swapping Gemini for Claude or Groq means
changing only `lib/ai/client.ts`.

---

## 🧰 Tech stack (all free / $0)

| Concern      | Choice                              | Why |
| ------------ | ----------------------------------- | --- |
| Framework    | **Next.js 16** (App Router) + TypeScript | Server API routes hide the AI key; free Vercel hosting |
| Styling      | **CSS Modules** (one `.module.css` per component) | Scoped, no inline styles; tokens in [`styles/tokens.css`](styles/tokens.css) |
| AI           | **Google Gemini** (free tier)       | Best free option with native structured JSON output |
| Fuzzy match  | **fuse.js**                         | Maps messy ingredient text to catalog products |
| Hosting      | **Vercel** (free tier)              | One-click deploy |

Design tokens (colors, spacing, typography) live in **one file**,
[`styles/tokens.css`](styles/tokens.css) — update the values there and the whole UI
follows. This is where the Figma design system values plug in.

---

## 🚀 Getting started

```bash
npm install

# optional — for real AI recipes (the app works without it):
cp .env.example .env.local        # then paste a free Gemini key
# get one at https://aistudio.google.com/app/apikey

npm run dev                        # http://localhost:3000
```

| Script          | Does |
| --------------- | ---- |
| `npm run dev`   | Start the dev server |
| `npm run build` | Production build |
| `npm run lint`  | ESLint |
| `npm run seed`  | Regenerate the product catalog (`data/products.json`) |

---

## 🏪 About the store data

There is **no public API for live FreshCo / Walmart pricing** (Walmart's open API is
partner-gated; FreshCo has none). So DailyValue uses a **seeded catalog** with
**simulated per-store prices** — generated deterministically by
[`scripts/seed.mjs`](scripts/seed.mjs), so results are realistic _and_ reproducible,
and the cheapest store believably varies per item. Product visuals are consistent
emoji tiles. Prices are clearly presented as a comparison demo, not live data.

---

## 📁 Project structure

```
app/
  api/recipe/route.ts      # the AI pipeline (server-only)
  page.tsx  cart/page.tsx  # home + full cart
components/                # one folder each = Component.tsx + Component.module.css
lib/
  ai/                      # Gemini client + prompts + demo engine
  catalog/                 # matching + price comparison
  cart/CartContext.tsx     # cart state + localStorage
data/                      # stores + generated product catalog
styles/tokens.css          # design tokens (Figma plugs in here)
scripts/seed.mjs           # catalog generator
```

---

## 🗺️ Roadmap

- **YouTube import** — paste a cooking video; read its transcript and build the cart.
- **User accounts** — saved carts, favourite stores, order history.
- **Real store integrations** where public APIs exist (e.g. Kroger).

---

## ☁️ Deploy

Push to GitHub and import into **Vercel** (free). Set `GEMINI_API_KEY` in the Vercel
project's environment variables. That's it.
