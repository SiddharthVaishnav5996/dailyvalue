/**
 * Page 4 — Checkout / Order page data.
 *
 * The basket is carried over from the AI Search Result page (Page 3): the cart
 * lines are derived straight from that page's product list so the two stay in
 * sync. The order-summary charges, saved customer / shipping / payment details
 * and the "People also bought" suggestions are static demo content — the real
 * values will come from a checkout API later.
 */

import { ALL_SEARCH_PRODUCTS } from "@/data/searchResults";

const IMG = "/stores/Product card Images/AI searched";
const LOGO = "/stores/Store Logos";

/* ---- My Cart ---------------------------------------------------------- */

export interface CartLine {
  id: string;
  /** Product name shown in bold. */
  name: string;
  /** Partner store the item is bought from (the dropdown label). */
  storeName: string;
  /** Unit price at that store — summed into the order subtotal. */
  price: number;
  imageSrc: string;
  imageAlt: string;
  /** Quantity the line opens at; defaults to 1. */
  initialQuantity?: number;
}

/**
 * Every item carried over from Page 3 — all 14 products (10 ingredients + 4 wine
 * pairings), derived from that page's data (the design's screenshot only sampled
 * eight of them). Each keeps its store, unit price and photo.
 */
export const CART_ITEMS: CartLine[] = ALL_SEARCH_PRODUCTS.flatMap((p) =>
  p.imageSrc
    ? [
        {
          id: p.id,
          name: p.description,
          storeName: p.storeName,
          price: p.price,
          imageSrc: p.imageSrc,
          imageAlt: p.imageAlt ?? p.description,
          initialQuantity: p.initialQuantity ?? 1,
        },
      ]
    : [],
);

/* ---- Order summary ---------------------------------------------------- */

/**
 * Fixed charges shown in the order summary. The subtotal and total are computed
 * live on the page from the cart quantities, so they aren't stored here.
 */
export interface OrderSummary {
  delivery: number;
  tax: number;
  /** Amount knocked off by the applied promo code (shown negative). */
  promoDiscount: number;
}

export const ORDER_SUMMARY: OrderSummary = {
  delivery: 0,
  tax: 15,
  promoDiscount: 15,
};

/* ---- Saved customer details ------------------------------------------- */

export const CUSTOMER = {
  name: "Siddharth Vaishnav",
  phone: "+1 825-967-1512",
  email: "siddharthvaishnav96@gmail.com",
};

export const SHIPPING = {
  addressLines: ["320 - 6307 Elston Gate NW", "Edmonton, Alberta", "T6M 1L8"],
};

export const PAYMENT = {
  brandImageSrc: "/stores/Product card Images/Visa Image.png",
  brandAlt: "Visa",
  type: "Credit Card",
  last4: "2323",
};

/* ---- Delivery tip ------------------------------------------------------- */

export interface TipPreset {
  id: string;
  amount: number;
  emoji: string;
}

/** Preset tip amounts for the delivery-partner tip card. */
export const TIP_PRESETS: TipPreset[] = [
  { id: "t-2", amount: 2, emoji: "✌️" },
  { id: "t-3", amount: 3, emoji: "💌" },
  { id: "t-5", amount: 5, emoji: "❤️" },
];

/* ---- People also bought ----------------------------------------------- */

export interface Suggestion {
  id: string;
  storeName: string;
  storeDistanceKm: number;
  storeLogoSrc?: string;
  showDiscount?: boolean;
  discountLabel?: string;
  description: string;
  rating: number;
  reviewCount: number;
  price: number;
  imageSrc?: string;
  imageAlt?: string;
  imageFit?: "cover" | "contain";
}

/** Four cross-sell cards under the cart. */
export const PEOPLE_ALSO_BOUGHT: Suggestion[] = [
  {
    id: "s-baker",
    storeName: "Costco Wholesale Canada",
    storeDistanceKm: 1.5,
    storeLogoSrc: `${LOGO}/Costco.png`,
    showDiscount: true,
    discountLabel: "Online Only",
    description: "Peugeot Appolia Ceramic Square Baker, 36 cm (14 in.)",
    rating: 5,
    reviewCount: 345,
    price: 58.99,
    imageSrc: `${IMG}/Screenshot 2026-03-12 181345.png`,
    imageAlt: "Peugeot Appolia ceramic square baker",
    imageFit: "contain",
  },
  {
    id: "s-oil-paper",
    storeName: "Real Canadian Superstore",
    storeDistanceKm: 1.5,
    storeLogoSrc: `${LOGO}/Real Canadian Superstore.png`,
    showDiscount: true,
    discountLabel: "300 Pc Points",
    description:
      "Gspmoly Baking Oil Paper Thickened Oil Proof Natural Wood Pizza Pad Paper Bbq Chicken Snack Tray Oil Absorption Pad Paper",
    rating: 5,
    reviewCount: 345,
    price: 10.76,
    imageSrc: `${IMG}/Pad paper.png`,
    imageAlt: "Gspmoly baking oil pad paper",
    imageFit: "contain",
  },
  {
    id: "s-baking-soda",
    storeName: "Metro",
    storeDistanceKm: 5.5,
    storeLogoSrc: `${LOGO}/Metro.png`,
    description: "Selection : Pure Baking Soda",
    rating: 5,
    reviewCount: 345,
    price: 1.69,
    imageSrc: `${IMG}/Bakig Soda.png`,
    imageAlt: "Selection pure baking soda",
    imageFit: "contain",
  },
  {
    id: "s-chipits",
    storeName: "FreshCo",
    storeDistanceKm: 3.5,
    storeLogoSrc: `${LOGO}/Freshco.png`,
    showDiscount: true,
    discountLabel: "Limited Edition",
    description: "HERSHEY'S Butterscotch Baking Chips, Chipits",
    rating: 5,
    reviewCount: 345,
    price: 5.49,
    imageSrc: `${IMG}/chocolate chips.png`,
    imageAlt: "Hershey's butterscotch baking chips, Chipits",
    imageFit: "contain",
  },
];
