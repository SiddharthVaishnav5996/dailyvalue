/**
 * Landing page — placeholder content.
 *
 * Store names, copy, prices and images here are stand-ins so the page can be
 * laid out and reviewed; swap them for real catalog data later. Products that
 * omit `imageSrc` fall back to the ProductCard image placeholder; stores
 * without a `storeLogoSrc` fall back to an initials avatar.
 */

export interface LandingProduct {
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

/** Hero split — the 3 (or more) cards shown beside the feature banner. */
export const HERO_PRODUCTS: LandingProduct[] = [
  {
    id: "hero-air-purifier",
    storeName: "Costco Wholesale Canada",
    storeDistanceKm: 1.0,
    storeLogoSrc: "/stores/Store Logos/Costco.png",
    showDiscount: true,
    description:
      "Air Purifiers for Home Large Room up to 1400ft², H13 True HEPA Air Purifier for Bedroom with night light, Fragrance Sponge",
    rating: 5,
    reviewCount: 345,
    price: 49.99,
    originalPrice: 234.45,
    imageSrc: "/stores/Product card Images/Air Purifier.png",
    imageAlt: "Air purifier",
    imageFit: "contain",
  },
  {
    id: "hero-portable-ac",
    storeName: "Home Depot",
    storeDistanceKm: 1.2,
    storeLogoSrc: "/stores/home-depot.png",
    showDiscount: true,
    description:
      "Black + Decker Portable Air Conditioner with Heat, 10,200 BTU SACC/CEC (14,000 BTU ASHRAE 128) with 12,000 BTU Heating for Rooms Up To 700 Sq. Ft., Portable AC with Follow Me Remote Control & Window K",
    rating: 5,
    reviewCount: 22,
    price: 1280.6,
    originalPrice: 2800,
    imageSrc: "/stores/Product card Images/Portable air conditioner.png",
    imageAlt: "Portable air conditioner",
    imageFit: "contain",
  },
  {
    id: "hero-tower-fan",
    storeName: "Lowe's",
    storeDistanceKm: 2.4,
    storeLogoSrc: "/stores/Store Logos/Lowe's.png",
    showDiscount: true,
    description:
      "KFFKFF Tower Fan Bladeless, 16 ft/s Velocity Quiet Floor Fan that Blows Cold & Heating Air, 80° Oscillating Fans with 8 Speeds, 9H Timer, Standing Fans with Remote Control for Bedroom, Office, Home",
    rating: 4.5,
    reviewCount: 149,
    price: 108.99,
    originalPrice: 265.0,
    imageSrc: "/stores/Product card Images/Tower Fan.png",
    imageAlt: "Tower fan",
    imageFit: "contain",
  },
];

/** Top picks for today — grocery staples. */
export const TOP_PICKS: LandingProduct[] = [
  {
    id: "pick-tomatoes",
    storeName: "Walmart",
    storeDistanceKm: 1.5,
    storeLogoSrc: "/stores/Store Logos/Walmart.png",
    description: "SUNSET Campari Tomatoes, 1 lb",
    rating: 4.5,
    reviewCount: 45,
    price: 2.5,
    deliveryText: "Free Delivery, Monday",
    imageSrc: "/stores/Product card Images/Screenshot 2026-03-01 175737.png",
    imageAlt: "Campari tomatoes",
    imageFit: "contain",
  },
  {
    id: "pick-cucumber",
    storeName: "Walmart",
    storeDistanceKm: 1.5,
    storeLogoSrc: "/stores/Store Logos/Walmart.png",
    showDiscount: true,
    discountLabel: "Best Seller",
    description: "Sunset Grown Organic Mini Cucumbers, 1 lb",
    rating: 5,
    reviewCount: 20,
    price: 4.47,
    originalPrice: 5.99,
    imageSrc: "/stores/Product card Images/Screenshot 2026-03-01 180205.png",
    imageAlt: "Sunset organic mini cucumbers",
    imageFit: "contain",
  },
  {
    id: "pick-mushrooms",
    storeName: "Real Canadian Superstore",
    storeDistanceKm: 3.1,
    storeLogoSrc: "/stores/Store Logos/Real Canadian Superstore.png",
    showDiscount: true,
    discountLabel: "New Product",
    description: "Mushrooms, Whole White, Your Fresh Market, 8 oz",
    rating: 4.5,
    reviewCount: 245,
    price: 2.44,
    imageSrc: "/stores/Product card Images/Screenshot 2026-03-01 180920.png",
    imageAlt: "Whole white mushrooms",
    imageFit: "contain",
  },
  {
    id: "pick-onions",
    storeName: "FreshCo",
    storeDistanceKm: 2.2,
    storeLogoSrc: "/stores/Store Logos/Freshco.png",
    showDiscount: true,
    description: "Yellow Onions, Your Fresh Market, 4.54 kg (10 lbs)",
    rating: 4,
    reviewCount: 345,
    price: 7.47,
    originalPrice: 17.5,
    imageSrc: "/stores/Product card Images/Screenshot 2026-03-01 181352.png",
    imageAlt: "Yellow onions",
    imageFit: "contain",
  },
  {
    id: "pick-banana",
    storeName: "Sobeys",
    storeDistanceKm: 1.8,
    storeLogoSrc: "/stores/Store Logos/Sobeys.png",
    description: "Banana, Sold in singles, 0.15 - 0.23 KG",
    rating: 4.5,
    reviewCount: 245,
    price: 0.35,
    deliveryText: "Free Pickup in 30 Minutes",
    imageSrc: "/stores/Product card Images/Screenshot 2026-03-01 181653.png",
    imageAlt: "Banana",
    imageFit: "contain",
  },
  {
    id: "pick-pickles",
    storeName: "Metro",
    storeDistanceKm: 1.5,
    storeLogoSrc: "/stores/Store Logos/Metro.png",
    showDiscount: true,
    description: "Bick's® Garlic Baby Dills Pickles 1L",
    rating: 4.5,
    reviewCount: 245,
    price: 4.98,
    originalPrice: 8.0,
    imageSrc: "/stores/Product card Images/Screenshot 2026-03-01 182044.png",
    imageAlt: "Bick's garlic baby dills pickles",
    imageFit: "contain",
  },
];

/** Black Friday Sale — electronics. */
export const BLACK_FRIDAY_PRODUCTS: LandingProduct[] = [
  {
    id: "bf-iphone-17-pro",
    storeName: "Costco Wholesale Canada",
    storeDistanceKm: 4.0,
    storeLogoSrc: "/stores/Store Logos/Costco.png",
    showDiscount: true,
    discountLabel: "Members Only",
    description: "Apple iPhone 17 Pro Unlocked",
    rating: 4.5,
    reviewCount: 345,
    price: 1489.99,
    originalPrice: 1699.99,
    imageSrc: "/stores/Product card Images/Screenshot 2026-03-02 174115.png",
    imageAlt: "Apple iPhone 17 Pro",
    imageFit: "contain",
  },
  {
    id: "bf-iphone-16e",
    storeName: "Costco Wholesale Canada",
    storeDistanceKm: 4.0,
    storeLogoSrc: "/stores/Store Logos/Costco.png",
    showDiscount: true,
    discountLabel: "Free AppleCare+",
    description: "Apple iPhone 16e Unlocked",
    rating: 4.5,
    reviewCount: 345,
    price: 899.99,
    imageSrc: "/stores/Product card Images/Screenshot 2026-03-02 174930.png",
    imageAlt: "Apple iPhone 16e",
    imageFit: "contain",
  },
  {
    id: "bf-watch-ultra",
    storeName: "Walmart",
    storeDistanceKm: 1.5,
    storeLogoSrc: "/stores/Store Logos/Walmart.png",
    showDiscount: true,
    description: "Apple Watch Ultra 3 GPS + Cellular",
    rating: 5,
    reviewCount: 345,
    price: 989.99,
    originalPrice: 1099.99,
    imageSrc: "/stores/Product card Images/Screenshot 2026-03-02 175239.png",
    imageAlt: "Apple Watch Ultra 3",
    imageFit: "contain",
  },
  {
    id: "bf-airpods-pro-3",
    storeName: "Canadian Tire",
    storeDistanceKm: 2.7,
    storeLogoSrc: "/stores/Store Logos/Canadian Tire.png",
    showDiscount: true,
    discountLabel: "Buy one, Get one",
    description: "AirPods Pro 3",
    rating: 5,
    reviewCount: 345,
    price: 314.48,
    imageSrc: "/stores/Product card Images/Screenshot 2026-03-02 175552.png",
    imageAlt: "AirPods Pro 3",
    imageFit: "contain",
  },
  {
    id: "bf-iphone-12",
    storeName: "Real Canadian Superstore",
    storeDistanceKm: 3.1,
    storeLogoSrc: "/stores/Store Logos/Real Canadian Superstore.png",
    showDiscount: true,
    discountLabel: "Limited Stock",
    description:
      "Pre-Owned Apple iPhone 12 - Carrier Unlocked - 128 GB (Product Red) (Fair)",
    rating: 4.5,
    reviewCount: 345,
    price: 250.0,
    originalPrice: 1000.0,
    deliveryText: "Free Delivery for PC Express member",
    imageSrc: "/stores/Product card Images/Screenshot 2026-03-02 175835.png",
    imageAlt: "Pre-owned Apple iPhone 12 in Product Red",
    imageFit: "contain",
  },
];

/**
 * Promo carousel. A slide splits into two halves: the left holds the headline
 * artwork with an Add CTA under it, the right holds the visual. Both artworks
 * are transparent PNGs (the headline is white text), so a slide that sets them
 * also needs `background` — the banner fill they sit on. Slides with neither
 * artwork render a placeholder until their images arrive.
 */
export interface CarouselSlide {
  id: string;
  alt: string;
  /**
   * A complete, self-contained banner that fills the slide. It's fitted whole
   * (never cropped, since these bake in their own headline and CTA), so pair it
   * with a `background` matching the artwork's edges to hide the letterboxing.
   * Takes precedence over the split halves below.
   */
  bannerSrc?: string;
  /**
   * How a `bannerSrc` fills the slide. Defaults to "contain" (fitted whole, with
   * the `background` hiding the letterbox). Use "cover" to fill edge-to-edge when
   * the artwork's aspect is close to the slide's — it crops only a sliver of the
   * top/bottom instead of leaving side gaps. Ignored for the split layout.
   */
  bannerFit?: "contain" | "cover";
  /** Left half — headline artwork (transparent PNG, white text). */
  textImageSrc?: string;
  /** Right half — the visual. */
  imageSrc?: string;
  /** Banner fill behind the artwork (any CSS background value). */
  background?: string;
}

export const CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    id: "slide-rewards",
    alt: "Earn 3% in rewards dollars on top of Walmart exclusive deals everyday",
    textImageSrc: "/stores/Product card Images/caraousel text input.png",
    imageSrc: "/stores/Product card Images/walmart.png",
    background: "linear-gradient(to bottom right, #ff8989 2%, #81005c 100%)",
  },
  {
    id: "slide-triangle",
    alt: "Canadian Tire Triangle Mastercard and Triangle Rewards offers",
    bannerSrc: "/stores/Product card Images/Carousel 2 Swipe.png",
    // Matches the artwork's left-hand panel; the letterbox here is only a few px.
    background: "#fefefe",
  },
  {
    id: "slide-costco",
    alt: "$100 off a $250 purchase on Costco.ca, and $65 back with a CIBC Costco Mastercard",
    bannerSrc: "/stores/Product card Images/Carousel 3.png",
    // Artwork runs near-white → pale pink left-to-right; mirroring it keeps the
    // (larger) top/bottom bands invisible.
    background: "linear-gradient(to right, #fef8fb, #fff1f1)",
  },
  {
    id: "slide-summer",
    alt: "Summer Worthy — reserve summer's hottest products, buy online and pick up in-store in 2 hours",
    bannerSrc: "/stores/Product card Images/carousel 4.png",
    // Its aspect (3.32) is within ~1.4% of the slide's (3.41) — fill edge-to-edge
    // so there's no side gap; the crop off the top/bottom is only a few px.
    bannerFit: "cover",
    background: "#ffffff",
  },
  {
    id: "slide-pc-mastercard",
    alt: "Earn the most points with a PC Mastercard",
    bannerSrc: "/stores/Product card Images/Carousel 5.png",
    // The artwork's edges are a uniform lavender, so the side bands blend exactly.
    background: "#f9f8ff",
  },
];
