import type { Store } from "@/lib/types";

/**
 * The store directory DailyValue shops across.
 *
 * Two fields do the heavy lifting for AI search:
 *
 *  - `departments` says WHAT a store sells. This is how "give me a bed
 *    mattress and an air conditioner" reaches Canadian Tire and Walmart but
 *    never FreshCo, and how a wine query reaches the LCBO. Without it the AI
 *    would have to guess, and it would guess wrong.
 *
 *  - `priceIndex` says HOW EXPENSIVE a store is relative to the others
 *    (1.00 = baseline). Every generated price is the product's base price
 *    times this number, so Walmart is believably cheaper than Metro on every
 *    item without us hand-writing a price per store per product.
 *
 * Delivery details are illustrative. Catalog prices for the four original
 * grocery stores still come from data/products.json (see scripts/seed.mjs);
 * priceIndex only drives prices for products the AI generates on the fly.
 */

/** Every department a store can stock. An item is placed by matching these. */
export const DEPARTMENTS = [
  "grocery",
  "produce",
  "dairy",
  "bakery",
  "meat",
  "pantry",
  "beverages",
  "frozen",
  "snacks",
  "alcohol",
  "household",
  "home",
  "furniture",
  "appliances",
  "electronics",
  "hardware",
  "garden",
  "baby",
  "pet",
  "pharmacy",
  "sports",
  "automotive",
  "office",
  "toys",
  "babygear",
  "clothing",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

const LOGO = "/stores/Store Logos";

/** Departments shared by every full-line supermarket, to keep the list readable. */
const SUPERMARKET: Department[] = [
  "grocery",
  "produce",
  "dairy",
  "bakery",
  "meat",
  "pantry",
  "beverages",
  "frozen",
  "snacks",
  "household",
];

export const STORES: Store[] = [
  // --- Full-line supermarkets -------------------------------------------
  {
    id: "freshco",
    name: "FreshCo",
    color: "#e11d48",
    logoText: "FC",
    logoSrc: `${LOGO}/Freshco.png`,
    deliveryFee: 4.99,
    deliveryEta: "Today, 2–4 PM",
    distanceKm: 3.5,
    priceIndex: 1.0,
    departments: SUPERMARKET,
  },
  {
    id: "nofrills",
    name: "No Frills",
    color: "#fbbf24",
    logoText: "NF",
    // Lower-case filename with a space, exactly as it sits on disk.
    logoSrc: `${LOGO}/no frills.png`,
    deliveryFee: 3.99,
    deliveryEta: "Tomorrow, 9–11 AM",
    distanceKm: 2.2,
    priceIndex: 0.96,
    departments: SUPERMARKET,
  },
  {
    id: "metro",
    name: "Metro",
    color: "#059669",
    logoText: "M",
    logoSrc: `${LOGO}/Metro.png`,
    deliveryFee: 6.49,
    deliveryEta: "Today, 5–7 PM",
    distanceKm: 5.5,
    priceIndex: 1.07,
    departments: [...SUPERMARKET, "pharmacy", "baby"],
  },
  {
    id: "sobeys",
    name: "Sobeys",
    color: "#0f766e",
    logoText: "SB",
    logoSrc: `${LOGO}/Sobeys.png`,
    deliveryFee: 5.99,
    deliveryEta: "Today, 3–5 PM",
    distanceKm: 4.1,
    priceIndex: 1.05,
    departments: [...SUPERMARKET, "pharmacy"],
  },
  {
    id: "saveonfoods",
    name: "Save On Foods",
    color: "#166534",
    logoText: "SO",
    logoSrc: `${LOGO}/Save On Foods.png`,
    deliveryFee: 5.49,
    deliveryEta: "Today, 4–6 PM",
    distanceKm: 6.8,
    priceIndex: 1.03,
    departments: [...SUPERMARKET, "pharmacy"],
  },
  {
    id: "superstore",
    name: "Real Canadian Superstore",
    color: "#c2410c",
    logoText: "RCS",
    logoSrc: `${LOGO}/Real Canadian Superstore.png`,
    deliveryFee: 4.49,
    deliveryEta: "Today, 1–3 PM",
    distanceKm: 1.5,
    priceIndex: 0.98,
    departments: [...SUPERMARKET, "pharmacy", "baby", "home", "electronics", "office", "toys", "babygear", "clothing"],
  },

  // --- Big box: groceries AND everything else ---------------------------
  {
    id: "walmart",
    name: "Walmart",
    color: "#0071dc",
    logoText: "W",
    logoSrc: `${LOGO}/Walmart.png`,
    deliveryFee: 5.99,
    deliveryEta: "Today, 4–6 PM",
    distanceKm: 0.5,
    priceIndex: 0.93,
    departments: [
      ...SUPERMARKET,
      "home",
      "furniture",
      "appliances",
      "electronics",
      "baby",
      "pet",
      "pharmacy",
      "sports",
      "automotive",
      "garden",
    "office", "toys", "babygear", "clothing",
    ],
  },
  {
    id: "costco",
    name: "Costco Wholesale Canada",
    color: "#005dab",
    logoText: "CO",
    logoSrc: `${LOGO}/Costco.png`,
    deliveryFee: 0,
    deliveryEta: "Tomorrow, 10 AM–12 PM",
    distanceKm: 1.5,
    priceIndex: 0.89,
    departments: [
      ...SUPERMARKET,
      "alcohol",
      "home",
      "furniture",
      "appliances",
      "electronics",
      "pharmacy",
      "baby",
      "pet",
    "office", "toys", "babygear", "clothing",
    ],
  },

  // --- Specialists -------------------------------------------------------
  {
    id: "lcbo",
    name: "LCBO",
    color: "#7c2d12",
    logoText: "LC",
    logoSrc: `${LOGO}/LCBO.png`,
    deliveryFee: 9.95,
    deliveryEta: "Tomorrow, 12–4 PM",
    distanceKm: 2.8,
    priceIndex: 1.0,
    // Ontario retails spirits and most wine through the LCBO only, so this is
    // the one store that carries `alcohol` on its own.
    //
    // ALCOHOL AND NOTHING ELSE. It used to carry `beverages` too, which reads
    // reasonable - an LCBO does sell mixers and soda - and was quietly wrong:
    // the catalog files coffee, juice and tea under `beverages`, so the
    // department gate had the LCBO offering ground coffee, and at $12.49 it
    // was the first shop on the card. A liquor store appearing at the top of
    // a grocery list is the sort of thing that makes the whole comparison
    // look made up.
    //
    // Nothing is stranded by this: every supermarket already carries
    // `beverages` (see SUPERMARKET above), so the mixers keep their shops.
    departments: ["alcohol"],
  },
  {
    id: "canadiantire",
    name: "Canadian Tire",
    color: "#d40029",
    logoText: "CT",
    logoSrc: `${LOGO}/Canadian Tire.png`,
    deliveryFee: 7.99,
    deliveryEta: "Tomorrow, 11 AM–3 PM",
    distanceKm: 2.0,
    priceIndex: 1.04,
    departments: [
      "home",
      "furniture",
      "appliances",
      "hardware",
      "garden",
      "sports",
      "automotive",
      "household",
      "pet",
    "toys", "clothing",
    ],
  },
  {
    id: "lowes",
    name: "Lowe's",
    color: "#004990",
    logoText: "LW",
    logoSrc: `${LOGO}/Lowe's.png`,
    deliveryFee: 8.99,
    deliveryEta: "Tomorrow, 9 AM–1 PM",
    distanceKm: 7.4,
    priceIndex: 1.01,
    departments: ["home", "furniture", "appliances", "hardware", "garden", "household"],
  },
  {
    id: "rona",
    name: "Rona",
    color: "#0a58a6",
    logoText: "RO",
    logoSrc: `${LOGO}/Rona.png`,
    deliveryFee: 8.49,
    deliveryEta: "Tomorrow, 10 AM–2 PM",
    distanceKm: 5.9,
    priceIndex: 1.02,
    departments: ["home", "hardware", "garden", "appliances", "household"],
  },
  {
    id: "homehardware",
    name: "Home Hardware",
    color: "#b91c1c",
    logoText: "HH",
    logoSrc: `${LOGO}/Home Hardware.png`,
    deliveryFee: 7.49,
    deliveryEta: "Tomorrow, 1–5 PM",
    distanceKm: 4.6,
    priceIndex: 1.06,
    departments: ["hardware", "home", "garden", "household"],
  },
];

export const STORE_IDS = STORES.map((s) => s.id);

export const STORE_BY_ID: Record<string, Store> = Object.fromEntries(
  STORES.map((s) => [s.id, s]),
);

/**
 * The four stores data/products.json actually carries prices for. The catalog
 * was seeded before the directory grew, so cross-store comparison of CATALOG
 * products is still limited to these. Generated products price across the full
 * directory instead.
 */
export const CATALOG_STORE_IDS = ["freshco", "walmart", "nofrills", "metro"];

/** Every store that stocks the given department, nearest first. */
export function storesForDepartment(department: string): Store[] {
  const dept = department.trim().toLowerCase();
  return STORES.filter((s) => s.departments.includes(dept as Department)).sort(
    (a, b) => a.distanceKm - b.distanceKm,
  );
}
