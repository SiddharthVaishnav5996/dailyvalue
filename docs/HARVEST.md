# Verified product-image harvest — shared instructions

> **Archived copy.** This is the rulebook the AI agents read during the Round 2 product-photo harvest (October 2026). It is kept here for reference. Local machine paths have been removed; the helper scripts it mentions lived in the harvesting session's scratch folder and are not part of this repository.

## CURRENT STATUS (2026-10-20) — read this first, it overrides older sections below
- **Superstore and Metro: re-approved by the user (2026-10-19)** for careful use. One agent per site at a time, at least 10 s between page loads, one search per batch, check for block text after EVERY load. First block (Access Denied / bot check / 429) = stop that site for the rest of the run and report. No Frills stays off.
- **2026-10-23: Walmart worked again** — ~40 page loads at ≥30 s apart, no block. 30 s spacing in a fresh tab seems to be the sustainable pace. Costco (costco.ca, images at gdx-assets.costco.com `?width=2000&format=jpg`), apple.com/ca and samsung.com/ca also work (manufacturer photos use store ids "apple"/"samsung").
- (history) **Walmart STOPPED again 2026-10-21.** A test search from a fresh tab passed, then the agent's very first search a minute later got "Verify Your Identity". Walmart now lets through about one page per window, so it's not usable for harvesting. Do not open walmart.ca until the user decides.
- (history) **Walmart BLOCKED for the rest of 2026-10-20.** Pass 3: blocked on load 1; after 10 min a fresh tab got ONE search through, then load 3 was blocked again. A fresh tab does not reset it; the block needs hours. Main session retries the next morning.
- (history) **Walmart re-opened later on 2026-10-20 (user's instruction):** a fresh tab searched fine after the block. ONE agent, ≥20 s apart. On a block: close the tab, wait ≥10 min, open a fresh tab, try ONE search; blocked again = stop Walmart for the run.
- (history) **Walmart BLOCKED 2026-10-20** ("Verify Your Identity" on page load ~96 of the day: 80 in pass 1, 16th of pass 2, all ≥15 s apart). Do not open walmart.ca until the user re-approves. Its budget looks like roughly 90 page loads per day even at 15 s pacing.
- (history) **Walmart: re-approved by the user (2026-10-20) for ONE agent only.** Search works again (`https://www.walmart.ca/en/search?q=<terms>`, read `__NEXT_DATA__`: objects with `name` + `imageInfo.thumbnailUrl`). At least 15 s between page loads. First 429 / CAPTCHA / "verify your identity" / "press & hold" = stop Walmart for the run, save, report. No other agent may open walmart.ca.
- Working sites: Voilà (Sobeys), Canadian Tire, LCBO, Superstore, Metro, Walmart (one agent).
- **Metro images now download fine with curl + browser headers** (no screenshot crop needed): `curl -s -A "<Chrome UA>" -H "Referer: https://www.metro.ca/" -o out.jpg <url>`. In search tiles use the SECOND (2x) srcset URL; it is 400px.
- **Superstore CDN serves AVIF if you accept it.** Download with `-H "Accept: image/jpeg,image/png;q=0.9"` to get JPEG. `_1200` now exists for many products; try it before `_800`. Read results from `__NEXT_DATA__` (objects with `productImage[0].imageUrl`, `brand`, `packageSizing`, `link`).
- **Store-brand spelling matters.** The `brand` field must match `data/brands.ts` names exactly for house brands, e.g. Metro's premium line is `Irresistibles` (not "Irrésistible"), or the app treats it as a national brand and shows it at other stores.
- **data/items.json no longer exists.** Read item details from `data/products.json`.
- The user wants a bounded run: finish your list once, skip anything hard, do not loop.

Project: the `dailyvalue` repository root.
Scratchpad (helper scripts, batch lists): the harvesting session's scratch folder (not in this repo).
Existing helpers from the pilot: `probe.js`, `add.js` in the scratchpad. Read them first and reuse them.

The user is present and approves tool prompts.

## Browser rules
- Use **Claude in Chrome**. Load tools in ONE ToolSearch call:
  `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__find,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__browser_batch`
- Work ONLY in tabs you create. Close them when you finish. Other agents may be working in other tabs at the same time, so don't touch tabs you did not create.
- Never sign in, add to cart, or accept terms. Decline non-essential cookies.
- **CAPTCHA or bot check → stop using that site at once. Never try to solve or bypass one.**
- If you see "extension not connected", wait a few seconds and retry the call. Stop after 3 failures in a row and report.

## Sources

### 1. Real Canadian Superstore (primary, 800px)
- Search: `https://www.realcanadiansuperstore.ca/en/search?search-bar=<terms>`. Wait about 5 seconds before reading the page.
- Tiles: `[data-testid="product-tile"]`. Text comes from `product-brand`, `product-title` and `product-package-size`. The image comes from the tile's `img` src.
- CDN pattern: `digital.loblaws.ca/PCX/<id>/en/1/<file>_400.png`. Swap `_400` for `_800` (the largest size that exists). Download with Node; no headers are needed.
- Prefer files ending `_en_front` or `_en_1`. Avoid `marketing_GS1_Ecommerce` files, which often carry promo banners.
- Product-id suffixes: `_KG` is loose or per-weight (good for produce and meat), `_EA` is packaged.
- Wrong-product hits are common: "granulated sugar" returned Rice Krispies first. Always check the pick.

### 2. Metro (second store, metro.ca)
Its CDN (`product-images.metro.ca`) refuses Node and curl. **Do it the way the user asked: open the image in a new tab, then download it from there.**
1. Search `https://www.metro.ca/en/online-grocery/search?filter=<terms>`. Pick the tile and read the image URL. Use the largest srcset entry, usually 400px.
2. Open that image URL in a NEW tab you create.
3. In that tab, run JS that saves the bytes:
   `const b = await (await fetch(location.href)).blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = '<id>.metro.jpg'; document.body.appendChild(a); a.click();`
4. Chrome saves the file to the Downloads folder. Move it to `public/stores/Brand Photos/<id>.metro.<real-ext>`. Check the real format from the bytes; a `.png` URL is sometimes JPEG.
5. Close the image tab.
If Chrome shows a download prompt, let the user approve it. If downloads are blocked, report it and continue with Superstore only.

## Lessons from batch 1 (read these)
- **Chrome blocks the Metro file downloads in practice.** Use the method batch 1 settled on instead: open the CDN image in your own tab, crop it out of a screenshot at its native 400px, and save it as JPEG with sharp. Say so in `notes`. The existing helpers are `savem.js` and `dlv.js`.
- Search pages only load images when their tab is visible. Batch 1 got around this by running searches in hidden iframes; see `probe_ss1.js` and `stage_ss1.js`.
- Contact sheets work for visual checks (`sheet.js`): tiles of about 380px with the product title underneath. Look at every tile.
- **Up to 3 harvest agents may be running at once**, each in its own tabs. Never close or drive another agent's tab.
- **Stop any server or background process you start before you finish.** Batch 1 left one running on port 3911.
- Prefix every scratch file you create with your batch name (e.g. `b3_sheetA.png`) so parallel agents don't overwrite each other.

## Bot protection (from batch 3)
- Metro showed "confirm you are human" after bursts of searches. Treat Metro as blocked unless the user says otherwise.
- Superstore returns Akamai "Access Denied" to Node requests against its search and product pages. Only search from the browser page, never from Node. The image CDN (`digital.loblaws.ca`) is fine from Node.
- Pace searches at 3–5 seconds or more apart, with no bursts, and run at most 2 agents at once.
- On any bot or CAPTCHA page: stop that site, save progress, report. Never work around it.
- **HTTP 429 / "too many requests" counts as a block.** Walmart returned 429 three times on 2026-10-11. On the first 429: stop the run, save, merge what you have, and report. Do NOT wait and retry. Walmart pacing is now **at least 10 seconds** between page loads.
- **browser_batch does NOT abort on a block page.** A JS step can return "Access Denied" text without throwing, so the batch carries on and hits the site again (this happened on ss1). After EVERY page load, check the title and body for "Access Denied", "captcha", "confirm you are human", "blocked" or "Just a moment", and end the batch there if found. Keep batches to one search plus its read.

## Tabs are shared
All agents share one Chrome tab group. **Always open your own tab with `tabs_create_mcp` and only ever use tab ids you created.** Never use a blank tab you were handed or found; it may belong to another agent.

## Avoid stalls (from batches 5 and 11)
- Do NOT start local receiver servers (`*_srv.js`). Both stalled agents had one running. Read results straight from the page with javascript_tool.
- Save as you go: after every ~10 items, write that group's entries to your own `<batch>_manifest.json` and progress file, so a stall loses at most ~10 items.
- Keep each tool call short. Never block on long loops or timers inside one call.

## Per-store photos (user's decision, option 1)
This is a comparison app, so each store should show ITS OWN version of a product.
- **Packaged items** (dairy, frozen, canned/pantry, snacks, breakfast, beverages, bakery packs, baby, household, personal care, pet): one photo per working store. Pick the store's own brand when it sells one, in this order:
  - Walmart: Great Value
  - No Frills: No Name
  - Superstore: PC, else No Name
  - Metro: Selection / Irresistibles
  - Sobeys: Compliments
  - Save-On-Foods: Western Family
  Otherwise pick the most common national brand at that store.
- **Loose produce and fresh meat:** 1–2 photos in total. They look the same everywhere.
- Every entry gets a `"brand"` field with the brand printed on the pack. The app shows it as that store's label, so it must match the photo.
- Within one item, different stores should show different products where the store brands differ. Never copy one store's image to another store.

## PAUSED: Superstore and No Frills
On 2026-10-06, batch 9 got an Akamai "Access Denied" from Superstore after ~37 searches while another Superstore agent was running. Do NOT use realcanadiansuperstore.ca or nofrills.ca unless your brief says the pause is lifted for you.
**2026-10-08: PERMANENTLY STOPPED.** The ss1 agent got Access Denied again on its 8th search, even at 10 s or more apart. Never open realcanadiansuperstore.ca or nofrills.ca again for this project, whatever a brief says, unless the user personally re-approves it.

## STOPPED: Walmart (2026-10-12)
A third HTTP 429 came on the 40th page load of the wmnew pass, even at 15 s or more apart. **Walmart is permanently stopped for this project.** Never open walmart.ca again unless the user personally re-approves it.

## (history) PAUSED: Walmart (2026-10-11)
**2026-10-12: lifted for ONE agent only (the wm10 resume), at least 15 s between page loads. A 429 or CAPTCHA pauses Walmart permanently.**
Walmart returned HTTP 429 during pk9, then again on only the 9th page of pk10, even at 10 s pacing. Do NOT open walmart.ca until the main session lifts this (planned: one cautious retry the next day, with one agent, at least 15 s apart). Remaining Walmart work: the rest of pk10 (laundry, paper, tableware, food storage, garbage bags, batteries/bulbs, all personal care), plus pk5, plus the ct1/ct2 skips.

## Store methods for per-store passes (details in `store-test.md`)
| store id | site | read results | image | own brand |
|---|---|---|---|---|
| superstore | realcanadiansuperstore.ca/en/search?search-bar= | `__NEXT_DATA__` | `digital.loblaws.ca ..._800` | PC / No Name |
| nofrills | nofrills.ca/en/search?search-bar= | `__NEXT_DATA__` `...initialSearchData.layout.sections.mainContentCollection.components[0].data.productTiles` (`productImage[0].extraLargeUrl` = 1200) | `digital.loblaws.ca ..._1200`, JPEG bytes | No Name |
| sobeys | **voila.ca/search?q=** (sobeys.com is blocked) | `window.__INITIAL_STATE__.data.products.productEntities` | `voila.ca/images-v3/<g>/<g>/800x800.jpg` (800 is the max; other sizes 403) | Compliments |
| walmart | walmart.ca **category pages only, never search** | DOM | `i5.walmartimages.ca/...?odnHeight=1200&odnWidth=1200&odnBg=FFFFFF` | Great Value |
| canadiantire | canadiantire.ca/en/search-results.html?q= | `a[href*="/pdp/"] img` | plain `...-jpgrendition.jpg` with no query | — |
- **lcbo** (store id `lcbo`, details in `lcbo-test.md`): search `https://www.lcbo.com/en/catalogsearch/result/#q=<terms>&t=Products&sort=relevancy&layout=card` (client-rendered, so wait 6–8 s). Read `.CoveoResult` elements; `el.CoveoResult.raw` has `ec_name`, `ec_brand`, `ec_thumbnails`, `lcbo_unit_volume` and `lcbo_selling_package_name`. Image host is `aem.lcbo.com/content/dam/lcbo/products/<d1>/<d2>/<d3>/<d4>/<sku>.jpg`; append `.thumb.960.1280.png` for a 960x1280 JPEG (preferred; the bare `.jpg` is a 3299px original of about 2 MB). Node downloads fine. Some SKUs show a grey bottle-silhouette placeholder, so check by eye.
- Blocked, so never use: Metro (low-res and no download), sobeys.com, Save-On-Foods, FreshCo.
- Skip sponsored tiles (`isSponsored`, or the first 2 on Superstore). They are usually unrelated.
- No Frills and Superstore share Loblaws infrastructure, so never run both at the same time.
- Every entry needs `"brand"`.

## National-brand photos (user's idea, 2026-10-11)
Stores we can't collect from (No Frills, Metro, FreshCo, Costco, Save-On) now borrow a NATIONAL-brand photo, with their label switched to that brand. A national brand (Philadelphia, Natrel, Gay Lea, Burnbrae, Dempster's, Robin Hood) is sold at every chain, so it's honest anywhere. A retailer brand (Great Value, Compliments, No Name, PC, Selection, Farm Boy, Our Finest...) is never borrowed.
- In a national-brand pass, pick the most widely sold national brand for the item, never a store brand. Record it as an extra entry for the store you found it at (e.g. `"store": "sobeys", "brand": "Burnbrae Farms"`), with file `<id>.<store>-national.jpg` so it doesn't clash with that store's own-brand file.
- Same exactness rules: right product type and form, plain or original flavour.

