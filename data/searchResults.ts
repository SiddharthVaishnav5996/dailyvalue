/**
 * Page 3 — AI Search Result page: placeholder products.
 *
 * One card per *unique* item in the chat-result tables (repeated ingredients
 * collapse to a single card). The ingredient table's 13 rows dedupe to the 10
 * grocery products below; the wine table's 4 rows map to the 4 wines. The store
 * name and product copy are stand-ins pending the real catalog match (POST
 * /api/recipe → lib/catalog/match.ts); the images are the AI-searched product
 * shots under /public/stores. Store logos reuse the existing store assets.
 *
 * `rowIds` links each product back to the table row(s) it satisfies. When a
 * product's card is removed (quantity taken to 0), the page reddens those rows
 * to show the item is no longer in the basket — a product can cover several
 * rows (e.g. the one sugar product covers all three sugar rows).
 *
 * `initialQuantity` is the count the card opens at. It will eventually be
 * derived from the table quantity ÷ pack size (e.g. 15 eggs ÷ 12 per tray → 2),
 * but the current quantities are all small, so every card opens at 1 for now.
 */

const IMG = "/stores/Product card Images/AI searched";
const LOGO = "/stores/Store Logos";

export interface SearchProduct {
  id: string;
  /** Ids of the result-table rows this product fulfils (for the removed-row cue). */
  rowIds: string[];
  storeName: string;
  storeDistanceKm: number;
  storeLogoSrc?: string;
  showDiscount?: boolean;
  discountLabel?: string;
  description: string;
  rating: number;
  reviewCount: number;
  price: number;
  originalPrice?: number;
  deliveryText?: string;
  imageSrc?: string;
  imageAlt?: string;
  imageFit?: "cover" | "contain";
  /** Count the card opens at; defaults to 1. */
  initialQuantity?: number;
}

/** Grocery products matched to the cheesecake ingredients (13 rows → 10 unique). */
export const INGREDIENT_PRODUCTS: SearchProduct[] = [
  {
    id: "p-cream-cheese",
    rowIds: ["i4"],
    storeName: "Real Canadian Superstore",
    storeDistanceKm: 13.9,
    storeLogoSrc: `${LOGO}/Real Canadian Superstore.png`,
    showDiscount: true,
    discountLabel: "Prepared in Canada",
    description: "Philadelphia Whipped Original Cream Cheese Product",
    rating: 5,
    reviewCount: 345,
    price: 5.29,
    imageSrc: `${IMG}/Philadelphia-Original-Cream-Cheese-Spread-8-oz-Tub_8a227717-d8bc-412b-9987-0362452d753c.028dbe6ea1554cf357bbe29c254e4299.avif`,
    imageAlt: "Philadelphia original cream cheese tub",
    imageFit: "contain",
  },
  {
    id: "p-oreo",
    rowIds: ["i1"],
    storeName: "Walmart",
    storeDistanceKm: 5.3,
    storeLogoSrc: `${LOGO}/Walmart.png`,
    showDiscount: true,
    discountLabel: "Roll Back",
    description: "OREO Chocolate Sandwich Cookies, Party Size, 24.16 oz",
    rating: 5,
    reviewCount: 345,
    price: 4.28,
    imageSrc: `${IMG}/OREO-Chocolate-Sandwich-Cookies-Party-Size-24-16-oz_f648bb87-c6ae-4ace-bdef-f15fe4f1c032.441c49996497543809dd867f2d647827.avif`,
    imageAlt: "Oreo chocolate sandwich cookies, party size",
    imageFit: "contain",
  },
  {
    id: "p-margarine",
    rowIds: ["i2"],
    storeName: "Walmart",
    storeDistanceKm: 2.5,
    storeLogoSrc: `${LOGO}/Walmart.png`,
    showDiscount: true,
    discountLabel: "Roll Back",
    description: "Becel Buttery Margarine 637g",
    rating: 5,
    reviewCount: 345,
    price: 6.98,
    originalPrice: 8.46,
    imageSrc: `${IMG}/Screenshot 2026-03-04 181514.png`,
    imageAlt: "Becel Buttery Taste margarine tub",
    imageFit: "contain",
  },
  {
    id: "p-sugar",
    rowIds: ["i3", "i5", "i12"],
    storeName: "Costco Wholesale Canada",
    storeDistanceKm: 1.9,
    storeLogoSrc: `${LOGO}/Costco.png`,
    showDiscount: true,
    discountLabel: "300 Points",
    description: "Redpath Special Fine Granulated Sugar, 4 kg",
    rating: 5,
    reviewCount: 345,
    price: 8.99,
    imageSrc: `${IMG}/Screenshot 2026-03-04 182143.png`,
    imageAlt: "Redpath special fine granulated sugar bag",
    imageFit: "contain",
  },
  {
    id: "p-whipping-cream",
    rowIds: ["i6"],
    storeName: "Metro",
    storeDistanceKm: 1.9,
    storeLogoSrc: `${LOGO}/Metro.png`,
    showDiscount: true,
    discountLabel: "Save",
    description: "Lactantia 35% Whipping Cream",
    rating: 5,
    reviewCount: 345,
    price: 4.49,
    originalPrice: 5.29,
    imageSrc: `${IMG}/Screenshot 2026-03-04 182732.png`,
    imageAlt: "Lactantia 35% whipping cream carton",
    imageFit: "contain",
  },
  {
    id: "p-eggs",
    rowIds: ["i7"],
    storeName: "Walmart",
    storeDistanceKm: 3.5,
    storeLogoSrc: `${LOGO}/Walmart.png`,
    showDiscount: true,
    discountLabel: "Made in Canada",
    description: "Great Value Large Eggs",
    rating: 5,
    reviewCount: 345,
    price: 3.93,
    deliveryText: "Delivery in two hours",
    imageSrc: `${IMG}/Screenshot 2026-03-04 183004.png`,
    imageAlt: "Great Value large eggs, dozen",
    imageFit: "contain",
  },
  {
    id: "p-vanilla",
    rowIds: ["i8"],
    storeName: "Sobeys",
    storeDistanceKm: 2.2,
    storeLogoSrc: `${LOGO}/Sobeys.png`,
    showDiscount: true,
    discountLabel: "Best Seller",
    description: "WATKINS PURE VANILLA EXT, 2 FL OZ",
    rating: 5,
    reviewCount: 345,
    price: 5.47,
    imageSrc: `${IMG}/Screenshot 2026-03-04 183338.png`,
    imageAlt: "Watkins pure vanilla extract box",
    imageFit: "contain",
  },
  {
    id: "p-lemon-juice",
    rowIds: ["i9", "i13"],
    storeName: "Save-On-Foods",
    storeDistanceKm: 3.9,
    storeLogoSrc: `${LOGO}/Save On Foods.png`,
    description: "ReaLemon Lemon Juice",
    rating: 5,
    reviewCount: 345,
    price: 3.48,
    imageSrc: `${IMG}/Screenshot 2026-03-04 183507.png`,
    imageAlt: "ReaLemon lemon juice bottle",
    imageFit: "contain",
  },
  {
    id: "p-cornflour",
    rowIds: ["i10"],
    storeName: "Real Canadian Superstore",
    storeDistanceKm: 13.9,
    storeLogoSrc: `${LOGO}/Real Canadian Superstore.png`,
    showDiscount: true,
    discountLabel: "Reduce Price upto limit 4",
    description: "Maseca Instant Corn Masa Flour Gluten Free",
    rating: 5,
    reviewCount: 345,
    price: 8.5,
    originalPrice: 9.99,
    imageSrc: `${IMG}/Screenshot 2026-03-04 183704.png`,
    imageAlt: "Maseca instant corn masa flour bag",
    imageFit: "contain",
  },
  {
    id: "p-blueberries",
    rowIds: ["i11"],
    storeName: "Walmart",
    storeDistanceKm: 5.3,
    storeLogoSrc: `${LOGO}/Walmart.png`,
    showDiscount: true,
    discountLabel: "Last Chance Saving",
    description: "Blueberries, 312 g",
    rating: 5,
    reviewCount: 345,
    price: 4.84,
    imageSrc: `${IMG}/Screenshot 2026-03-04 183919.png`,
    imageAlt: "Fresh blueberries pack",
    imageFit: "contain",
  },
];

