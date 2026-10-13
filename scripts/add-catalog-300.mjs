/*
 * Add ~300 more generic items to the catalog: Alcohol, School & Office, Toys,
 * Beauty, Seasonal, plus gap-fill rows in existing categories, more Sports and
 * more Bakery.
 * ---------------------------------------------------------------------------
 * Same idea as add-canadian-tire.mjs: give common shopping-list words a real
 * catalog id so the planner picks them by id and the price is stable, instead of
 * falling through to an AI-generated product with a guessed price.
 *
 * Generic items only ("IPA Beer 6 x 473 mL Cans", "Canadian Whisky 750 mL"),
 * never a brand or model number.
 *
 * PRICING (per category, see MODE below)
 *
 *   lcbo     Alcohol. products.json gets an LCBO price only:
 *            lcbo = round2(base * (1.0 + wobble(id:lcbo))). Ontario sells spirits
 *            and most wine only through the LCBO, so no grocery store is priced.
 *            Bases are realistic 2026 LCBO shelf prices in CAD.
 *   walmart  School & Office, Toys, Beauty, Seasonal, Sports and the hard-goods
 *            gap-fill (Home, Garden, Automotive). A WALMART price only, as in
 *            add-canadian-tire.mjs: base * (0.93 + wobble(id:walmart)). The
 *            resolver anchors every other store that stocks the department.
 *   grocery  Meat, Bakery, Household, Personal Care, Pet, Baby. The four seeded
 *            grocery stores, exactly as expand-catalog.mjs does it
 *            (STORE_MULTIPLIERS freshco/walmart/nofrills/metro + wobble).
 *
 * ALIASES
 *
 * Every name, id and searchTerm must be unique across the catalog and must not
 * reuse a curated term from lib/catalog/curated.ts ("icewine", "ice wine", ...).
 * Single-word aliases only where that word is the most common item of its kind.
 * Run scripts/check-catalog-300.mjs after editing this list.
 *
 * Idempotent: ids already in the catalog are skipped.
 * Run:  node scripts/add-catalog-300.mjs   (add --dry to preview)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ITEMS = `${ROOT}data/items.json`;
const PRODUCTS = `${ROOT}data/products.json`;

// [id, name, emoji, unit, size, base, terms, imageMode?, offQuery?]
// imageMode defaults to "generic"; offQuery defaults to the lower-cased name.

// ---------------------------------------------------------------------------
// ALCOHOL - LCBO only
// ---------------------------------------------------------------------------
const ALCOHOL = [
  // --- Beer ---
  ["lager-6-cans", "Lager Beer 6 x 473 mL Cans", "🍺", "pack", "6 x 473 mL", 15.25, ["lager", "lager 6 pack", "beer 6 pack"]],
  ["lager-12-bottles", "Lager Beer 12 x 341 mL Bottles", "🍺", "pack", "12 x 341 mL", 25.95, ["lager 12 pack", "beer 12 pack", "lager bottles"]],
  ["lager-24-cans", "Lager Beer 24 x 355 mL Cans", "🍺", "case", "24 x 355 mL", 47.95, ["lager 24 pack", "beer 24 pack", "case of beer"]],
  ["pilsner-6-cans", "Pilsner Beer 6 x 473 mL Cans", "🍺", "pack", "6 x 473 mL", 15.45, ["pilsner", "pilsner 6 pack", "pilsner cans"]],
  ["pilsner-12-bottles", "Pilsner Beer 12 x 341 mL Bottles", "🍺", "pack", "12 x 341 mL", 26.25, ["pilsner 12 pack", "pilsner bottles"]],
  ["ipa-6-cans", "IPA Beer 6 x 473 mL Cans", "🍺", "pack", "6 x 473 mL", 17.95, ["ipa", "ipa 6 pack", "india pale ale"]],
  ["ipa-12-cans", "IPA Beer 12 x 355 mL Cans", "🍺", "pack", "12 x 355 mL", 30.95, ["ipa 12 pack", "ipa cans"]],
  ["pale-ale-6-cans", "Pale Ale Beer 6 x 473 mL Cans", "🍺", "pack", "6 x 473 mL", 16.95, ["pale ale", "pale ale 6 pack"]],
  ["amber-ale-6-cans", "Amber Ale Beer 6 x 473 mL Cans", "🍺", "pack", "6 x 473 mL", 16.45, ["amber ale", "amber ale 6 pack"]],
  ["stout-4-cans", "Stout Beer 4 x 440 mL Cans", "🍺", "pack", "4 x 440 mL", 13.95, ["stout", "stout beer", "dark stout"]],
  ["light-beer-12-bottles", "Light Beer 12 x 341 mL Bottles", "🍺", "pack", "12 x 341 mL", 25.45, ["light beer", "light beer 12 pack", "low calorie beer"]],
  ["light-beer-24-cans", "Light Beer 24 x 355 mL Cans", "🍺", "case", "24 x 355 mL", 47.45, ["light beer 24 pack", "light beer case"]],
  ["mexican-lager-12-bottles", "Mexican-Style Lager 12 x 355 mL Bottles", "🍺", "pack", "12 x 355 mL", 28.95, ["mexican lager", "mexican beer", "mexican beer 12 pack"]],
  ["wheat-beer-6-cans", "Wheat Beer 6 x 473 mL Cans", "🍺", "pack", "6 x 473 mL", 16.25, ["wheat beer", "hefeweizen beer", "wheat ale"]],
  ["craft-beer-variety-12", "Craft Beer Variety Pack 12 x 355 mL Cans", "🍺", "pack", "12 x 355 mL", 29.95, ["craft beer variety pack", "craft beer", "mixed beer pack"]],
  ["lager-24-bottles", "Lager Beer 24 x 341 mL Bottles", "🍺", "case", "24 x 341 mL", 48.95, ["lager 24 bottles", "beer case bottles"]],
  // --- Cider and coolers ---
  ["hard-cider-6-cans", "Hard Apple Cider 6 x 473 mL Cans", "🍏", "pack", "6 x 473 mL", 16.45, ["hard cider", "hard apple cider", "alcoholic cider"]],
  ["pear-cider-6-cans", "Pear Cider 6 x 473 mL Cans", "🍐", "pack", "6 x 473 mL", 16.45, ["pear cider", "hard pear cider"]],
  ["hard-seltzer-12-cans", "Hard Seltzer Variety 12 x 355 mL Cans", "🥤", "pack", "12 x 355 mL", 29.95, ["hard seltzer", "spiked seltzer", "seltzer 12 pack"]],
  ["vodka-soda-6-cans", "Vodka Soda 6 x 355 mL Cans", "🥤", "pack", "6 x 355 mL", 15.95, ["vodka soda", "vodka soda cans", "vodka water"]],
  ["vodka-soda-12-cans", "Vodka Soda 12 x 355 mL Cans", "🥤", "pack", "12 x 355 mL", 30.95, ["vodka soda 12 pack", "vodka soda case"]],
  ["premixed-vodka-cocktail-4", "Premixed Vodka Cocktail 4 x 355 mL Cans", "🍹", "pack", "4 x 355 mL", 12.95, ["premixed cocktail", "ready to drink cocktail", "rtd cocktail"]],
  ["canned-margarita-4", "Ready-to-Drink Margarita 4 x 355 mL Cans", "🍹", "pack", "4 x 355 mL", 13.95, ["canned margarita", "margarita cocktail", "rtd margarita"]],
  // --- Wine, 750 mL ---
  ["cabernet-sauvignon", "Cabernet Sauvignon Red Wine 750 mL", "🍷", "bottle", "750 mL", 16.95, ["cabernet sauvignon", "cab sauv", "cabernet wine"]],
  ["merlot", "Merlot Red Wine 750 mL", "🍷", "bottle", "750 mL", 15.95, ["merlot", "merlot wine"]],
  ["pinot-noir", "Pinot Noir Red Wine 750 mL", "🍷", "bottle", "750 mL", 18.95, ["pinot noir", "pinot noir wine"]],
  ["shiraz", "Shiraz Red Wine 750 mL", "🍷", "bottle", "750 mL", 16.95, ["shiraz", "shiraz wine", "syrah wine"]],
  ["malbec", "Malbec Red Wine 750 mL", "🍷", "bottle", "750 mL", 16.95, ["malbec", "malbec wine"]],
  ["red-blend", "Red Blend Wine 750 mL", "🍷", "bottle", "750 mL", 15.95, ["red blend", "red wine", "house red"]],
  ["chardonnay", "Chardonnay White Wine 750 mL", "🥂", "bottle", "750 mL", 16.95, ["chardonnay", "chardonnay wine"]],
  ["sauvignon-blanc", "Sauvignon Blanc White Wine 750 mL", "🥂", "bottle", "750 mL", 16.45, ["sauvignon blanc", "sauv blanc"]],
  ["pinot-grigio", "Pinot Grigio White Wine 750 mL", "🥂", "bottle", "750 mL", 15.45, ["pinot grigio", "pinot gris"]],
  ["riesling", "Riesling White Wine 750 mL", "🥂", "bottle", "750 mL", 15.95, ["riesling", "riesling wine"]],
  ["white-blend", "White Blend Wine 750 mL", "🥂", "bottle", "750 mL", 14.95, ["white wine", "white blend", "house white"]],
  ["rose-wine", "Rosé Wine 750 mL", "🌸", "bottle", "750 mL", 15.95, ["rose", "rose wine", "pink wine"]],
  ["prosecco", "Prosecco Sparkling Wine 750 mL", "🍾", "bottle", "750 mL", 19.95, ["prosecco", "italian sparkling wine"]],
  ["champagne", "Champagne Brut 750 mL", "🍾", "bottle", "750 mL", 59.95, ["champagne", "brut champagne"]],
  ["sparkling-wine-brut", "Sparkling Wine Brut 750 mL", "🍾", "bottle", "750 mL", 17.95, ["sparkling wine", "brut sparkling", "cava sparkling wine"]],
  ["vidal-dessert-wine", "Vidal Icewine 375 mL", "🍯", "bottle", "375 mL", 59.95, ["dessert wine", "canadian dessert wine", "late harvest dessert wine"]],
  ["boxed-red-wine-4l", "Boxed Red Wine 4 L", "📦", "box", "4 L", 49.95, ["boxed wine", "boxed red wine", "red wine box"]],
  ["boxed-white-wine-4l", "Boxed White Wine 4 L", "📦", "box", "4 L", 49.95, ["boxed white wine", "white wine box"]],
  // --- Spirits ---
  ["vodka-750", "Vodka 750 mL", "🍸", "bottle", "750 mL", 29.95, ["vodka", "vodka bottle", "750 ml vodka"]],
  ["vodka-1140", "Vodka 1.14 L", "🍸", "bottle", "1.14 L", 39.95, ["vodka 1.14 l", "large vodka", "vodka 1140 ml"]],
  ["gin-750", "Gin 750 mL", "🍸", "bottle", "750 mL", 36.95, ["gin", "london dry gin"]],
  ["white-rum-750", "White Rum 750 mL", "🥃", "bottle", "750 mL", 28.95, ["white rum", "light rum", "rum"]],
  ["white-rum-1140", "White Rum 1.14 L", "🥃", "bottle", "1.14 L", 38.95, ["white rum 1.14 l", "large white rum"]],
  ["spiced-rum-750", "Spiced Rum 750 mL", "🥃", "bottle", "750 mL", 31.95, ["spiced rum", "captain morgan"]],
  ["dark-rum-750", "Dark Rum 750 mL", "🥃", "bottle", "750 mL", 31.95, ["dark rum", "aged rum"]],
  ["canadian-whisky-750", "Canadian Whisky 750 mL", "🥃", "bottle", "750 mL", 32.95, ["canadian whisky", "rye whisky", "whisky"]],
  ["canadian-whisky-1140", "Canadian Whisky 1.14 L", "🥃", "bottle", "1.14 L", 42.95, ["canadian whisky 1.14 l", "large whisky"]],
  ["bourbon-750", "Bourbon Whiskey 750 mL", "🥃", "bottle", "750 mL", 43.95, ["bourbon", "kentucky bourbon"]],
  ["blended-scotch-750", "Blended Scotch Whisky 750 mL", "🥃", "bottle", "750 mL", 54.95, ["scotch", "blended scotch", "scotch whisky"]],
  ["single-malt-scotch-750", "Single Malt Scotch Whisky 750 mL", "🥃", "bottle", "750 mL", 79.95, ["single malt scotch", "single malt"]],
  ["tequila-blanco-750", "Tequila Blanco 750 mL", "🥃", "bottle", "750 mL", 49.95, ["tequila", "blanco tequila", "silver tequila"]],
  ["brandy-750", "Brandy 750 mL", "🥃", "bottle", "750 mL", 37.95, ["brandy", "grape brandy"]],
  ["coffee-liqueur-750", "Coffee Liqueur 750 mL", "☕", "bottle", "750 mL", 29.95, ["coffee liqueur", "kahlua", "coffee liquor"]],
  ["irish-cream-750", "Irish Cream Liqueur 750 mL", "🥛", "bottle", "750 mL", 32.95, ["irish cream", "baileys", "irish cream liqueur"]],
  ["triple-sec-750", "Triple Sec Orange Liqueur 750 mL", "🍊", "bottle", "750 mL", 24.95, ["triple sec", "orange liqueur", "cointreau liqueur"]],
];

// ---------------------------------------------------------------------------
// SCHOOL & OFFICE - Walmart only
// ---------------------------------------------------------------------------
const SCHOOL_OFFICE = [
  ["ballpoint-pens", "Ballpoint Pens", "🖊️", "pack", "12 ct", 5.99, ["ballpoint pens", "blue pens", "pens"]],
  ["gel-pens", "Gel Pens", "🖊️", "pack", "10 ct", 7.99, ["gel pens", "coloured gel pens"]],
  ["hb-pencils", "HB Pencils", "✏️", "pack", "24 ct", 4.99, ["pencils", "hb pencils", "wooden pencils"]],
  ["mechanical-pencils", "Mechanical Pencils", "✏️", "pack", "10 ct", 6.99, ["mechanical pencils", "lead pencils"]],
  ["coloured-pencils", "Coloured Pencils", "🖍️", "pack", "24 ct", 7.99, ["coloured pencils", "colored pencils", "pencil crayons"]],
  ["washable-markers", "Washable Markers", "🖍️", "pack", "10 ct", 6.99, ["markers", "washable markers", "colour markers"]],
  ["permanent-markers", "Permanent Markers", "🖊️", "pack", "12 ct", 9.99, ["permanent markers", "black markers", "sharpie markers"]],
  ["highlighters", "Highlighters", "🖍️", "pack", "6 ct", 5.99, ["highlighters", "highlighter pens"]],
  ["crayons", "Crayons", "🖍️", "box", "24 ct", 3.99, ["crayons", "wax crayons"]],
  ["spiral-notebooks", "Spiral Notebooks", "📓", "pack", "3 ct", 6.99, ["spiral notebooks", "lined notebook", "school notebooks"]],
  ["composition-notebook", "Composition Notebook", "📓", "each", "100 sheets", 3.49, ["composition notebook", "composition book"]],
  ["three-ring-binder", "3-Ring Binder", "📒", "each", "1.5 in", 4.99, ["binder", "three ring binder", "school binder"]],
  ["loose-leaf-paper", "Loose-Leaf Paper", "📄", "pack", "200 sheets", 4.49, ["loose leaf paper", "lined paper", "filler paper"]],
  ["printer-paper", "Printer Paper 500 Sheets", "📄", "ream", "500 sheets", 8.99, ["printer paper", "copy paper", "letter size paper"]],
  ["sticky-notes", "Sticky Notes", "🗒️", "pack", "12 pads", 9.99, ["sticky notes", "post it notes", "sticky note pads"]],
  ["school-scissors", "School Scissors", "✂️", "each", "7 in", 4.49, ["scissors", "school scissors", "kids scissors"]],
  ["glue-sticks", "Glue Sticks", "🧴", "pack", "8 ct", 4.99, ["glue sticks", "school glue sticks"]],
  ["white-school-glue", "White School Glue", "🧴", "each", "118 mL", 2.49, ["school glue", "white glue", "elmers glue"]],
  ["basic-calculator", "Basic Calculator", "🧮", "each", "1 ct", 12.99, ["calculator", "basic calculator", "desk calculator"]],
  ["scientific-calculator", "Scientific Calculator", "🧮", "each", "1 ct", 24.99, ["scientific calculator", "math calculator"]],
  ["school-backpack", "School Backpack", "🎒", "each", "1 ct", 39.99, ["school backpack", "backpack", "kids backpack"]],
  ["pencil-case", "Pencil Case", "✏️", "each", "1 ct", 7.99, ["pencil case", "pencil pouch"]],
  ["desk-stapler", "Desk Stapler", "📎", "each", "1 ct", 8.99, ["stapler", "desk stapler"]],
  ["index-cards", "Index Cards", "🗂️", "pack", "100 ct", 2.49, ["index cards", "recipe cards", "note cards"]],
  ["manila-file-folders", "Manila File Folders", "🗂️", "box", "100 ct", 14.99, ["file folders", "manila folders"]],
  ["pocket-folders", "Pocket Folders", "🗂️", "pack", "6 ct", 4.99, ["pocket folders", "school folders"]],
  ["desk-organizer", "Desk Organizer", "🗄️", "each", "1 ct", 19.99, ["desk organizer", "desk organiser", "pen holder"]],
  ["dry-erase-whiteboard", "Dry-Erase Whiteboard", "⬜", "each", "24 x 36 in", 24.99, ["whiteboard", "dry erase board", "white board"]],
  ["dry-erase-markers", "Dry-Erase Markers", "🖊️", "pack", "8 ct", 8.99, ["dry erase markers", "whiteboard markers"]],
  ["envelopes", "Letter Envelopes", "✉️", "box", "100 ct", 6.99, ["envelopes", "letter envelopes", "white envelopes"]],
  ["tape-dispenser", "Tape Dispenser with Tape", "📎", "each", "1 ct", 9.99, ["tape dispenser", "clear tape", "scotch tape"]],
  ["laminating-pouches", "Laminating Pouches", "📄", "pack", "50 ct", 14.99, ["laminating pouches", "laminator sheets"]],
  ["label-maker", "Label Maker", "🏷️", "each", "1 ct", 39.99, ["label maker", "label printer"]],
  ["paper-shredder", "Paper Shredder", "🗑️", "each", "10 sheet", 59.99, ["paper shredder", "shredder"]],
  ["paper-clips", "Paper Clips", "📎", "box", "500 ct", 3.99, ["paper clips", "paper clip box"]],
  ["binder-clips", "Binder Clips", "📎", "box", "40 ct", 4.99, ["binder clips", "bulldog clips"]],
  ["pencil-sharpener", "Pencil Sharpener", "✏️", "each", "1 ct", 3.49, ["pencil sharpener", "sharpener"]],
  ["school-ruler", "30 cm Ruler", "📏", "each", "30 cm", 1.99, ["ruler", "30 cm ruler", "school ruler"]],
  ["clipboard", "Clipboard", "📋", "each", "1 ct", 5.99, ["clipboard", "writing clipboard"]],
  ["weekly-planner", "Weekly Planner", "📅", "each", "1 ct", 12.99, ["planner", "weekly planner", "agenda book"]],
];

// ---------------------------------------------------------------------------
// TOYS - Walmart only
// ---------------------------------------------------------------------------
const TOYS = [
  ["building-brick-set", "Building Brick Set 500 Pieces", "🧱", "set", "500 pc", 39.99, ["building brick set", "building blocks", "lego set"]],
  ["family-strategy-board-game", "Family Strategy Board Game", "🎲", "each", "1 ct", 29.99, ["strategy board game", "family board game", "board game"]],
  ["classic-word-game", "Classic Word Board Game", "🔤", "each", "1 ct", 24.99, ["word board game", "scrabble game", "word game"]],
  ["trivia-board-game", "Trivia Board Game", "❓", "each", "1 ct", 29.99, ["trivia game", "trivia board game"]],
  ["jigsaw-puzzle-1000", "Jigsaw Puzzle 1000 Pieces", "🧩", "each", "1000 pc", 17.99, ["jigsaw puzzle", "1000 piece puzzle", "puzzle"]],
  ["kids-jigsaw-puzzle-100", "Kids Jigsaw Puzzle 100 Pieces", "🧩", "each", "100 pc", 9.99, ["kids puzzle", "100 piece puzzle"]],
  ["playing-cards", "Playing Cards", "🃏", "pack", "2 decks", 5.99, ["playing cards", "deck of cards", "card deck"]],
  ["colour-matching-card-game", "Colour Matching Card Game", "🃏", "each", "108 cards", 7.99, ["uno", "matching card game", "uno cards"]],
  ["fashion-doll", "Fashion Doll", "👸", "each", "30 cm", 14.99, ["fashion doll", "barbie", "doll"]],
  ["baby-doll", "Soft Body Baby Doll", "🧸", "each", "35 cm", 24.99, ["baby doll", "soft body doll"]],
  ["action-figure", "Action Figure", "🦸", "each", "15 cm", 12.99, ["action figure", "superhero figure", "action figures"]],
  ["toy-car-set", "Toy Car Set", "🚗", "set", "10 pc", 14.99, ["toy cars", "toy car set", "die cast cars"]],
  ["remote-control-car", "Remote-Control Car", "🏎️", "each", "1 ct", 34.99, ["rc car", "remote control car", "radio control car"]],
  ["plush-stuffed-animal", "Plush Stuffed Animal", "🧸", "each", "30 cm", 14.99, ["plush toy", "stuffed animal", "teddy bear"]],
  ["modelling-dough-set", "Modelling Dough Set", "🎨", "set", "10 tubs", 12.99, ["play dough", "modelling dough", "play doh"]],
  ["art-and-craft-kit", "Art and Craft Kit", "🎨", "each", "1 ct", 24.99, ["craft kit", "art kit", "kids craft kit"]],
  ["colouring-books", "Colouring Books", "🖍️", "pack", "3 ct", 7.99, ["colouring books", "coloring books", "colouring book"]],
  ["kids-bike-16", "Kids Bike", "🚲", "each", "16 in", 129, ["kids bike", "children bicycle", "16 inch bike"]],
  ["kick-scooter", "Kids Kick Scooter", "🛴", "each", "1 ct", 39.99, ["kick scooter", "kids scooter", "scooter"]],
  ["water-guns", "Water Guns", "🔫", "pack", "4 ct", 12.99, ["water guns", "water blaster", "super soaker"]],
  ["bubble-solution", "Bubble Solution Pack", "🫧", "pack", "4 ct", 5.99, ["bubbles", "bubble solution", "bubble wand"]],
  ["flying-disc", "Flying Disc", "🥏", "each", "1 ct", 5.99, ["frisbee", "flying disc", "flying disk"]],
  ["kids-kite", "Kids Kite", "🪁", "each", "1 ct", 9.99, ["kite", "kids kite"]],
  ["foam-dart-blaster", "Foam Dart Blaster", "🔫", "each", "1 ct", 24.99, ["foam blaster", "nerf blaster", "foam dart blaster"]],
  ["stacking-rings", "Stacking Toy Rings", "🧸", "each", "1 ct", 9.99, ["stacking toys", "stacking rings", "toddler stacking toy"]],
  ["baby-activity-gym", "Baby Activity Gym", "👶", "each", "1 ct", 39.99, ["baby play gym", "activity gym", "baby gym"]],
  ["toy-kitchen", "Toy Play Kitchen", "🍳", "each", "1 ct", 59.99, ["toy kitchen", "play kitchen", "kids kitchen set"]],
  ["toy-train-set", "Toy Train Set", "🚂", "set", "50 pc", 49.99, ["toy train set", "train set", "wooden train set"]],
  ["slime-kit", "Slime Kit", "🧪", "each", "1 ct", 12.99, ["slime kit", "slime", "diy slime"]],
  ["kids-science-kit", "Kids Science Kit", "🔬", "each", "1 ct", 29.99, ["science kit", "kids science kit", "stem kit"]],
  ["wooden-blocks", "Wooden Building Blocks", "🧱", "set", "100 pc", 19.99, ["wooden blocks", "toy blocks"]],
  ["dinosaur-toy-set", "Toy Dinosaur Set", "🦖", "set", "12 pc", 14.99, ["toy dinosaurs", "dinosaur figures", "dinosaur set"]],
  ["magnetic-tiles", "Magnetic Building Tiles", "🧲", "set", "60 pc", 39.99, ["magnetic tiles", "magnetic building tiles"]],
  ["toy-tool-set", "Kids Toy Tool Set", "🔧", "set", "25 pc", 19.99, ["toy tool set", "kids tool set", "play tool bench"]],
  ["kids-tricycle", "Kids Tricycle", "🚲", "each", "1 ct", 69.99, ["tricycle", "toddler trike", "kids trike"]],
  ["ride-on-toy-car", "Ride-On Toy Car", "🚗", "each", "6 V", 149, ["ride on car", "ride on toy", "kids electric car"]],
  ["kids-play-tent", "Kids Play Tent", "⛺", "each", "1 ct", 29.99, ["play tent", "kids tent", "kids teepee"]],
];

// ---------------------------------------------------------------------------
// BEAUTY - Walmart only
// ---------------------------------------------------------------------------
const BEAUTY = [
  ["mascara", "Volumizing Mascara", "👁️", "each", "9 mL", 9.99, ["mascara", "lash mascara", "waterproof mascara"]],
  ["liquid-foundation", "Liquid Foundation", "💄", "each", "30 mL", 13.99, ["foundation", "liquid foundation", "face foundation"]],
  ["concealer", "Concealer", "💄", "each", "7 mL", 9.99, ["concealer", "under eye concealer"]],
  ["pressed-face-powder", "Pressed Face Powder", "💄", "each", "10 g", 11.99, ["face powder", "pressed powder", "setting powder"]],
  ["powder-blush", "Powder Blush", "💄", "each", "5 g", 9.99, ["blush", "cheek blush", "powder blush"]],
  ["eyeliner", "Liquid Eyeliner", "👁️", "each", "2.5 mL", 7.99, ["eyeliner", "eye liner", "liquid eyeliner"]],
  ["eyeshadow-palette", "Eyeshadow Palette", "🎨", "each", "12 shades", 14.99, ["eyeshadow palette", "eye shadow palette", "eyeshadow"]],
  ["lipstick", "Lipstick", "💄", "each", "3.5 g", 9.99, ["lipstick", "lip colour"]],
  ["lip-gloss", "Lip Gloss", "💋", "each", "6 mL", 7.99, ["lip gloss", "lip shine"]],
  ["makeup-brush-set", "Makeup Brush Set", "🖌️", "set", "12 pc", 19.99, ["makeup brushes", "makeup brush set", "cosmetic brushes"]],
  ["makeup-sponges", "Makeup Blending Sponges", "🧽", "pack", "4 ct", 7.99, ["makeup sponge", "beauty blender", "blending sponge"]],
  ["nail-polish", "Nail Polish", "💅", "each", "13 mL", 6.99, ["nail polish", "nail lacquer", "nail varnish"]],
  ["nail-polish-remover", "Nail Polish Remover", "💅", "each", "236 mL", 4.99, ["nail polish remover", "acetone remover"]],
  ["false-lashes", "False Eyelashes", "👁️", "pack", "5 pair", 7.99, ["false lashes", "fake eyelashes", "strip lashes"]],
  ["night-cream", "Night Cream", "🧴", "each", "50 mL", 17.99, ["night cream", "overnight cream", "night moisturizer"]],
  ["vitamin-c-serum", "Vitamin C Face Serum", "🧴", "each", "30 mL", 24.99, ["face serum", "vitamin c serum", "serum"]],
  ["eye-cream", "Eye Cream", "🧴", "each", "15 mL", 19.99, ["eye cream", "under eye cream"]],
  ["micellar-water", "Micellar Water", "💧", "each", "400 mL", 9.99, ["micellar water", "micellar cleansing water"]],
  ["clay-face-mask", "Clay Face Mask", "🧖", "each", "100 mL", 8.99, ["clay mask", "mud mask", "clay face mask"]],
  ["hair-dryer", "Hair Dryer", "💇", "each", "1875 W", 39.99, ["hair dryer", "blow dryer", "hair blow dryer"]],
  ["hair-straightener", "Ceramic Hair Straightener", "💇", "each", "1 in", 44.99, ["hair straightener", "flat iron", "hair straightening iron"]],
  ["curling-iron", "Curling Iron", "💇", "each", "1.25 in", 34.99, ["curling iron", "hair curler", "curling wand"]],
  ["electric-shaver", "Electric Shaver", "🪒", "each", "1 ct", 59.99, ["electric shaver", "electric razor", "rotary shaver"]],
  ["beard-trimmer", "Electric Beard Trimmer", "🧔", "each", "1 ct", 34.99, ["beard trimmer", "electric beard trimmer", "facial hair trimmer"]],
  ["hair-clippers", "Hair Clippers", "✂️", "set", "20 pc", 39.99, ["hair clippers", "hair trimmer", "clipper set"]],
  ["womens-perfume", "Women's Perfume", "🌸", "each", "50 mL", 59.99, ["perfume", "womens perfume", "eau de parfum"]],
  ["mens-cologne", "Men's Cologne", "🧴", "each", "100 mL", 54.99, ["cologne", "mens cologne", "eau de toilette"]],
  ["fragrance-body-mist", "Fragrance Body Mist", "🌸", "each", "236 mL", 9.99, ["body mist", "fragrance mist", "perfume body mist"]],
  ["tweezers", "Precision Tweezers", "🪮", "each", "1 ct", 6.99, ["tweezers", "eyebrow tweezers"]],
  ["face-bronzer", "Bronzer", "💄", "each", "9 g", 12.99, ["bronzer", "face bronzer"]],
  ["makeup-setting-spray", "Makeup Setting Spray", "💄", "each", "118 mL", 14.99, ["setting spray", "makeup setting spray"]],
  ["face-primer", "Face Primer", "💄", "each", "30 mL", 13.99, ["face primer", "makeup primer"]],
  ["eyebrow-pencil", "Eyebrow Pencil", "✏️", "each", "1 ct", 7.99, ["eyebrow pencil", "brow pencil"]],
  ["lip-liner", "Lip Liner", "💄", "each", "1 ct", 5.99, ["lip liner", "lip pencil"]],
  ["nail-file-set", "Nail File Set", "💅", "set", "6 pc", 5.99, ["nail files", "emery boards", "nail file set"]],
  ["makeup-bag", "Cosmetic Makeup Bag", "👝", "each", "1 ct", 12.99, ["makeup bag", "cosmetic bag"]],
  ["facial-cleansing-brush", "Facial Cleansing Brush", "🧼", "each", "1 ct", 29.99, ["facial cleansing brush", "face scrubber brush"]],
];

// ---------------------------------------------------------------------------
// SEASONAL - Walmart only
// ---------------------------------------------------------------------------
const SEASONAL = [
  // Christmas
  ["christmas-tree-6-5ft", "Artificial Christmas Tree 6.5 ft", "🎄", "each", "6.5 ft", 129, ["christmas tree", "artificial christmas tree", "6.5 ft christmas tree"]],
  ["christmas-tree-7-5ft", "Artificial Christmas Tree 7.5 ft", "🎄", "each", "7.5 ft", 189, ["7.5 ft christmas tree", "tall christmas tree", "7 foot christmas tree"]],
  ["christmas-lights-indoor", "Indoor LED Christmas Lights", "💡", "each", "200 LED", 14.99, ["christmas lights", "indoor christmas lights", "led christmas lights"]],
  ["christmas-lights-outdoor", "Outdoor LED Christmas Lights", "💡", "each", "300 LED", 24.99, ["outdoor christmas lights", "outdoor led lights", "exterior christmas lights"]],
  ["christmas-ornament-set", "Christmas Ornament Set", "🎄", "set", "50 pc", 19.99, ["christmas ornaments", "ornament set", "tree ornaments"]],
  ["christmas-tree-skirt", "Christmas Tree Skirt", "🎄", "each", "48 in", 19.99, ["tree skirt", "christmas tree skirt"]],
  ["christmas-wreath", "Christmas Wreath", "🎄", "each", "24 in", 24.99, ["christmas wreath", "wreath", "door wreath"]],
  ["christmas-wrapping-paper", "Christmas Wrapping Paper", "🎁", "pack", "3 rolls", 9.99, ["wrapping paper", "gift wrap", "christmas wrapping paper"]],
  ["gift-bags", "Gift Bags", "🛍️", "pack", "12 ct", 9.99, ["gift bags", "gift bag set"]],
  ["gift-wrap-tape", "Gift Wrapping Tape", "🎁", "pack", "3 ct", 4.99, ["gift wrap tape", "wrapping tape", "double sided tape"]],
  ["christmas-stockings", "Christmas Stockings", "🧦", "pack", "4 ct", 17.99, ["christmas stockings", "holiday stockings", "stocking set"]],
  ["advent-calendar", "Advent Calendar", "🎄", "each", "1 ct", 9.99, ["advent calendar", "chocolate advent calendar", "countdown calendar"]],
  ["christmas-inflatable", "Outdoor Christmas Inflatable", "🎅", "each", "6 ft", 59.99, ["christmas inflatable", "outdoor inflatable", "lawn inflatable"]],
  ["christmas-garland", "Artificial Christmas Garland", "🎄", "each", "9 ft", 24.99, ["christmas garland", "pine garland"]],
  ["christmas-tree-stand", "Christmas Tree Stand", "🎄", "each", "1 ct", 24.99, ["tree stand", "christmas tree stand"]],
  // Halloween
  ["kids-halloween-costume", "Kids Halloween Costume", "🎃", "each", "1 ct", 29.99, ["kids halloween costume", "halloween costume", "childrens costume"]],
  ["adult-halloween-costume", "Adult Halloween Costume", "🎃", "each", "1 ct", 39.99, ["adult halloween costume", "adult costume"]],
  ["halloween-candy-multipack", "Halloween Candy Variety Pack", "🍬", "bag", "120 pc", 19.99, ["halloween candy", "trick or treat candy", "candy multipack"]],
  ["pumpkin-carving-kit", "Pumpkin Carving Kit", "🎃", "each", "1 ct", 6.99, ["pumpkin carving kit", "pumpkin carving tools"]],
  ["halloween-decorations", "Halloween Decorations Set", "👻", "set", "20 pc", 24.99, ["halloween decorations", "halloween decor", "spooky decorations"]],
  ["trick-or-treat-pail", "Trick-or-Treat Pumpkin Pail", "🎃", "each", "1 ct", 4.99, ["trick or treat bag", "pumpkin pail", "candy pail"]],
  // Spring
  ["easter-basket-set", "Easter Basket Set", "🐰", "each", "1 ct", 14.99, ["easter basket", "easter gift basket"]],
  ["plastic-easter-eggs", "Plastic Easter Eggs", "🥚", "pack", "24 ct", 4.99, ["plastic easter eggs", "fillable easter eggs"]],
  ["valentines-cards", "Valentine's Day Cards", "💌", "pack", "32 ct", 4.99, ["valentine cards", "valentines day cards"]],
  // Winter
  ["kids-sled", "Kids Snow Sled", "🛷", "each", "1 ct", 24.99, ["sled", "kids sled", "snow sled"]],
  ["plastic-toboggan", "Plastic Toboggan", "🛷", "each", "48 in", 39.99, ["toboggan", "plastic toboggan", "snow toboggan"]],
  ["snowshoes", "Adult Snowshoes", "❄️", "pair", "1 pair", 99.99, ["snowshoes", "snow shoes"]],
  ["snow-tube", "Inflatable Snow Tube", "❄️", "each", "1 ct", 29.99, ["snow tube", "sledding tube"]],
  // Summer
  ["inflatable-pool", "Inflatable Swimming Pool", "🏊", "each", "10 ft", 59.99, ["inflatable pool", "kiddie pool", "swimming pool"]],
  ["pool-floats", "Inflatable Pool Float", "🛟", "each", "1 ct", 29.99, ["pool floats", "inflatable pool float", "pool lounger"]],
  ["pool-chlorine-tablets", "Pool Chlorine Tablets", "🧪", "each", "8 ct", 49.99, ["pool chlorine tablets", "chlorine tablets", "pool chlorine"]],
  ["beach-towel", "Oversized Beach Towel", "🏖️", "each", "30 x 60 in", 14.99, ["beach towel", "oversized beach towel"]],
  ["beach-umbrella", "Beach Umbrella", "⛱️", "each", "7 ft", 34.99, ["beach umbrella", "sun umbrella", "beach shade"]],
  ["pool-noodles", "Pool Noodles", "🏊", "pack", "3 ct", 7.99, ["pool noodles", "foam noodles"]],
  ["water-balloons", "Water Balloons", "🎈", "pack", "500 ct", 4.99, ["water balloons", "splash balloons"]],
];

// ---------------------------------------------------------------------------
// GAP-FILL into existing categories
// ---------------------------------------------------------------------------
// Meat - grocery (4 stores). Deli packs are packaged, so imageMode brand.
const MEAT = [
  ["sliced-bologna", "Sliced Bologna", "🥩", "pack", "375 g", 3.99, ["bologna", "sliced bologna", "baloney slices"], "brand", "sliced bologna"],
  ["sliced-pastrami", "Sliced Pastrami", "🥩", "pack", "175 g", 5.49, ["pastrami", "deli pastrami", "smoked pastrami"], "brand", "sliced pastrami"],
  ["sliced-corned-beef", "Sliced Corned Beef", "🥩", "pack", "175 g", 5.49, ["deli corned beef", "sliced corned beef"], "brand", "sliced corned beef"],
  ["corned-beef-brisket", "Corned Beef Brisket", "🥩", "pack", "per lb", 8.99, ["corned beef brisket", "st patricks corned beef"], "generic", "corned beef brisket"],
  ["summer-sausage", "Summer Sausage", "🌭", "pack", "300 g", 7.99, ["summer sausage", "beef summer sausage"], "brand", "summer sausage"],
  ["mortadella", "Sliced Mortadella", "🥩", "pack", "175 g", 4.99, ["mortadella", "mortadella slices"], "brand", "sliced mortadella"],
  ["capicollo", "Sliced Capicollo", "🥩", "pack", "175 g", 5.99, ["capicollo", "hot capicollo", "capocollo ham"], "brand", "sliced capicollo"],
  ["liverwurst", "Liverwurst", "🥩", "pack", "250 g", 4.49, ["liverwurst", "liver sausage"], "brand", "liverwurst"],
];

// Bakery gap-fill (grocery, 4 stores)
const BAKERY_GAP = [
  ["raisin-bread", "Raisin Bread", "🍞", "loaf", "675 g", 3.99, ["raisin bread", "cinnamon raisin bread"], "brand", "raisin bread loaf"],
  ["hot-cross-buns", "Hot Cross Buns", "🥯", "pack", "6 ct", 3.99, ["hot cross buns", "easter buns"], "brand", "hot cross buns"],
  ["challah-bread", "Challah Bread", "🍞", "loaf", "454 g", 4.99, ["challah", "challah bread", "braided egg bread"], "brand", "challah bread"],
  ["pound-cake", "Pound Cake", "🍰", "each", "350 g", 3.99, ["pound cake", "loaf cake"], "brand", "pound cake"],
  ["bakery-brownies", "Bakery Brownies", "🍫", "pack", "6 ct", 4.99, ["brownies", "fudge brownies", "chocolate brownies"], "brand", "brownies"],
];

// Bakery - more (grocery, 4 stores). Packaged loaves/buns brand, fresh generic.
const BAKERY_MORE = [
  ["banana-bread", "Banana Bread", "🍌", "loaf", "450 g", 4.99, ["banana bread", "banana loaf"], "generic", "banana bread"],
  ["potato-bread", "Potato Bread", "🍞", "loaf", "675 g", 3.49, ["potato bread", "potato loaf"], "brand", "potato bread loaf"],
  ["texas-toast", "Texas Toast", "🍞", "loaf", "650 g", 3.29, ["texas toast", "thick sliced toast"], "brand", "texas toast bread"],
  ["submarine-buns", "Submarine Buns", "🥖", "pack", "6 ct", 3.99, ["submarine buns", "sub buns", "hoagie rolls"], "brand", "submarine buns"],
  ["pretzel-buns", "Pretzel Buns", "🥨", "pack", "6 ct", 4.49, ["pretzel buns", "pretzel rolls"], "brand", "pretzel buns"],
  ["whole-wheat-rolls", "Whole Wheat Dinner Rolls", "🥖", "pack", "12 ct", 3.79, ["whole wheat rolls", "whole wheat buns"], "brand", "whole wheat rolls"],
  ["carrot-cake", "Carrot Cake", "🥕", "each", "6 in", 9.99, ["carrot cake", "cream cheese carrot cake"], "generic", "carrot cake"],
  ["chocolate-eclairs", "Chocolate Eclairs", "🍫", "pack", "4 ct", 6.99, ["eclairs", "chocolate eclairs"], "generic", "chocolate eclairs"],
  ["oatmeal-raisin-cookies", "Oatmeal Raisin Cookies", "🍪", "pack", "12 ct", 4.99, ["oatmeal raisin cookies", "oatmeal cookies"], "generic", "oatmeal raisin cookies"],
  ["chocolate-croissants", "Chocolate Croissants", "🥐", "pack", "4 ct", 5.99, ["chocolate croissants", "pain au chocolat"], "generic", "chocolate croissants"],
  ["apple-fritters", "Apple Fritters", "🍎", "pack", "4 ct", 4.99, ["apple fritters", "apple fritter donuts"], "generic", "apple fritters"],
  ["lemon-loaf-cake", "Lemon Loaf Cake", "🍋", "each", "400 g", 5.49, ["lemon loaf", "lemon loaf cake", "lemon pound cake"], "generic", "lemon loaf cake"],
  ["cinnamon-swirl-bread", "Cinnamon Swirl Bread", "🍞", "loaf", "450 g", 4.49, ["cinnamon swirl bread", "cinnamon bread"], "brand", "cinnamon swirl bread"],
  ["soft-pretzels", "Soft Pretzels", "🥨", "pack", "4 ct", 4.49, ["soft pretzels", "bakery pretzels"], "brand", "soft pretzels"],
  ["flatbread", "Flatbread", "🫓", "pack", "4 ct", 3.99, ["flatbread", "flat bread"], "brand", "flatbread"],
];

// Household - grocery (4 stores). Consumables brand, hard goods generic.
const HOUSEHOLD = [
  ["vacuum-bags", "Vacuum Cleaner Bags", "🧹", "pack", "6 ct", 12.99, ["vacuum bags", "vacuum cleaner bags"], "generic"],
  ["lint-roller", "Lint Roller", "🧻", "each", "60 sheets", 5.99, ["lint roller", "lint remover roller"], "generic"],
  ["toilet-brush", "Toilet Brush with Holder", "🚽", "each", "1 ct", 6.99, ["toilet brush", "toilet bowl brush"], "generic"],
  ["toilet-plunger", "Toilet Plunger", "🚽", "each", "1 ct", 8.99, ["plunger", "toilet plunger"], "generic"],
  ["dustpan-and-brush", "Dustpan and Brush Set", "🧹", "set", "2 pc", 7.99, ["dustpan and brush", "hand brush set", "dustpan set"], "generic"],
  ["plastic-bucket", "Plastic Cleaning Bucket", "🪣", "each", "12 L", 4.99, ["plastic bucket", "cleaning bucket", "water bucket"], "generic"],
  ["mop-refill-heads", "Mop Refill Heads", "🧽", "pack", "2 ct", 9.99, ["mop refills", "mop head refill", "mop heads"], "generic"],
  ["rubber-bands", "Rubber Bands", "➰", "bag", "100 g", 4.49, ["rubber bands", "elastic bands"], "brand"],
  ["scrub-brush", "Heavy-Duty Scrub Brush", "🧽", "each", "1 ct", 4.99, ["scrub brush", "cleaning brush"], "generic"],
  ["empty-spray-bottle", "Empty Spray Bottle", "🧴", "each", "500 mL", 3.99, ["spray bottle", "empty spray bottle"], "generic"],
];

// Personal Care - grocery (4 stores)
const PERSONAL_CARE = [
  ["condoms", "Latex Condoms", "🛡️", "box", "12 ct", 12.99, ["condoms", "latex condoms"], "brand"],
  ["pregnancy-test", "Pregnancy Test", "🧪", "box", "2 ct", 14.99, ["pregnancy test", "home pregnancy test"], "brand"],
  ["sunscreen-spray", "Sunscreen Spray SPF 50", "☀️", "can", "170 g", 14.99, ["sunscreen spray", "spray sunscreen", "spf 50 spray"], "brand"],
  ["cotton-rounds", "Cotton Rounds", "⚪", "pack", "80 ct", 3.49, ["cotton rounds", "makeup remover pads"], "brand"],
  ["foot-cream", "Foot Cream", "🦶", "tube", "100 mL", 7.99, ["foot cream", "cracked heel cream", "foot moisturizer"], "brand"],
  ["ovulation-tests", "Ovulation Test Strips", "🧪", "box", "7 ct", 19.99, ["ovulation test", "ovulation test strips"], "brand"],
  ["aloe-vera-gel", "Aloe Vera Gel", "🌿", "bottle", "350 mL", 7.99, ["aloe vera gel", "after sun gel", "sunburn gel"], "brand"],
];

// Pet - grocery (4 stores). Hard goods generic.
const PET = [
  ["dog-bed", "Dog Bed", "🛏️", "each", "Medium", 39.99, ["dog bed", "pet bed", "orthopedic dog bed"], "generic"],
  ["dog-leash", "Dog Leash", "🦮", "each", "6 ft", 14.99, ["dog leash", "6 ft leash"], "generic"],
  ["dog-collar", "Adjustable Dog Collar", "🐕", "each", "Medium", 12.99, ["dog collar", "adjustable dog collar"], "generic"],
  ["cat-scratching-post", "Cat Scratching Post", "🐈", "each", "1 ct", 29.99, ["cat scratching post", "scratching post", "cat scratcher"], "generic"],
  ["litter-scoop", "Cat Litter Scoop", "🐈", "each", "1 ct", 6.99, ["litter scoop", "cat litter scoop"], "generic"],
  ["cat-litter-box", "Cat Litter Box", "🐈", "each", "1 ct", 24.99, ["litter box", "cat litter box"], "generic"],
  ["stainless-dog-bowl", "Stainless Steel Pet Bowl", "🥣", "each", "950 mL", 12.99, ["dog bowl", "pet food bowl", "dog food bowl"], "generic"],
  ["dog-harness", "No-Pull Dog Harness", "🐕", "each", "Medium", 24.99, ["dog harness", "no pull harness"], "generic"],
];

// Baby - grocery (4 stores). Hard goods generic.
const BABY = [
  ["sippy-cups", "Sippy Cups", "🍼", "pack", "2 ct", 9.99, ["sippy cup", "toddler cup", "spill proof cup"], "generic"],
  ["baby-monitor", "Video Baby Monitor", "📹", "each", "1 ct", 79.99, ["baby monitor", "video baby monitor"], "generic"],
  ["baby-stroller", "Lightweight Baby Stroller", "👶", "each", "1 ct", 149.99, ["baby stroller", "stroller", "lightweight stroller"], "generic"],
  ["infant-car-seat", "Infant Car Seat", "🚗", "each", "1 ct", 179.99, ["infant car seat", "baby car seat", "rear facing car seat"], "generic"],
  ["baby-high-chair", "Baby High Chair", "🪑", "each", "1 ct", 99.99, ["high chair", "baby high chair", "feeding chair"], "generic"],
  ["baby-bathtub", "Baby Bathtub", "🛁", "each", "1 ct", 29.99, ["baby bathtub", "baby bath tub", "infant tub"], "generic"],
  ["baby-bibs", "Baby Feeding Bibs", "👶", "pack", "6 ct", 12.99, ["baby bibs", "feeding bibs"], "generic"],
  ["baby-gate", "Safety Baby Gate", "🚪", "each", "1 ct", 44.99, ["baby gate", "stair gate", "safety gate"], "generic"],
];

// Home - Walmart only (check: dish rack, trash can, alarm clock already exist)
const HOME_GAP = [
  ["insulated-lunch-box", "Insulated Lunch Box", "🍱", "each", "1 ct", 19.99, ["lunch box", "lunch bag", "insulated lunch bag"]],
  ["insulated-travel-mug", "Insulated Travel Mug", "☕", "each", "16 oz", 19.99, ["travel mug", "insulated travel mug", "commuter mug"]],
  ["oven-mitts", "Oven Mitts", "🧤", "pack", "2 ct", 12.99, ["oven mitts", "oven gloves"]],
  ["pot-holders", "Silicone Pot Holders", "🧤", "pack", "3 ct", 9.99, ["pot holders", "trivet pot holders"]],
  ["kitchen-towels", "Cotton Kitchen Towels", "🧺", "pack", "6 ct", 14.99, ["kitchen towels", "dish towels", "tea towels"]],
  ["mixing-bowls", "Mixing Bowl Set", "🥣", "set", "5 pc", 19.99, ["mixing bowls", "mixing bowl set"]],
  ["colander", "Stainless Steel Colander", "🍝", "each", "5 qt", 14.99, ["colander", "pasta strainer"]],
  ["wine-glasses", "Wine Glasses", "🍷", "set", "6 pc", 24.99, ["wine glasses", "stemmed wine glasses"]],
  ["wine-opener", "Wine Bottle Opener", "🍷", "each", "1 ct", 14.99, ["wine opener", "wine bottle opener"]],
  ["ice-cube-trays", "Ice Cube Trays", "🧊", "pack", "2 ct", 7.99, ["ice cube trays", "ice trays"]],
];

// Garden - Walmart only (check: pruners = Pruning Shears already exists)
const GARDEN_GAP = [
  ["weed-killer-spray", "Weed Killer Spray", "🌿", "each", "3.78 L", 19.99, ["weed killer", "weed killer herbicide", "weed spray"]],
  ["bird-feeder", "Hanging Bird Feeder", "🐦", "each", "1 ct", 19.99, ["bird feeder", "hanging bird feeder"]],
  ["bird-bath", "Garden Bird Bath", "🐦", "each", "1 ct", 49.99, ["bird bath", "garden bird bath"]],
  ["garden-kneeler", "Garden Kneeler Seat", "🌱", "each", "1 ct", 29.99, ["garden kneeler", "kneeling pad", "garden kneeler seat"]],
  ["garden-trowel", "Garden Hand Trowel", "🌱", "each", "1 ct", 9.99, ["garden trowel", "hand trowel"]],
  ["watering-can", "Watering Can", "🚿", "each", "8 L", 14.99, ["watering can", "garden watering can"]],
  ["compost-bin", "Backyard Compost Bin", "♻️", "each", "300 L", 79.99, ["compost bin", "backyard composter"]],
  ["outdoor-fire-pit", "Outdoor Fire Pit", "🔥", "each", "30 in", 149, ["fire pit", "outdoor fire pit"]],
];

// Automotive - Walmart only (check: sun shade and seat covers already exist)
const AUTOMOTIVE_GAP = [
  ["steering-wheel-cover", "Steering Wheel Cover", "🚗", "each", "1 ct", 14.99, ["steering wheel cover", "wheel cover"]],
  ["headlight-restoration-kit", "Headlight Restoration Kit", "🚗", "each", "1 ct", 19.99, ["headlight restoration kit", "headlight cleaner"]],
  ["tire-shine", "Tire Shine Spray", "🛞", "each", "680 g", 9.99, ["tire shine", "tire dressing"]],
];

// ---------------------------------------------------------------------------
// SPORTS - Walmart only (check: skipping rope, resistance bands exist -> skipped)
// ---------------------------------------------------------------------------
const SPORTS_MORE = [
  ["football", "Football", "🏈", "each", "Official", 29.99, ["football", "official football"]],
  ["tennis-racquet", "Tennis Racquet", "🎾", "each", "27 in", 49.99, ["tennis racquet", "tennis racket"]],
  ["tennis-balls", "Tennis Balls", "🎾", "can", "3 ct", 6.99, ["tennis balls", "can of tennis balls"]],
  ["golf-balls", "Golf Balls", "⛳", "box", "12 ct", 24.99, ["golf balls", "dozen golf balls"]],
  ["golf-glove", "Golf Glove", "🧤", "each", "1 ct", 14.99, ["golf glove", "golfing glove"]],
  ["hiking-backpack", "Hiking Backpack", "🎒", "each", "50 L", 79.99, ["hiking backpack", "trekking pack", "day pack"]],
  ["downhill-skis", "Adult Downhill Ski Set", "⛷️", "set", "1 pair", 349, ["downhill skis", "alpine skis", "ski set"]],
  ["ski-goggles", "Ski Goggles", "🥽", "each", "1 ct", 39.99, ["ski goggles", "snow goggles", "snowboard goggles"]],
  ["swim-goggles", "Swim Goggles", "🥽", "each", "1 ct", 12.99, ["swim goggles", "swimming goggles"]],
  ["folding-treadmill", "Folding Treadmill", "🏃", "each", "1 ct", 699, ["treadmill", "folding treadmill", "running machine"]],
  ["exercise-bike", "Stationary Exercise Bike", "🚴", "each", "1 ct", 349, ["exercise bike", "stationary bike", "spin bike"]],
  ["hockey-pucks", "Hockey Pucks", "🏒", "pack", "3 ct", 9.99, ["hockey puck", "hockey pucks"]],
  ["hockey-gloves", "Senior Hockey Gloves", "🏒", "pair", "13 in", 79.99, ["hockey gloves", "senior hockey gloves"]],
  ["baseball-glove", "Baseball Glove", "⚾", "each", "12 in", 49.99, ["baseball glove", "ball glove", "fielding glove"]],
  ["baseball-bat", "Aluminum Baseball Bat", "⚾", "each", "31 in", 49.99, ["baseball bat", "aluminum bat"]],
  ["volleyball", "Volleyball", "🏐", "each", "Size 5", 24.99, ["volleyball", "beach volleyball"]],
  ["foam-roller", "Foam Roller", "🏋️", "each", "36 in", 24.99, ["foam roller", "muscle roller"]],
  ["pickleball-paddle-set", "Pickleball Paddle Set", "🏓", "set", "2 paddles", 59.99, ["pickleball paddle set", "pickleball set", "pickleball paddles"]],
  ["badminton-set", "Badminton Set", "🏸", "set", "4 player", 39.99, ["badminton set", "badminton racquets", "badminton rackets"]],
  ["camping-lantern", "LED Camping Lantern", "🏮", "each", "1 ct", 24.99, ["camping lantern", "led lantern", "lantern"]],
  ["hydration-pack", "Hydration Pack", "🎒", "each", "2 L", 39.99, ["hydration pack", "hydration backpack", "water bladder pack"]],
  ["golf-club-set", "Complete Golf Club Set", "⛳", "set", "10 pc", 299, ["golf club set", "golf clubs"]],
  ["snowboard", "Adult Snowboard", "🏂", "each", "155 cm", 249, ["snowboard", "adult snowboard"]],
  ["weight-bench", "Adjustable Weight Bench", "🏋️", "each", "1 ct", 129, ["weight bench", "adjustable bench"]],
  ["bike-pump", "Bike Floor Pump", "🚲", "each", "1 ct", 19.99, ["bike pump", "bicycle pump"]],
  ["inline-skates", "Inline Skates", "🛼", "pair", "1 pair", 79.99, ["inline skates", "roller blades"]],
];

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------
const STORE_MULTIPLIERS = { freshco: 1.0, walmart: 0.93, nofrills: 0.96, metro: 1.07 };
const WALMART_MULT = 0.93;

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

// category -> pricing mode
const MODE = {
  Alcohol: "lcbo",
  "School & Office": "walmart",
  Toys: "walmart",
  Beauty: "walmart",
  Seasonal: "walmart",
  Home: "walmart",
  Garden: "walmart",
  Automotive: "walmart",
  Sports: "walmart",
  Meat: "grocery",
  Bakery: "grocery",
  Household: "grocery",
  "Personal Care": "grocery",
  Pet: "grocery",
  Baby: "grocery",
};

const GROUPS = [
  ["Alcohol", ALCOHOL],
  ["School & Office", SCHOOL_OFFICE],
  ["Toys", TOYS],
  ["Beauty", BEAUTY],
  ["Seasonal", SEASONAL],
  ["Meat", MEAT],
  ["Bakery", BAKERY_GAP],
  ["Bakery", BAKERY_MORE],
  ["Household", HOUSEHOLD],
  ["Personal Care", PERSONAL_CARE],
  ["Pet", PET],
  ["Baby", BABY],
  ["Home", HOME_GAP],
  ["Garden", GARDEN_GAP],
  ["Automotive", AUTOMOTIVE_GAP],
  ["Sports", SPORTS_MORE],
];

/** Every new item as an items.json-shaped record (with `base` last-ish). */
export function buildNewItems() {
  const out = [];
  for (const [category, rows] of GROUPS) {
    for (const [id, name, emoji, unit, size, base, terms, imageMode = "generic", offQuery] of rows) {
      out.push({
        id, name, brand: "", category, unit, size, base, emoji,
        searchTerms: terms,
        imageMode,
        offQuery: offQuery ?? name.toLowerCase(),
      });
    }
  }
  return out;
}

/** The `prices` object for one new item, by its category's pricing mode. */
export function pricesFor(it) {
  const mode = MODE[it.category];
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
  let skipped = 0;
  for (const it of buildNewItems()) {
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
  }

  const total = Object.values(added).reduce((a, b) => a + b, 0);
  console.log(
    `${total} added (${Object.entries(added).map(([k, v]) => `${k} ${v}`).join(", ")}); ${skipped} already present. Catalog: ${products.length}.`,
  );
  if (DRY) {
    console.log("--dry: nothing written.");
  } else if (total > 0) {
    writeFileSync(ITEMS, JSON.stringify(items, null, 2) + "\n");
    writeFileSync(PRODUCTS, JSON.stringify(products, null, 2) + "\n");
    console.log("Written.");
  }
}
