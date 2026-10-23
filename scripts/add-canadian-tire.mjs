/*
 * Add everyday Canadian Tire-style items to the catalog.
 * ---------------------------------------------------------------------------
 * The catalog covered groceries, electronics and furniture. A shopper asking for
 * "a cordless drill", "winter tires" or "a snow shovel" fell through to an
 * AI-generated product with a guessed price. Giving these catalog ids means the
 * model can pick them by id (see lib/ai/planPrompt.ts), they resolve the same
 * way every time, and the verified-photo harvest can target them.
 *
 * Generic items only - "Cordless Drill", not a brand or model number - for the
 * same reason the grocery list says "Butter" rather than a brand: each store puts
 * forward its own version.
 *
 * PRICING
 *
 * Same as add-electronics-furniture.mjs: products.json holds prices for the
 * four seeded grocery stores only, and none of those carry this stock. So each
 * item gets a WALMART price only, using the same multiplier and hash wobble as
 * expand-catalog.mjs. The resolver then anchors every other store that stocks
 * the department (Canadian Tire, Home Depot, Costco, Lowe's...) to it through
 * its priceIndex. Base prices are realistic 2026 CAD estimates, not scraped.
 *
 * ALIASES
 *
 * Every name and searchTerm must be unique across the catalog and must not reuse
 * a term from the curated TERMS in lib/catalog/curated.ts ("air purifier",
 * "air conditioner", "portable ac", "tower fan", "fan", "iphone", ...). Run
 * scripts/check-canadian-tire.mjs after editing this list.
 *
 * Idempotent: ids already in the catalog are skipped.
 * Run:  node scripts/add-canadian-tire.mjs   (add --dry to preview)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ITEMS = `${ROOT}data/items.json`;
const PRODUCTS = `${ROOT}data/products.json`;

// [id, name, emoji, unit, size, base, terms]
const APPLIANCES = [
  // --- Vacuums ---
  ["upright-vacuum", "Upright Vacuum", "🧹", "each", "1 ct", 149, ["vacuum", "upright vacuum", "vacuum cleaner"]],
  ["stick-vacuum", "Cordless Stick Vacuum", "🧹", "each", "1 ct", 249, ["stick vacuum", "cordless vacuum"]],
  ["robot-vacuum", "Robot Vacuum", "🤖", "each", "1 ct", 299, ["robot vacuum", "roomba", "robotic vacuum"]],
  ["handheld-vacuum", "Handheld Vacuum", "🧹", "each", "1 ct", 59.99, ["handheld vacuum", "car vacuum", "hand vac"]],
  ["shop-vac", "Wet/Dry Shop Vacuum", "🧹", "each", "12 gal", 99, ["shop vac", "wet dry vac", "wet dry vacuum"]],
  ["steam-mop", "Steam Mop", "🧼", "each", "1 ct", 89.99, ["steam mop", "steam cleaner"]],
  // --- Heating, cooling, air ---
  ["ceramic-space-heater", "Ceramic Space Heater", "🔥", "each", "1500 W", 59.99, ["heater", "space heater", "ceramic heater"]],
  ["oil-filled-heater", "Oil-Filled Radiator Heater", "🔥", "each", "1500 W", 89, ["oil filled heater", "oil radiator", "radiator heater"]],
  ["infrared-heater", "Infrared Space Heater", "🔥", "each", "1500 W", 129, ["infrared heater", "quartz heater"]],
  ["baseboard-heater", "Electric Baseboard Heater", "🔥", "each", "4 ft", 59, ["baseboard heater", "electric baseboard"]],
  ["garage-heater", "Wall-Mounted Garage Heater", "🔥", "each", "5000 W", 129, ["garage heater", "shop heater"]],
  ["electric-fireplace", "Electric Fireplace Heater", "🔥", "each", "1 ct", 299, ["electric fireplace", "fireplace heater"]],
  ["dehumidifier", "35-Pint Dehumidifier", "💧", "each", "35 pint", 249, ["dehumidifier", "basement dehumidifier", "moisture remover"]],
  ["humidifier", "Cool Mist Humidifier", "💧", "each", "1 gal", 59.99, ["humidifier", "room humidifier", "bedroom humidifier"]],
  ["window-ac-8000", "8,000 BTU Window AC Unit", "❄️", "each", "8000 BTU", 349, ["window ac", "window ac unit", "8000 btu ac"]],
  ["window-ac-12000", "12,000 BTU Window AC Unit", "❄️", "each", "12000 BTU", 499, ["12000 btu ac", "large window ac", "12000 btu window ac"]],
  ["ceiling-fan", "52-inch Ceiling Fan", "🌀", "each", "52 in", 129, ["ceiling fan", "52 inch ceiling fan"]],
  ["box-fan", "20-inch Box Fan", "🌀", "each", "20 in", 39.99, ["box fan", "20 inch fan", "window fan"]],
  ["desk-fan", "Desk Fan", "🌀", "each", "1 ct", 29.99, ["desk fan", "table fan", "personal fan"]],
  // --- Small kitchen appliances ---
  ["electric-kettle", "Electric Kettle", "☕", "each", "1.7 L", 39.99, ["kettle", "electric kettle", "hot water kettle"]],
  ["toaster-4-slice", "4-Slice Toaster", "🍞", "each", "4 slice", 39.99, ["toaster", "4 slice toaster"]],
  ["toaster-oven", "Toaster Oven", "🍞", "each", "6 slice", 99, ["toaster oven", "countertop oven"]],
  ["air-fryer", "Air Fryer", "🍟", "each", "5.7 L", 99.99, ["air fryer", "airfryer"]],
  ["air-fryer-oven", "Air Fryer Oven", "🍟", "each", "26 L", 149, ["air fryer oven", "convection air fryer"]],
  ["countertop-blender", "Countertop Blender", "🥤", "each", "1.5 L", 79.99, ["blender", "countertop blender"]],
  ["personal-blender", "Personal Blender", "🥤", "each", "600 mL", 49.99, ["personal blender", "smoothie blender", "bullet blender"]],
  ["immersion-blender", "Immersion Blender", "🥣", "each", "1 ct", 39.99, ["immersion blender", "hand blender", "stick blender"]],
  ["stand-mixer", "Stand Mixer", "🍰", "each", "4.7 L", 349, ["stand mixer", "kitchen mixer"]],
  ["hand-mixer", "Hand Mixer", "🍰", "each", "5 speed", 39.99, ["hand mixer", "electric mixer"]],
  ["drip-coffee-maker", "12-Cup Drip Coffee Maker", "☕", "each", "12 cup", 59.99, ["coffee maker", "drip coffee maker", "coffee machine"]],
  ["single-serve-coffee", "Single-Serve Coffee Machine", "☕", "each", "1 ct", 99, ["single serve coffee", "pod coffee machine", "k cup machine"]],
  ["espresso-machine", "Espresso Machine", "☕", "each", "15 bar", 249, ["espresso machine", "espresso maker"]],
  ["slow-cooker", "Slow Cooker", "🍲", "each", "6 qt", 49.99, ["slow cooker", "crock pot"]],
  ["pressure-cooker", "Electric Pressure Cooker", "🍲", "each", "6 qt", 129, ["pressure cooker", "instant pot", "multi cooker"]],
  ["rice-cooker", "Rice Cooker", "🍚", "each", "10 cup", 49.99, ["rice cooker", "rice steamer"]],
  ["countertop-microwave", "Countertop Microwave", "📡", "each", "1.1 cu ft", 119, ["microwave", "microwave oven"]],
  ["otr-microwave", "Over-the-Range Microwave", "📡", "each", "1.7 cu ft", 349, ["over the range microwave", "otr microwave"]],
  ["food-processor", "Food Processor", "🥣", "each", "11 cup", 89.99, ["food processor", "food chopper"]],
  ["waffle-maker", "Waffle Maker", "🧇", "each", "1 ct", 49.99, ["waffle maker", "waffle iron"]],
  ["electric-griddle", "Electric Griddle", "🍳", "each", "1 ct", 59.99, ["electric griddle", "pancake griddle"]],
  ["panini-press", "Panini Press", "🥪", "each", "1 ct", 44.99, ["panini press", "sandwich maker", "grill press"]],
  ["juicer", "Juice Extractor", "🧃", "each", "1 ct", 89, ["juicer", "juice extractor"]],
  ["hot-plate", "Portable Hot Plate", "🔥", "each", "1 burner", 39.99, ["hot plate", "portable burner"]],
  ["bread-maker", "Bread Maker", "🍞", "each", "2 lb", 149, ["bread maker", "bread machine"]],
  ["ice-maker", "Countertop Ice Maker", "🧊", "each", "26 lb/day", 169, ["ice maker", "countertop ice maker"]],
  // --- Laundry care ---
  ["clothes-iron", "Steam Iron", "👔", "each", "1 ct", 44.99, ["iron", "clothes iron", "steam iron"]],
  ["garment-steamer", "Garment Steamer", "👔", "each", "1 ct", 49.99, ["garment steamer", "clothes steamer", "handheld steamer"]],
  // --- Large appliances ---
  ["mini-fridge", "Compact Mini Fridge", "🧊", "each", "3.2 cu ft", 179, ["mini fridge", "bar fridge", "dorm fridge"]],
  ["chest-freezer", "Chest Freezer", "🧊", "each", "7 cu ft", 349, ["chest freezer", "deep freezer"]],
  ["upright-freezer", "Upright Freezer", "🧊", "each", "14 cu ft", 649, ["upright freezer", "standing freezer"]],
  ["top-load-washer", "Top-Load Washer", "🧺", "each", "5.0 cu ft", 849, ["washing machine", "top load washer", "washer"]],
  ["front-load-washer", "Front-Load Washer", "🧺", "each", "5.2 cu ft", 1099, ["front load washer", "front loader washer"]],
  ["portable-washer", "Portable Compact Washer", "🧺", "each", "1 ct", 249, ["portable washer", "compact washer"]],
  ["electric-dryer", "Electric Dryer", "🧺", "each", "7.0 cu ft", 799, ["dryer", "clothes dryer", "electric dryer"]],
  ["dishwasher", "Built-In Dishwasher", "🍽️", "each", "24 in", 649, ["dishwasher", "built in dishwasher"]],
  ["electric-range", "Electric Range", "🍳", "each", "30 in", 899, ["range", "electric range", "electric stove"]],
  ["gas-range", "Gas Range", "🍳", "each", "30 in", 999, ["gas range", "gas stove"]],
  ["top-freezer-fridge", "Top-Freezer Refrigerator", "🧊", "each", "18 cu ft", 849, ["fridge", "refrigerator", "top freezer fridge"]],
  ["french-door-fridge", "French Door Refrigerator", "🧊", "each", "27 cu ft", 1999, ["french door fridge", "french door refrigerator"]],
];

const ELECTRONICS = [
  ["tv-50-4k", "50-inch 4K Smart TV", "📺", "each", "50 in", 399, ["50 inch tv", "50 inch 4k tv"]],
  ["tv-75-4k", "75-inch 4K Smart TV", "📺", "each", "75 in", 1099, ["75 inch tv", "75 inch 4k tv"]],
  ["tv-wall-mount", "TV Wall Mount", "📺", "each", "32-70 in", 39.99, ["tv wall mount", "tv bracket", "tv mount"]],
  ["universal-remote", "Universal Remote Control", "📺", "each", "1 ct", 24.99, ["universal remote", "tv remote", "replacement remote"]],
  ["outdoor-extension-cord", "Outdoor Extension Cord", "🔌", "each", "15 m", 29.99, ["outdoor extension cord", "outdoor power cord"]],
  ["led-string-lights", "LED String Lights", "💡", "each", "100 LED", 19.99, ["led string lights", "fairy lights", "string lights"]],
  ["dash-cam", "Dash Cam", "📷", "each", "1080p", 99.99, ["dash cam", "dashcam", "car camera"]],
  ["fm-transmitter", "Bluetooth FM Transmitter", "📻", "each", "1 ct", 24.99, ["fm transmitter", "bluetooth car adapter"]],
  ["car-charger", "Dual USB Car Charger", "🔌", "each", "1 ct", 19.99, ["car charger", "12v usb charger"]],
  ["wireless-charging-pad", "Wireless Charging Pad", "🔌", "each", "15 W", 29.99, ["wireless charger", "wireless charging pad"]],
  ["projector", "Mini Projector", "📽️", "each", "1080p", 199, ["projector", "mini projector", "home projector"]],
  ["tv-antenna", "HD Digital TV Antenna", "📡", "each", "1 ct", 39.99, ["tv antenna", "digital antenna"]],
  ["rechargeable-batteries", "Rechargeable AA Batteries", "🔋", "pack", "8 ct", 29.99, ["rechargeable batteries", "rechargeable aa batteries"]],
  ["clock-radio", "Digital Alarm Clock Radio", "⏰", "each", "1 ct", 29.99, ["clock radio", "alarm clock"]],
  ["smart-thermostat", "Smart Wi-Fi Thermostat", "🌡️", "each", "1 ct", 199, ["smart thermostat", "wifi thermostat"]],
];

const HOME = [
  ["cookware-set", "10-Piece Cookware Set", "🍳", "set", "10 pc", 149, ["cookware set", "pots and pans set", "pot set"]],
  ["nonstick-frying-pan", "Non-Stick Frying Pan", "🍳", "each", "12 in", 29.99, ["non stick frying pan", "frying pan", "nonstick pan"]],
  ["stock-pot", "Stainless Steel Stock Pot", "🍲", "each", "12 qt", 49.99, ["stock pot", "large pot", "soup pot"]],
  ["cast-iron-skillet", "Cast Iron Skillet", "🍳", "each", "12 in", 39.99, ["cast iron skillet", "cast iron pan"]],
  ["knife-block-set", "Knife Block Set", "🔪", "set", "14 pc", 79.99, ["knife block set", "knife set", "kitchen knives"]],
  ["cutting-board", "Cutting Board", "🪵", "each", "18 x 12 in", 24.99, ["cutting board", "chopping board"]],
  ["bakeware-set", "Non-Stick Bakeware Set", "🍰", "set", "5 pc", 49.99, ["bakeware set", "baking pan set"]],
  ["baking-sheet", "Aluminum Baking Sheet", "🍪", "each", "13 x 18 in", 19.99, ["baking sheet", "cookie sheet", "sheet pan"]],
  ["food-storage-containers", "Food Storage Containers", "🥡", "set", "24 pc", 29.99, ["food storage containers", "tupperware", "meal prep containers"]],
  ["dinnerware-set", "16-Piece Dinnerware Set", "🍽️", "set", "16 pc", 59.99, ["dinnerware set", "dish set", "plates and bowls"]],
  ["cutlery-set", "Stainless Steel Cutlery Set", "🍴", "set", "24 pc", 39.99, ["cutlery set", "flatware set", "silverware set"]],
  ["drinking-glasses", "Drinking Glasses", "🥛", "set", "12 pc", 24.99, ["drinking glasses", "drinking glass set", "tumblers"]],
  ["coffee-mugs", "Ceramic Coffee Mugs", "☕", "set", "4 pc", 19.99, ["coffee mugs", "mug set"]],
  ["utensil-set", "Kitchen Utensil Set", "🥄", "set", "12 pc", 24.99, ["kitchen utensil set", "cooking utensils"]],
  ["measuring-cups", "Measuring Cups and Spoons", "🥄", "set", "8 pc", 12.99, ["measuring cups", "measuring spoons"]],
  ["dish-rack", "Dish Drying Rack", "🍽️", "each", "1 ct", 29.99, ["dish rack", "dish drying rack"]],
  ["trash-can", "Kitchen Trash Can", "🗑️", "each", "50 L", 39.99, ["trash can", "garbage can", "kitchen garbage can"]],
  ["bath-towels", "Cotton Bath Towels", "🛁", "set", "6 pc", 39.99, ["bath towels", "towel set"]],
  ["bath-mat", "Non-Slip Bath Mat", "🛁", "each", "1 ct", 19.99, ["bath mat", "bathroom rug"]],
  ["shower-curtain", "Shower Curtain", "🚿", "each", "72 x 72 in", 19.99, ["shower curtain", "bathroom curtain"]],
  ["queen-sheet-set", "Queen Bed Sheet Set", "🛏️", "set", "Queen", 49.99, ["queen sheets", "bed sheets", "queen sheet set"]],
  ["duvet-insert", "Duvet Insert", "🛏️", "each", "Queen", 79.99, ["duvet", "comforter", "duvet insert"]],
  ["duvet-cover", "Duvet Cover", "🛏️", "each", "Queen", 49.99, ["duvet cover", "queen duvet cover"]],
  ["bed-pillows", "Bed Pillows", "🛏️", "pack", "2 ct", 39.99, ["pillows", "bed pillows", "sleeping pillows"]],
  ["mattress-protector", "Waterproof Mattress Protector", "🛏️", "each", "Queen", 39.99, ["mattress protector", "mattress pad"]],
  ["throw-blanket", "Fleece Throw Blanket", "🧣", "each", "50 x 60 in", 29.99, ["throw blanket", "fleece blanket"]],
  ["laundry-basket", "Laundry Basket", "🧺", "each", "1 ct", 14.99, ["laundry basket", "clothes basket"]],
  ["laundry-hamper", "Laundry Hamper", "🧺", "each", "1 ct", 29.99, ["laundry hamper", "dirty clothes hamper"]],
  ["ironing-board", "Ironing Board", "👔", "each", "1 ct", 39.99, ["ironing board", "iron board"]],
  ["step-stool", "Folding Step Stool", "🪜", "each", "2 step", 29.99, ["step stool", "kitchen step stool"]],
  ["storage-bins", "Plastic Storage Bins with Lids", "📦", "pack", "6 ct", 39.99, ["storage bins", "plastic storage bins", "storage totes"]],
  ["closet-organizer", "Closet Organizer", "👗", "each", "1 ct", 49.99, ["closet organizer", "closet shelf", "closet storage"]],
  ["clothes-hangers", "Plastic Clothes Hangers", "👔", "pack", "50 ct", 19.99, ["clothes hangers", "hangers", "plastic hangers"]],
  ["broom-dustpan", "Broom and Dustpan Set", "🧹", "set", "2 pc", 19.99, ["broom and dustpan", "broom"]],
  ["mop-bucket", "Mop and Bucket Set", "🧽", "set", "2 pc", 29.99, ["mop and bucket", "mop"]],
  ["smoke-detector", "Smoke Detector", "🚨", "each", "1 ct", 24.99, ["smoke detector", "smoke alarm"]],
  ["co-detector", "Carbon Monoxide Detector", "🚨", "each", "1 ct", 39.99, ["carbon monoxide detector", "co detector", "co alarm"]],
  ["fire-extinguisher", "ABC Fire Extinguisher", "🧯", "each", "2.5 lb", 34.99, ["fire extinguisher", "abc extinguisher"]],
  ["flashlight", "LED Flashlight", "🔦", "each", "1 ct", 19.99, ["flashlight", "led flashlight", "torch"]],
  ["door-mat", "Door Mat", "🚪", "each", "18 x 30 in", 24.99, ["door mat", "welcome mat", "entry mat"]],
  ["window-curtains", "Window Curtains", "🪟", "pack", "2 panel", 39.99, ["curtains", "window curtains", "drapes"]],
  ["blackout-blinds", "Blackout Cordless Blinds", "🪟", "each", "36 x 64 in", 29.99, ["blackout blinds", "room darkening blinds", "window blinds"]],
  ["wall-clock", "Wall Clock", "🕒", "each", "12 in", 24.99, ["wall clock", "analog wall clock"]],
  ["hand-towels", "Cotton Hand Towels", "🛁", "set", "6 pc", 24.99, ["hand towels", "hand towel set"]],
  ["picture-frames", "Picture Frames", "🖼️", "set", "3 pc", 24.99, ["picture frames", "photo frames"]],
];

const HARDWARE = [
  ["cordless-drill", "Cordless Drill", "🔧", "each", "20 V", 99, ["drill", "cordless drill", "power drill"]],
  ["impact-driver", "Cordless Impact Driver", "🔧", "each", "20 V", 129, ["impact driver", "impact drill"]],
  ["circular-saw", "Circular Saw", "🪚", "each", "7-1/4 in", 119, ["circular saw", "skill saw"]],
  ["jigsaw", "Jigsaw", "🪚", "each", "1 ct", 89, ["jigsaw", "jig saw"]],
  ["hand-saw", "Hand Saw", "🪚", "each", "15 in", 19.99, ["hand saw", "wood saw"]],
  ["orbital-sander", "Random Orbital Sander", "🔧", "each", "5 in", 79, ["orbital sander", "power sander"]],
  ["angle-grinder", "Angle Grinder", "🔧", "each", "4-1/2 in", 69, ["angle grinder", "grinder"]],
  ["drill-bit-set", "Drill Bit Set", "🔩", "set", "29 pc", 29.99, ["drill bit set", "drill bits"]],
  ["claw-hammer", "Claw Hammer", "🔨", "each", "16 oz", 19.99, ["hammer", "claw hammer"]],
  ["screwdriver-set", "Screwdriver Set", "🪛", "set", "24 pc", 24.99, ["screwdriver set", "screwdrivers"]],
  ["socket-set", "Socket Set", "🔧", "set", "40 pc", 49.99, ["socket set", "ratchet set"]],
  ["wrench-set", "Combination Wrench Set", "🔧", "set", "14 pc", 39.99, ["wrench set", "spanner set"]],
  ["pliers-set", "Pliers Set", "🔧", "set", "3 pc", 29.99, ["pliers set", "pliers"]],
  ["tape-measure", "Tape Measure", "📏", "each", "25 ft", 12.99, ["tape measure", "measuring tape"]],
  ["spirit-level", "Box Level", "📏", "each", "24 in", 14.99, ["spirit level", "bubble level", "24 inch level"]],
  ["utility-knife", "Utility Knife", "🔪", "each", "1 ct", 9.99, ["utility knife", "box cutter"]],
  ["tool-box", "Tool Box", "🧰", "each", "19 in", 29.99, ["tool box", "toolbox", "tool chest"]],
  ["work-gloves", "Work Gloves", "🧤", "pair", "L", 14.99, ["work gloves", "leather work gloves"]],
  ["safety-glasses", "Safety Glasses", "🥽", "each", "1 ct", 9.99, ["safety glasses", "safety goggles"]],
  ["hearing-protection", "Hearing Protection Ear Muffs", "🎧", "each", "1 ct", 14.99, ["ear muffs", "hearing protection"]],
  ["step-ladder", "Aluminum Step Ladder", "🪜", "each", "6 ft", 99, ["step ladder", "6 foot ladder"]],
  ["extension-ladder", "Extension Ladder", "🪜", "each", "24 ft", 249, ["extension ladder", "aluminum ladder"]],
  ["wood-screws", "Wood Screws", "🔩", "pack", "200 ct", 14.99, ["wood screws", "deck screws"]],
  ["common-nails", "Common Nails", "🔩", "pack", "1 lb", 6.99, ["common nails", "framing nails"]],
  ["drywall-anchors", "Drywall Anchors", "🔩", "pack", "50 ct", 9.99, ["drywall anchors", "wall anchors"]],
  ["lubricant-spray", "Multi-Use Lubricant Spray", "🛢️", "each", "311 g", 9.99, ["wd-40", "wd40", "lubricant spray"]],
  ["silicone-caulk", "Silicone Caulk", "🔧", "each", "300 mL", 9.99, ["caulk", "silicone caulk", "bathroom caulk"]],
  ["caulking-gun", "Caulking Gun", "🔧", "each", "1 ct", 9.99, ["caulking gun", "caulk gun"]],
  ["painters-tape", "Painter's Tape", "🎨", "each", "36 mm x 55 m", 8.99, ["painters tape", "masking tape", "blue tape"]],
  ["electrical-tape", "Electrical Tape", "🔌", "pack", "3 ct", 5.99, ["electrical tape", "black tape"]],
  ["wood-glue", "Wood Glue", "🪵", "each", "237 mL", 7.99, ["wood glue", "carpenter glue"]],
  ["sandpaper", "Assorted Sandpaper", "🧱", "pack", "30 ct", 9.99, ["sandpaper", "sanding sheets"]],
  ["interior-paint", "Interior Latex Paint", "🎨", "each", "3.78 L", 49.99, ["paint", "interior paint", "wall paint"]],
  ["paint-roller-kit", "Paint Roller Kit", "🎨", "set", "9 in", 19.99, ["paint roller kit", "roller and tray"]],
  ["paint-brushes", "Paint Brushes", "🖌️", "pack", "5 ct", 14.99, ["paint brushes", "paintbrush set"]],
  ["stud-finder", "Stud Finder", "📡", "each", "1 ct", 24.99, ["stud finder", "stud sensor"]],
  ["padlock", "Keyed Padlock", "🔒", "each", "40 mm", 14.99, ["padlock", "combination lock"]],
  ["zip-ties", "Cable Zip Ties", "🔗", "pack", "100 ct", 9.99, ["zip ties", "cable ties"]],
  ["bungee-cords", "Bungee Cords", "🔗", "pack", "12 ct", 12.99, ["bungee cords", "bungee straps", "tie down straps"]],
  ["tarp", "Poly Tarp", "🟦", "each", "10 x 12 ft", 19.99, ["tarp", "tarpaulin", "blue tarp"]],
  ["shop-light", "LED Shop Light", "💡", "each", "4 ft", 34.99, ["shop light", "led shop light", "garage light"]],
  ["heavy-duty-extension-cord", "Heavy-Duty Extension Cord", "🔌", "each", "15 m", 44.99, ["heavy duty extension cord", "12 gauge extension cord"]],
  ["pry-bar", "Pry Bar", "🔧", "each", "15 in", 16.99, ["pry bar", "crowbar"]],
  ["putty-knife", "Putty Knife", "🔧", "each", "3 in", 7.99, ["putty knife", "drywall knife"]],
  ["multimeter", "Digital Multimeter", "⚡", "each", "1 ct", 29.99, ["multimeter", "voltage tester"]],
];

const AUTOMOTIVE = [
  ["synthetic-oil-5w30", "Synthetic Motor Oil 5W-30", "🛢️", "each", "5 L", 39.99, ["5w30 oil", "synthetic motor oil", "5w-30 synthetic oil"]],
  ["synthetic-oil-0w20", "Synthetic Motor Oil 0W-20", "🛢️", "each", "5 L", 42.99, ["0w20 oil", "0w-20 synthetic oil"]],
  ["conventional-oil-5w30", "Conventional Motor Oil 5W-30", "🛢️", "each", "5 L", 27.99, ["conventional motor oil", "5w30 conventional oil", "motor oil"]],
  ["oil-filter", "Engine Oil Filter", "🛢️", "each", "1 ct", 9.99, ["oil filter", "engine oil filter"]],
  ["wiper-blades", "Wiper Blades", "🚗", "pack", "2 ct", 34.99, ["wiper blades", "windshield wipers", "wipers"]],
  ["washer-fluid-summer", "Windshield Washer Fluid", "💧", "each", "4 L", 3.99, ["washer fluid", "windshield washer fluid", "summer washer fluid"]],
  ["washer-fluid-winter", "Winter Windshield Washer Fluid -40", "❄️", "each", "4 L", 4.99, ["winter washer fluid", "washer fluid minus 40", "-40 washer fluid"]],
  ["antifreeze", "Antifreeze Coolant", "🧪", "each", "3.78 L", 24.99, ["antifreeze", "coolant", "engine coolant"]],
  ["car-battery", "Car Battery", "🔋", "each", "Group 24F", 179.99, ["car battery", "12v battery", "automotive battery"]],
  ["booster-cables", "Booster Cables", "🔌", "each", "20 ft", 29.99, ["booster cables", "jumper cables"]],
  ["jump-starter", "Portable Jump Starter", "🔋", "each", "1000 A", 99, ["jump starter", "portable jump starter", "battery booster"]],
  ["battery-charger", "12V Battery Charger", "🔋", "each", "6 A", 59.99, ["battery charger", "car battery charger", "trickle charger"]],
  ["tire-inflator", "12V Tire Inflator", "🛞", "each", "1 ct", 39.99, ["tire inflator", "air compressor", "portable tire pump"]],
  ["tire-gauge", "Tire Pressure Gauge", "🛞", "each", "1 ct", 9.99, ["tire pressure gauge", "tire gauge"]],
  ["snow-brush", "Snow Brush and Ice Scraper", "🧊", "each", "1 ct", 24.99, ["snow brush", "ice scraper", "snow scraper"]],
  ["windshield-deicer", "Windshield De-Icer Spray", "🧊", "each", "500 mL", 7.99, ["windshield de-icer", "de icer spray"]],
  ["winter-tires", "Winter Tires (Set of 4)", "🛞", "set", "215/60R16", 649, ["winter tires", "snow tires", "winter tire set"]],
  ["all-season-tires", "All-Season Tires (Set of 4)", "🛞", "set", "215/60R16", 549, ["all season tires", "all season tire set", "all weather tires"]],
  ["car-wash-soap", "Car Wash Soap", "🧼", "each", "1.4 L", 12.99, ["car wash soap", "car wash", "car shampoo"]],
  ["car-wax", "Car Wax", "✨", "each", "473 mL", 14.99, ["car wax", "paste wax", "spray wax"]],
  ["microfibre-towels", "Microfibre Cleaning Towels", "🧽", "pack", "12 ct", 19.99, ["microfibre towels", "microfiber towels", "detailing towels"]],
  ["car-floor-mats", "All-Weather Floor Mats", "🚗", "set", "4 pc", 44.99, ["floor mats", "car mats", "all weather floor mats"]],
  ["block-heater-cord", "Block Heater Cord", "🔌", "each", "3 m", 29.99, ["block heater cord", "engine block heater cord"]],
  ["trunk-organizer", "Trunk Organizer", "🚗", "each", "1 ct", 29.99, ["trunk organizer", "car organizer"]],
  ["car-air-freshener", "Car Air Freshener", "🌲", "pack", "3 ct", 7.99, ["car air freshener", "hanging air freshener"]],
  ["brake-fluid", "DOT 3 Brake Fluid", "🛢️", "each", "355 mL", 12.99, ["brake fluid", "dot 3 brake fluid"]],
  ["transmission-fluid", "Automatic Transmission Fluid", "🛢️", "each", "1 L", 14.99, ["transmission fluid", "atf fluid"]],
  ["fuel-system-cleaner", "Fuel System Cleaner", "⛽", "each", "354 mL", 11.99, ["fuel system cleaner", "fuel injector cleaner"]],
  ["gas-can", "Gas Can", "⛽", "each", "20 L", 34.99, ["gas can", "jerry can", "fuel can"]],
  ["windshield-sun-shade", "Windshield Sun Shade", "☀️", "each", "1 ct", 19.99, ["sun shade", "windshield sun shade"]],
  ["car-seat-covers", "Car Seat Covers", "🚗", "set", "2 pc", 59.99, ["seat covers", "car seat covers"]],
  ["tow-strap", "Tow Strap", "🔗", "each", "20 ft", 29.99, ["tow strap", "tow rope"]],
  ["roadside-emergency-kit", "Roadside Emergency Kit", "🚨", "each", "1 ct", 49.99, ["roadside emergency kit", "car emergency kit"]],
  ["cabin-air-filter", "Cabin Air Filter", "🚗", "each", "1 ct", 24.99, ["cabin air filter", "cabin filter"]],
  ["engine-air-filter", "Engine Air Filter", "🚗", "each", "1 ct", 24.99, ["engine air filter", "car air filter"]],
];

const GARDEN = [
  ["gas-bbq", "3-Burner Propane BBQ", "🍖", "each", "3 burner", 399, ["gas bbq", "propane bbq", "gas grill"]],
  ["charcoal-grill", "Charcoal Kettle Grill", "🍖", "each", "22 in", 149, ["charcoal grill", "charcoal bbq", "kettle grill"]],
  ["bbq-cover", "BBQ Cover", "🍖", "each", "1 ct", 39.99, ["bbq cover", "grill cover", "barbecue cover"]],
  ["propane-tank", "Propane Tank", "🔥", "each", "20 lb", 69.99, ["propane tank", "20 lb propane", "bbq propane"]],
  ["bbq-tool-set", "BBQ Tool Set", "🍖", "set", "3 pc", 24.99, ["bbq tools", "grill tools", "bbq tool set"]],
  ["grill-brush", "Grill Cleaning Brush", "🍖", "each", "1 ct", 12.99, ["grill brush", "bbq cleaner brush"]],
  ["gas-lawn-mower", "Gas Push Lawn Mower", "🌱", "each", "21 in", 349, ["gas lawn mower", "gas mower", "push mower"]],
  ["electric-lawn-mower", "Cordless Electric Lawn Mower", "🌱", "each", "40 V", 399, ["electric lawn mower", "cordless mower", "battery mower"]],
  ["string-trimmer", "Cordless String Trimmer", "🌱", "each", "40 V", 149, ["string trimmer", "weed eater", "weed whacker"]],
  ["leaf-blower", "Cordless Leaf Blower", "🍂", "each", "40 V", 99, ["leaf blower", "cordless leaf blower"]],
  ["garden-hose", "Garden Hose", "🚿", "each", "50 ft", 39.99, ["garden hose", "water hose"]],
  ["hose-nozzle", "Hose Spray Nozzle", "🚿", "each", "1 ct", 14.99, ["hose nozzle", "spray nozzle"]],
  ["lawn-sprinkler", "Oscillating Lawn Sprinkler", "💦", "each", "1 ct", 24.99, ["sprinkler", "lawn sprinkler", "oscillating sprinkler"]],
  ["wheelbarrow", "Wheelbarrow", "🛒", "each", "6 cu ft", 129, ["wheelbarrow", "wheel barrow"]],
  ["garden-soil", "Garden Soil", "🪴", "each", "28 L", 7.99, ["garden soil", "potting soil", "topsoil"]],
  ["mulch", "Black Mulch", "🪴", "each", "56 L", 5.99, ["mulch", "black mulch", "bark mulch"]],
  ["grass-seed", "Sun and Shade Grass Seed", "🌱", "each", "2 kg", 24.99, ["grass seed", "lawn seed"]],
  ["lawn-fertilizer", "Lawn Fertilizer", "🌱", "each", "10 kg", 34.99, ["lawn fertilizer", "lawn food", "weed and feed"]],
  ["leaf-rake", "Leaf Rake", "🍂", "each", "1 ct", 19.99, ["leaf rake", "garden rake", "rake"]],
  ["garden-shovel", "Round Point Shovel", "⛏️", "each", "1 ct", 29.99, ["shovel", "garden shovel", "round point shovel"]],
  ["snow-shovel", "Ergonomic Snow Shovel", "❄️", "each", "1 ct", 24.99, ["snow shovel", "ergonomic snow shovel"]],
  ["gas-snow-blower", "Gas Snow Blower", "❄️", "each", "24 in", 799, ["snow blower", "snow thrower", "snowblower"]],
  ["electric-snow-blower", "Cordless Electric Snow Blower", "❄️", "each", "21 in", 599, ["electric snow blower", "cordless snow blower"]],
  ["ice-melter", "Ice Melter Rock Salt", "🧂", "each", "20 kg", 17.99, ["ice melter", "rock salt", "driveway salt"]],
  ["patio-umbrella", "Patio Umbrella", "⛱️", "each", "9 ft", 99, ["patio umbrella", "outdoor umbrella", "market umbrella"]],
  ["planter-pots", "Planter Pots", "🪴", "set", "3 pc", 29.99, ["planter pots", "flower pots", "plant pots"]],
  ["solar-path-lights", "Solar Path Lights", "💡", "pack", "6 ct", 34.99, ["solar path lights", "solar lights", "solar garden lights"]],
  ["garden-gloves", "Garden Gloves", "🧤", "pair", "M", 9.99, ["garden gloves", "gardening gloves"]],
  ["pruning-shears", "Pruning Shears", "✂️", "each", "1 ct", 19.99, ["pruning shears", "garden shears"]],
  ["pressure-washer", "Electric Pressure Washer", "💦", "each", "1800 PSI", 249, ["pressure washer", "power washer"]],
];

const SPORTS = [
  ["mountain-bike", "Adult Mountain Bike", "🚲", "each", "27.5 in", 349, ["bike", "mountain bike", "adult bicycle"]],
  ["bike-helmet", "Bike Helmet", "🚲", "each", "1 ct", 29.99, ["bike helmet", "bicycle helmet", "cycling helmet"]],
  ["bike-lock", "Bike Lock", "🔒", "each", "1 ct", 24.99, ["bike lock", "bicycle lock", "cable lock"]],
  ["camping-tent", "4-Person Camping Tent", "⛺", "each", "4 person", 149, ["camping tent", "4 person tent", "tent"]],
  ["sleeping-bag", "3-Season Sleeping Bag", "🏕️", "each", "1 ct", 59.99, ["sleeping bag", "camping sleeping bag"]],
  ["camping-chair", "Folding Camping Chair", "🏕️", "each", "1 ct", 29.99, ["camping chair", "folding camp chair"]],
  ["camp-stove", "Propane Camp Stove", "🏕️", "each", "2 burner", 59.99, ["camp stove", "propane camp stove"]],
  ["cooler", "Hard Cooler", "🧊", "each", "48 qt", 49.99, ["cooler", "ice chest", "hard cooler"]],
  ["yoga-mat", "Yoga Mat", "🧘", "each", "6 mm", 24.99, ["yoga mat", "exercise mat"]],
  ["dumbbells", "Dumbbell Pair", "🏋️", "pair", "20 lb", 39.99, ["dumbbells", "hand weights", "dumbbell set"]],
  ["kettlebell", "Cast Iron Kettlebell", "🏋️", "each", "35 lb", 49.99, ["kettlebell", "kettle bell"]],
  ["resistance-bands", "Resistance Bands", "🏋️", "set", "5 pc", 19.99, ["resistance bands", "exercise bands"]],
  ["jump-rope", "Jump Rope", "🏃", "each", "1 ct", 9.99, ["jump rope", "skipping rope"]],
  ["hockey-stick", "Senior Hockey Stick", "🏒", "each", "1 ct", 39.99, ["hockey stick", "senior hockey stick"]],
  ["ice-skates", "Ice Skates", "⛸️", "pair", "1 pair", 79.99, ["ice skates", "hockey skates", "skates"]],
  ["basketball", "Basketball", "🏀", "each", "Size 7", 29.99, ["basketball", "size 7 basketball"]],
  ["soccer-ball", "Soccer Ball", "⚽", "each", "Size 5", 24.99, ["soccer ball", "size 5 soccer ball"]],
  ["fishing-rod-combo", "Fishing Rod and Reel Combo", "🎣", "each", "6.5 ft", 59.99, ["fishing rod", "rod and reel", "fishing combo"]],
  ["life-jacket", "Adult Life Jacket", "🦺", "each", "1 ct", 59.99, ["life jacket", "pfd", "lifejacket"]],
  ["kayak-paddle", "Kayak Paddle", "🛶", "each", "230 cm", 69.99, ["kayak paddle", "paddle"]],
  ["water-bottle", "Insulated Stainless Steel Bottle", "🥤", "each", "32 oz", 29.99, ["reusable water bottle", "insulated water bottle", "stainless steel bottle"]],
];

// Same formula as expand-catalog.mjs, Walmart only (see PRICING above).
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

const GROUPS = [
  ["Appliances", APPLIANCES],
  ["Electronics", ELECTRONICS],
  ["Home", HOME],
  ["Hardware", HARDWARE],
  ["Automotive", AUTOMOTIVE],
  ["Garden", GARDEN],
  ["Sports", SPORTS],
];

/** Every new item as an items.json-shaped record (with `base` last). */
export function buildNewItems() {
  const out = [];
  for (const [category, rows] of GROUPS) {
    for (const [id, name, emoji, unit, size, base, terms] of rows) {
      out.push({
        id, name, brand: "", category, unit, size, base, emoji,
        searchTerms: terms,
        imageMode: "generic",
        offQuery: name.toLowerCase(),
      });
    }
  }
  return out;
}

export const walmartPrice = (id, base) => round2(base * (WALMART_MULT + wobble(`${id}:walmart`)));

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
      prices: { walmart: walmartPrice(it.id, it.base) },
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
