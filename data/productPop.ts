/**
 * Product-pop content — the modal that opens from a product card's chevron on
 * the AI Search Result page (Page 3).
 *
 * Keyed by the search-result product id, so a card knows which pop to show.
 * Only the cream-cheese card is defined for now; the rest follow later. The
 * `related` products are alternatives/add-ons: adding one drops it straight into
 * the cart even though it isn't a recipe-table item. Their images arrive later,
 * so `imageSrc` is left off (the card shows its placeholder until then).
 */

const IMG = "/stores/Product card Images/AI searched";
const LOGO = "/stores/Store Logos";

export interface RelatedProduct {
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
  originalPrice?: number;
  deliveryText?: string;
  imageSrc?: string;
  imageAlt?: string;
  imageFit?: "cover" | "contain";
}

export interface StoreOffer {
  /** Stable id used for selection (e.g. "rcs", "metro"). */
  id: string;
  storeName: string;
  storeDistanceKm: number;
  storeLogoSrc?: string;
  price: number;
  originalPrice?: number;
  /**
   * The brand a shopper would actually be handed at this shop.
   *
   * Optional here because these offers are hand-written and predate the idea.
   * The resolver fills it in for everything else - see data/brands.ts for who
   * owns which brand.
   */
  brand?: string;
  /** True when that brand belongs to this shop, e.g. Kirkland at Costco. */
  isOwnBrand?: boolean;
  /**
   * A photograph of THIS shop's package, when one exists.
   *
   * Optional, and unused by the hand-written pops - they have one photograph
   * for the whole product. The resolver fills it in for seeded catalog
   * products so switching shop switches the packshot.
   */
  imageSrc?: string;
  /** Green loyalty/offer line in the comparison dropdown (e.g. "200 Scene+ Points"). */
  promo?: string;
  /** Red badge on the Page-3 card when this store is the selected one. */
  cardBadge?: string;
}

export interface ProductPopData {
  /** The Page-3 product this pop belongs to. */
  productId: string;
  /** Brand line, shown above the name (e.g. "Philadelphia"). */
  brand: string;
  /** Product name (e.g. "Whipped Original Cream Cheese Product"). */
  name: string;
  /** Loyalty line under the name (e.g. "200 Pc Optimum Points"). */
  points?: string;
  imageSrc?: string;
  imageAlt?: string;
  /**
   * The same product across nearby stores. The first is the default shown on
   * the card + header; the price-comparison dropdown lists the rest, and picking
   * one swaps it in (the previously-selected store rejoins the list).
   */
  storeOffers: StoreOffer[];
  /** Alternatives / add-ons — 3 per row, up to 8. */
  related: RelatedProduct[];
}

