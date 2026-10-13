/*
 * Add electronics and furniture to the catalog.
 * ---------------------------------------------------------------------------
 * The catalog was groceries only, so "a 55 inch TV" or "an office chair" fell
 * through to an AI-generated product with a guessed price and a Pexels stock
 * photo. Giving them catalog ids means the model can pick them by id (see
 * lib/ai/planPrompt.ts), they resolve the same way every time, and the
 * verified-photo harvest can target them.
 *
 * Generic items only - "55-inch 4K TV", not a model number - for the same
 * reason the grocery list says "Butter" rather than a brand: each store puts
 * forward its own version.
 *
 * PRICING
 *
 * products.json holds real-looking prices for the four seeded grocery stores
 * only, and three of those (FreshCo, No Frills, Metro) do not sell TVs or
 * sofas. So each item gets a WALMART price only, using the same multiplier and
 * hash wobble as expand-catalog.mjs. The resolver then anchors every other
 * store that stocks the department (Costco, Canadian Tire, Superstore,
 * Lowe's...) to it through its priceIndex. Base prices are realistic Canadian
 * estimates, not scraped.
 *
 * Idempotent: ids already in the catalog are skipped.
 * Run:  node scripts/add-electronics-furniture.mjs   (add --dry to preview)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ITEMS = `${ROOT}data/items.json`;
const PRODUCTS = `${ROOT}data/products.json`;
const DRY = process.argv.includes("--dry");

// [id, name, emoji, unit, size, base, terms]
const ELECTRONICS = [
  ["tv-55-4k", "55-inch 4K Smart TV", "📺", "each", "55 in", 499, ["55 inch tv", "4k tv", "smart tv", "television", "tv"]],
  ["tv-65-4k", "65-inch 4K Smart TV", "📺", "each", "65 in", 799, ["65 inch tv", "big screen tv", "large tv"]],
  ["tv-43-smart", "43-inch Smart TV", "📺", "each", "43 in", 299, ["43 inch tv", "small tv"]],
  ["tv-32-hd", "32-inch HD TV", "📺", "each", "32 in", 179, ["32 inch tv", "bedroom tv", "kitchen tv"]],
  ["soundbar", "Soundbar", "🔊", "each", "1 ct", 199, ["soundbar", "sound bar", "tv speaker"]],
  ["streaming-stick", "4K Streaming Stick", "📺", "each", "1 ct", 59.99, ["streaming stick", "streaming device", "fire tv stick", "roku", "chromecast"]],
  ["laptop-15", "15.6-inch Laptop", "💻", "each", "15.6 in", 699, ["laptop", "notebook computer", "laptop computer"]],
  ["chromebook", "Chromebook", "💻", "each", "14 in", 299, ["chromebook", "student laptop"]],
  ["gaming-laptop", "Gaming Laptop", "💻", "each", "15.6 in", 1299, ["gaming laptop"]],
  ["desktop-computer", "Desktop Computer", "🖥️", "each", "1 ct", 799, ["desktop computer", "desktop pc", "pc tower"]],
  ["monitor-24", "24-inch Monitor", "🖥️", "each", "24 in", 179, ["monitor", "computer monitor", "24 inch monitor"]],
  ["monitor-27", "27-inch Monitor", "🖥️", "each", "27 in", 279, ["27 inch monitor", "large monitor"]],
  ["tablet-10", "10-inch Tablet", "📱", "each", "10 in", 329, ["tablet", "android tablet"]],
  ["android-smartphone", "Unlocked Android Smartphone", "📱", "each", "128 GB", 399, ["android phone", "smartphone", "cell phone", "unlocked phone"]],
  ["e-reader", "E-Reader", "📖", "each", "6 in", 149.99, ["e-reader", "ereader", "kindle", "kobo"]],
  ["wireless-mouse", "Wireless Mouse", "🖱️", "each", "1 ct", 29.99, ["wireless mouse", "computer mouse", "mouse"]],
  ["wireless-keyboard", "Wireless Keyboard", "⌨️", "each", "1 ct", 49.99, ["wireless keyboard", "keyboard", "computer keyboard"]],
  ["webcam", "HD Webcam", "📷", "each", "1080p", 69.99, ["webcam", "web camera"]],
  ["usb-c-charger", "USB-C Wall Charger", "🔌", "each", "30 W", 29.99, ["usb c charger", "phone charger", "wall charger", "charger"]],
  ["power-bank", "Portable Power Bank", "🔋", "each", "10000 mAh", 39.99, ["power bank", "portable charger", "battery pack"]],
  ["usb-c-cable", "USB-C Charging Cable", "🔌", "each", "1.8 m", 14.99, ["usb c cable", "charging cable", "phone cable"]],
  ["hdmi-cable", "HDMI Cable", "🔌", "each", "2 m", 19.99, ["hdmi cable", "hdmi"]],
  ["bluetooth-speaker", "Bluetooth Speaker", "🔊", "each", "1 ct", 79.99, ["bluetooth speaker", "portable speaker", "wireless speaker"]],
  ["over-ear-headphones", "Noise-Cancelling Headphones", "🎧", "each", "1 ct", 149.99, ["headphones", "noise cancelling headphones", "over ear headphones"]],
  ["wired-earphones", "Wired Earphones", "🎧", "each", "1 ct", 19.99, ["wired earphones", "earphones", "wired earbuds"]],
  ["smart-speaker", "Smart Speaker", "🔊", "each", "1 ct", 69.99, ["smart speaker", "google nest", "alexa", "echo dot"]],
  ["wifi-router", "Wi-Fi Router", "📶", "each", "1 ct", 129.99, ["router", "wifi router", "wireless router"]],
  ["external-hard-drive", "External Hard Drive", "💾", "each", "1 TB", 79.99, ["external hard drive", "hard drive", "backup drive"]],
  ["portable-ssd", "Portable SSD", "💾", "each", "1 TB", 129.99, ["portable ssd", "external ssd", "ssd"]],
  ["usb-flash-drive", "USB Flash Drive", "💾", "each", "64 GB", 14.99, ["usb flash drive", "flash drive", "usb stick", "thumb drive"]],
  ["microsd-card", "microSD Card", "💾", "each", "128 GB", 24.99, ["microsd card", "sd card", "memory card"]],
  ["inkjet-printer", "All-in-One Inkjet Printer", "🖨️", "each", "1 ct", 129.99, ["printer", "inkjet printer", "all in one printer"]],
  ["printer-ink", "Printer Ink Cartridge", "🖨️", "each", "1 ct", 39.99, ["printer ink", "ink cartridge", "printer cartridge"]],
  ["gaming-console", "Gaming Console", "🎮", "each", "1 ct", 649.99, ["gaming console", "video game console", "game console"]],
  ["game-controller", "Wireless Game Controller", "🎮", "each", "1 ct", 79.99, ["game controller", "controller", "gamepad"]],
  ["fitness-tracker", "Fitness Tracker", "⌚", "each", "1 ct", 99.99, ["fitness tracker", "activity tracker", "fitbit"]],
  ["action-camera", "Action Camera", "📷", "each", "4K", 299.99, ["action camera", "gopro"]],
  ["security-camera", "Wi-Fi Security Camera", "📷", "each", "1 ct", 59.99, ["security camera", "wifi camera", "home camera"]],
  ["video-doorbell", "Video Doorbell", "🔔", "each", "1 ct", 129.99, ["video doorbell", "doorbell camera", "smart doorbell"]],
  ["smart-plug", "Smart Plug", "🔌", "pack", "2 ct", 29.99, ["smart plug", "wifi plug"]],
  ["smart-bulb", "Smart Light Bulb", "💡", "each", "1 ct", 19.99, ["smart bulb", "smart light bulb", "wifi bulb"]],
  ["surge-protector", "Surge Protector Power Bar", "🔌", "each", "6 outlet", 29.99, ["surge protector", "power bar", "power strip"]],
  ["phone-case", "Phone Case", "📱", "each", "1 ct", 24.99, ["phone case", "cell phone case"]],
  ["screen-protector", "Tempered Glass Screen Protector", "📱", "pack", "2 ct", 19.99, ["screen protector", "tempered glass"]],
  ["car-phone-mount", "Car Phone Mount", "📱", "each", "1 ct", 24.99, ["car phone mount", "phone holder for car", "phone mount"]],
];

const FURNITURE = [
  ["sofa-3-seat", "3-Seat Sofa", "🛋️", "each", "3 seat", 899, ["sofa", "couch", "3 seater sofa", "three seat sofa"]],
  ["loveseat", "Loveseat", "🛋️", "each", "2 seat", 599, ["loveseat", "love seat", "2 seater sofa"]],
  ["sectional-sofa", "Sectional Sofa", "🛋️", "each", "1 ct", 1499, ["sectional", "sectional sofa", "l shaped couch"]],
  ["sofa-bed", "Sofa Bed", "🛋️", "each", "1 ct", 549, ["sofa bed", "futon", "sleeper sofa"]],
  ["recliner", "Recliner Chair", "🪑", "each", "1 ct", 499, ["recliner", "recliner chair", "reclining chair"]],
  ["accent-chair", "Accent Chair", "🪑", "each", "1 ct", 199, ["accent chair", "armchair", "living room chair"]],
  ["coffee-table", "Coffee Table", "🪵", "each", "1 ct", 149, ["coffee table", "centre table"]],
  ["side-table", "Side Table", "🪵", "each", "1 ct", 59.99, ["side table", "end table"]],
  ["tv-stand", "TV Stand", "🪵", "each", "60 in", 179, ["tv stand", "media console", "tv unit"]],
  ["bookshelf", "5-Shelf Bookcase", "📚", "each", "5 shelf", 99, ["bookshelf", "bookcase", "shelving unit"]],
  ["cube-organizer", "9-Cube Storage Organizer", "🗄️", "each", "9 cube", 89, ["cube organizer", "cube storage", "cube shelf"]],
  ["bed-frame-queen", "Queen Bed Frame", "🛏️", "each", "Queen", 299, ["bed frame", "queen bed frame", "queen bed"]],
  ["bed-frame-king", "King Bed Frame", "🛏️", "each", "King", 399, ["king bed frame", "king bed"]],
  ["bed-frame-twin", "Twin Bed Frame", "🛏️", "each", "Twin", 149, ["twin bed frame", "single bed", "twin bed"]],
  ["bunk-bed", "Bunk Bed", "🛏️", "each", "Twin/Twin", 399, ["bunk bed", "bunk beds"]],
  ["mattress-queen", "Queen Mattress", "🛏️", "each", "Queen", 599, ["mattress", "queen mattress"]],
  ["mattress-king", "King Mattress", "🛏️", "each", "King", 799, ["king mattress"]],
  ["mattress-twin", "Twin Mattress", "🛏️", "each", "Twin", 249, ["twin mattress", "single mattress"]],
  ["mattress-topper", "Memory Foam Mattress Topper", "🛏️", "each", "Queen", 99, ["mattress topper", "memory foam topper"]],
  ["crib", "Baby Crib", "🛏️", "each", "1 ct", 299, ["crib", "baby crib"]],
  ["nightstand", "Nightstand", "🪵", "each", "1 ct", 89, ["nightstand", "bedside table", "night table"]],
  ["dresser", "6-Drawer Dresser", "🗄️", "each", "6 drawer", 299, ["dresser", "chest of drawers", "drawers"]],
  ["wardrobe", "Wardrobe", "🚪", "each", "1 ct", 249, ["wardrobe", "armoire", "clothes closet"]],
  ["dining-table", "4-Seat Dining Table", "🍽️", "each", "4 seat", 349, ["dining table", "kitchen table"]],
  ["dining-chairs", "Dining Chairs", "🪑", "set", "2 ct", 159, ["dining chairs", "kitchen chairs"]],
  ["bar-stools", "Bar Stools", "🪑", "set", "2 ct", 129, ["bar stools", "counter stools", "stools"]],
  ["kitchen-cart", "Kitchen Island Cart", "🪵", "each", "1 ct", 149, ["kitchen island", "kitchen cart"]],
  ["office-desk", "Computer Desk", "🪵", "each", "1 ct", 199, ["desk", "office desk", "computer desk", "writing desk"]],
  ["standing-desk", "Standing Desk", "🪵", "each", "1 ct", 349, ["standing desk", "sit stand desk", "adjustable desk"]],
  ["office-chair", "Office Chair", "🪑", "each", "1 ct", 179, ["office chair", "desk chair", "ergonomic chair"]],
  ["gaming-chair", "Gaming Chair", "🪑", "each", "1 ct", 249, ["gaming chair"]],
  ["folding-table", "Folding Table", "🪵", "each", "6 ft", 69.99, ["folding table", "card table"]],
  ["folding-chair", "Folding Chair", "🪑", "each", "1 ct", 29.99, ["folding chair"]],
  ["storage-ottoman", "Storage Ottoman", "🪑", "each", "1 ct", 79, ["ottoman", "storage ottoman", "footstool"]],
  ["bean-bag", "Bean Bag Chair", "🪑", "each", "1 ct", 89, ["bean bag", "bean bag chair"]],
  ["console-table", "Console Table", "🪵", "each", "1 ct", 129, ["console table", "entryway table", "hallway table"]],
  ["shoe-rack", "Shoe Rack", "👟", "each", "1 ct", 39.99, ["shoe rack", "shoe organizer", "shoe storage"]],
  ["coat-rack", "Coat Rack", "🧥", "each", "1 ct", 49.99, ["coat rack", "coat stand", "hall tree"]],
  ["floor-lamp", "Floor Lamp", "💡", "each", "1 ct", 69.99, ["floor lamp", "standing lamp"]],
  ["table-lamp", "Table Lamp", "💡", "each", "1 ct", 34.99, ["table lamp", "bedside lamp", "desk lamp"]],
  ["area-rug", "Area Rug", "🟫", "each", "5 x 7 ft", 129, ["area rug", "rug", "living room rug"]],
  ["floor-mirror", "Full-Length Mirror", "🪞", "each", "1 ct", 79.99, ["full length mirror", "floor mirror", "standing mirror"]],
  ["patio-dining-set", "Patio Dining Set", "🪑", "set", "5 pc", 699, ["patio set", "patio dining set", "outdoor dining set"]],
  ["patio-chair", "Patio Chair", "🪑", "each", "1 ct", 79, ["patio chair", "outdoor chair", "lawn chair"]],
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

const rows = [
  ...ELECTRONICS.map((r) => ["Electronics", ...r]),
  ...FURNITURE.map((r) => ["Furniture", ...r]),
];

const items = JSON.parse(readFileSync(ITEMS, "utf8"));
const products = JSON.parse(readFileSync(PRODUCTS, "utf8"));
const have = new Set(products.map((p) => p.id));

let added = 0;
for (const [category, id, name, emoji, unit, size, base, terms] of rows) {
  if (have.has(id)) continue;
  items.push({
    id, name, brand: "", category, unit, size, base, emoji,
    searchTerms: terms,
    imageMode: "generic",
    offQuery: name.toLowerCase(),
  });
  products.push({
    id, name, brand: "", category, unit, size, emoji,
    searchTerms: terms,
    prices: { walmart: round2(base * (WALMART_MULT + wobble(`${id}:walmart`))) },
  });
  added++;
}

console.log(`${added} added (${rows.length - added} already present). Catalog: ${products.length}.`);
if (!DRY && added > 0) {
  writeFileSync(ITEMS, JSON.stringify(items, null, 2) + "\n");
  writeFileSync(PRODUCTS, JSON.stringify(products, null, 2) + "\n");
}