## Never show a different product (from the 2026-10-09 audit)
- A photo must show the item itself. A different SIZE is OK (note it). A different PRODUCT is not: no cheddar for Colby, panela for queso fresco, veggie straws for veggie chips, extra-lean for lean, extra-large for jumbo, vanilla for plain creamer, organic for free-run, or frozen for fresh. If the store doesn't sell the exact item, SKIP it.
- Never reuse one catalog item's photo for a different catalog item, even a close variant.
- The "Image coming soon" placeholder comes in more than one file size (67,416 and 81,008 bytes seen), so check by eye on the contact sheet, not by size alone.

## Never remove backgrounds
Save photos exactly as the store serves them. Do NOT cut out, flood-fill or make the white background transparent (user's decision). Metro's screenshot crop only removes the browser border.

## Per item
1. Read the item's name, size and searchTerms in `data/products.json` (by id).
2. Superstore: search, pick the product that IS the item, and download the `_800` image.
3. Metro: search the same item and download the image via the new-tab method.
4. **Visually verify every downloaded file** by opening it with the Read tool. Check it is the right food in the right form, not a different flavour or product. If it is wrong, delete only the file you just made and try the next result.
5. Up to 3 attempts per store, then skip that store and record why.

## Output
- Files: `public/stores/Brand Photos/<id>.<store>.<ext>`. Never overwrite or delete a file you did not create in this run.
- Manifest: merge into `data/imageDb.json`. Other agents may write it at the same time, so **re-read the file right before every write and merge only your keys** (`add.js` should do this; check that it does).
  Entry: `{ "file": "/stores/Brand Photos/<id>.<store>.<ext>", "store": "superstore"|"metro", "productTitle": "...", "pageUrl": "...", "imageUrl": "...", "width": 800, "height": 800, "verified": true, "notes": "" }`.
  Put the superstore entry FIRST in each item's array (the app uses the first plain entry as the main photo).
  Variant entries add `"variant": "<qualifier>"`, e.g. `"unsalted"`.
- Write progress to `<scratchpad>/progress-<batchname>.txt` (one line per item: id, stores done, notes) so a later agent can resume.

## Final reply
Give counts (done / partial / skipped), skipped items with reasons, Metro download status, and anything odd. Keep it short.

## Rejected by the main session (do not re-add)
- marmalade: Smucker's "Orange Marmalade Style Spread" is a spread, not marmalade.
- green-olives: Compliments stuffed manzanilla (that is stuffed olives).
- colby-cheese / queso-fresco: substitutes (cheddar marble, panela) were rejected.