/** Canadian wine pairings — the 4 rows of the wine table. Starts a new row of cards. */
export const WINE_PRODUCTS: SearchProduct[] = [
  {
    id: "w-inniskillin",
    rowIds: ["w1"],
    storeName: "Real Canadian Superstore",
    storeDistanceKm: 13.9,
    storeLogoSrc: `${LOGO}/Real Canadian Superstore.png`,
    description: "Inniskillin Vidal Icewine",
    rating: 5,
    reviewCount: 345,
    price: 9.95,
    imageSrc: `${IMG}/Screenshot 2026-03-04 184356.png`,
    imageAlt: "Inniskillin Vidal Icewine bottle",
    imageFit: "contain",
  },
  {
    id: "w-jackson-triggs",
    rowIds: ["w2"],
    storeName: "Metro",
    storeDistanceKm: 1.9,
    storeLogoSrc: `${LOGO}/Metro.png`,
    showDiscount: true,
    discountLabel: "Free Recipe Book",
    description: "Jackson-Triggs Reserve Vidal Icewine",
    rating: 5,
    reviewCount: 345,
    price: 49.99,
    originalPrice: 234.45,
    imageSrc: `${IMG}/Screenshot 2026-03-04 184534.png`,
    imageAlt: "Jackson-Triggs Reserve Vidal Icewine bottle",
    imageFit: "contain",
  },
  {
    id: "w-mission-hill",
    rowIds: ["w3"],
    storeName: "LCBO",
    storeDistanceKm: 4.0,
    storeLogoSrc: `${LOGO}/LCBO.png`,
    showDiscount: true,
    discountLabel: "Vintage Collection",
    description: "Mission Hill Reserve Chardonnay 2022",
    rating: 5,
    reviewCount: 345,
    price: 27.95,
    imageSrc: `${IMG}/Screenshot 2026-03-04 184728.png`,
    imageAlt: "Mission Hill Reserve Chardonnay 2022 bottle",
    imageFit: "contain",
  },
  {
    id: "w-peller-estates",
    rowIds: ["w4"],
    storeName: "LCBO",
    storeDistanceKm: 4.0,
    storeLogoSrc: `${LOGO}/LCBO.png`,
    showDiscount: true,
    discountLabel: "Last Chance Saving",
    description: "Peller Estates Icewine",
    rating: 5,
    reviewCount: 345,
    price: 99.99,
    originalPrice: 149.99,
    imageSrc: `${IMG}/Screenshot 2026-03-04 185010.png`,
    imageAlt: "Icewine bottle",
    imageFit: "contain",
  },
];

/** Every card on the page, ingredients first then wines. */
export const ALL_SEARCH_PRODUCTS: SearchProduct[] = [
  ...INGREDIENT_PRODUCTS,
  ...WINE_PRODUCTS,
];