const CREAM_CHEESE_POP: ProductPopData = {
  productId: "p-cream-cheese",
  brand: "Philadelphia",
  name: "Whipped Original Cream Cheese Product",
  points: "200 Pc Optimum Points",
  imageSrc: `${IMG}/Philadelphia-Original-Cream-Cheese-Spread-8-oz-Tub_8a227717-d8bc-412b-9987-0362452d753c.028dbe6ea1554cf357bbe29c254e4299.avif`,
  imageAlt: "Philadelphia Whipped Original cream cheese",
  storeOffers: [
    {
      id: "rcs",
      storeName: "Real Canadian Superstore",
      storeDistanceKm: 1.5,
      storeLogoSrc: `${LOGO}/Real Canadian Superstore.png`,
      price: 5.29,
      promo: "200 Optimum Points",
      cardBadge: "Prepared in Canada",
    },
    {
      id: "metro",
      storeName: "Metro",
      storeDistanceKm: 5.5,
      storeLogoSrc: `${LOGO}/Metro.png`,
      price: 3.99,
    },
    {
      id: "walmart",
      storeName: "Walmart",
      storeDistanceKm: 0.5,
      storeLogoSrc: `${LOGO}/Walmart.png`,
      price: 4.48,
    },
    {
      id: "freshco",
      storeName: "FreshCo",
      storeDistanceKm: 3.5,
      storeLogoSrc: `${LOGO}/Freshco.png`,
      price: 5.66,
      promo: "200 Scene+ Points",
    },
    {
      id: "costco",
      storeName: "Costco Wholesale Canada",
      storeDistanceKm: 1.5,
      storeLogoSrc: `${LOGO}/Costco.png`,
      price: 7.99,
      promo: "Buy one, Get one",
    },
  ],
  related: [
    {
      id: "cc-rel-noname",
      storeName: "Real Canadian Superstore",
      storeDistanceKm: 1.5,
      storeLogoSrc: `${LOGO}/Real Canadian Superstore.png`,
      showDiscount: true,
      discountLabel: "Prepared in Canada",
      description: "No Name : Pasteurized Cream Cheese",
      rating: 5,
      reviewCount: 345,
      price: 3.0,
      imageSrc: `${IMG}/Creame Cheese 1.png`,
      imageAlt: "No Name pasteurized cream cheese",
      imageFit: "contain",
    },
    {
      id: "cc-rel-chocolate",
      storeName: "Real Canadian Superstore",
      storeDistanceKm: 1.5,
      storeLogoSrc: `${LOGO}/Real Canadian Superstore.png`,
      showDiscount: true,
      discountLabel: "Limited Edition",
      description: "Philadelphia : Chocolate Cream Cheese Product",
      rating: 5,
      reviewCount: 345,
      price: 4.49,
      imageSrc: `${IMG}/Creame cheese 2.png`,
      imageAlt: "Philadelphia chocolate cream cheese product",
      imageFit: "contain",
    },
    {
      id: "cc-rel-strawberry",
      // Was Home Depot, which does not sell cream cheese and is not even a
      // partner store - harmless while this was one tile in a row of
      // "alternatives", and no longer harmless now the flavour chooser makes
      // it a thing you can actually buy. Sobeys instead: a real partner, a
      // full-line grocer that plausibly stocks a limited edition, and the one
      // in this pop-up that had nothing to its name yet.
      storeName: "Sobeys",
      storeDistanceKm: 4.1,
      storeLogoSrc: `${LOGO}/Sobeys.png`,
      showDiscount: true,
      discountLabel: "Limited Edition",
      description: "Philadelphia : Strawberry Cream Cheese Product",
      rating: 5,
      reviewCount: 345,
      price: 4.49,
      imageSrc: `${IMG}/Creame cheese 3.png`,
      imageAlt: "Philadelphia strawberry cream cheese product",
      imageFit: "contain",
    },
    {
      id: "cc-rel-gv-original",
      storeName: "Walmart",
      storeDistanceKm: 0.5,
      storeLogoSrc: `${LOGO}/Walmart.png`,
      showDiscount: true,
      discountLabel: "Only at Walmart",
      description: "Great Value Cream Cheese Spread Original",
      rating: 5,
      reviewCount: 345,
      price: 3.98,
      imageSrc: `${IMG}/Creame cheese 4.png`,
      imageAlt: "Great Value cream cheese spread original",
      imageFit: "contain",
    },
    {
      id: "cc-rel-gv-herb",
      storeName: "Walmart",
      storeDistanceKm: 0.5,
      storeLogoSrc: `${LOGO}/Walmart.png`,
      showDiscount: true,
      discountLabel: "Only at Walmart",
      description: "Great Value Cream Cheese Spread Herb & Garlic",
      rating: 5,
      reviewCount: 345,
      price: 2.98,
      imageSrc: `${IMG}/Creame cheese 5.png`,
      imageAlt: "Great Value cream cheese spread herb and garlic",
      imageFit: "contain",
    },
    {
      id: "cc-rel-bagels",
      storeName: "Walmart",
      storeDistanceKm: 0.5,
      storeLogoSrc: `${LOGO}/Walmart.png`,
      description: "Dempster's® Original Bagels",
      rating: 5,
      reviewCount: 345,
      price: 3.37,
      imageSrc: `${IMG}/bagels.png`,
      imageAlt: "Dempster's Original bagels",
      imageFit: "contain",
    },
    {
      id: "cc-rel-selection",
      storeName: "Metro",
      storeDistanceKm: 5.5,
      storeLogoSrc: `${LOGO}/Metro.png`,
      showDiscount: true,
      discountLabel: "Last Chance Saving",
      description: "Selection : Cream Cheese",
      rating: 5,
      reviewCount: 345,
      price: 3.49,
      imageSrc: `${IMG}/Creame cheese 7.png`,
      imageAlt: "Selection cream cheese",
      imageFit: "contain",
    },
    {
      id: "cc-rel-selection-brick",
      storeName: "Metro",
      storeDistanceKm: 5.5,
      storeLogoSrc: `${LOGO}/Metro.png`,
      showDiscount: true,
      discountLabel: "200 metro points",
      description: "Selection : Cream Cheese Brick",
      rating: 5,
      reviewCount: 345,
      price: 3.49,
      originalPrice: 5.69,
      imageSrc: `${IMG}/Creame cheese 8.png`,
      imageAlt: "Selection cream cheese brick",
      imageFit: "contain",
    },
  ],
};

export const PRODUCT_POP_BY_ID: Record<string, ProductPopData> = {
  [CREAM_CHEESE_POP.productId]: CREAM_CHEESE_POP,
};
