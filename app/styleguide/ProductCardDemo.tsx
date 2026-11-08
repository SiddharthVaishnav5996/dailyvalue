"use client";

import { useState } from "react";
import { ProductCard } from "@/components/ProductCard/ProductCard";
import { VariantPicker } from "@/components/VariantPicker/VariantPicker";
import { Text } from "@/components/Text/Text";
import type { ResolvedProduct, VariantFamilyInfo } from "@/lib/types";
import styles from "./styleguide.module.css";

const SAMPLE = {
  storeName: "Home Depot",
  storeDistanceKm: 1.0,
  storeLogoSrc: "/stores/home-depot.png",
  description:
    "Air Purifiers for Home Large Room up to 1400ft², H13 True HEPA Air Purifier for Bedroom with night light, Fragrance Sponge",
  rating: 5,
  reviewCount: 345,
  price: 49.99,
  originalPrice: 234.45,
};

/*
 * The variant chooser, as a card actually receives it.
 * ---------------------------------------------------------------------------
 * ProductCard takes the control as a `variantControl` node rather than
 * building it, because the card is presentational and has no business knowing
 * what a variant family is. That means the styleguide has to hand it a real
 * VariantPicker, which in turn wants a real family - so the sample below is
 * the genuine shape the resolver produces, not a mock.
 *
 * See data/variants.ts for where these come from in the app, and Chapter 33
 * of the field notes for why the chooser exists at all.
 */

/** Just enough of a ResolvedProduct for the chooser to draw a row. */
function sampleProduct(
  id: string,
  description: string,
  imageSrc: string,
  price: number,
): ResolvedProduct {
  return {
    id,
    rowIds: [],
    description,
    brand: "",
    category: "Dairy",
    department: "dairy",
    packSize: "2 L",
    emoji: "🥛",
    imageSrc,
    imageAlt: description,
    imageFit: "contain",
    source: "catalog",
    quantity: 1,
    offers: [
      {
        id: "walmart",
        storeName: "Walmart",
        storeDistanceKm: 0.5,
        price,
        rating: 4.5,
        reviewCount: 345,
      },
    ],
  };
}

const IMG = "/stores/Brand Photos";
const CURATED = "/stores/Product card Images/AI searched";

const MILK_MEMBERS = [
  {
    key: "skim-milk",
    label: "Skim",
    note: "No fat",
    product: sampleProduct("skim", "Skim Milk 2 L", `${IMG}/skim-milk.superstore.png`, 3.68),
  },
  {
    key: "1-milk",
    label: "1%",
    note: "Lighter",
    product: sampleProduct("1pc", "1% Milk 2 L", `${IMG}/1-milk.superstore.png`, 3.97),
  },
  {
    key: "milk",
    label: "2%",
    note: "The usual",
    product: sampleProduct(
      "2pc",
      "2% Milk 2 L",
      `${CURATED}/2 percent cow milk- WALMART.avif`,
      3.75,
    ),
  },
  {
    key: "whole-milk",
    label: "Whole",
    note: "Richest - for custards",
    product: sampleProduct("whole", "Whole Milk 2 L", `${IMG}/milk-whole.superstore.jpg`, 3.99),
  },
];

/**
 * A card wired to its own chooser, exactly as the results page wires one.
 *
 * Picking a flavour here swaps the whole card - title, photograph and price -
 * because that is what happens in the app: a variant is a different product,
 * not the same product with a different label on it.
 */
function useMilkVariant(startKey = "milk") {
  const [selected, setSelected] = useState(startKey);
  const current = MILK_MEMBERS.find((m) => m.key === selected) ?? MILK_MEMBERS[2];

  const family: VariantFamilyInfo = {
    label: "Fat content",
    selected,
    members: MILK_MEMBERS,
  };

  return {
    description: current.product.description,
    imageSrc: current.product.imageSrc,
    imageFit: "contain" as const,
    price: current.product.offers[0].price,
    // The shared SAMPLE above is an air purifier at Home Depot, which is fine
    // for the layout groups and silly on a carton of milk. A design system
    // that shows a hardware shop selling dairy teaches the wrong thing.
    storeName: "Walmart",
    storeDistanceKm: 0.5,
    storeLogoSrc: "/stores/Store Logos/Walmart.png",
    variantControl: <VariantPicker family={family} onSelect={setSelected} />,
  };
}

function useQuantity() {
  const [quantity, setQuantity] = useState(0);
  return {
    quantity,
    onAdd: () => setQuantity(1),
    onIncrement: () => setQuantity((q) => q + 1),
    onDecrement: () => setQuantity((q) => Math.max(0, q - 1)),
  };
}

function useWishlist() {
  const [isWishlisted, setIsWishlisted] = useState(false);
  return {
    isWishlisted,
    // Toggling the heart will also add the item to cart once that feature
    // exists — for now it only tracks the wishlisted visual state.
    onToggleWishlist: () => setIsWishlisted((w) => !w),
  };
}

export function ProductCardDemo() {
  const cardA = useQuantity();
  const cardB = useQuantity();
  const cardC = useQuantity();
  const cardD = useQuantity();
  const wishlistA = useWishlist();
  const wishlistB = useWishlist();
  const wishlistC = useWishlist();
  const wishlistD = useWishlist();
  const cardE = useQuantity();
  const cardF = useQuantity();
  const wishlistE = useWishlist();
  const wishlistF = useWishlist();

  // The variant chooser, one independent copy per demo card.
  const cardG = useQuantity();
  const cardH = useQuantity();
  const cardI = useQuantity();
  const cardJ = useQuantity();
  const wishlistG = useWishlist();
  const wishlistH = useWishlist();
  const wishlistI = useWishlist();
  const wishlistJ = useWishlist();
  const variantG = useMilkVariant();
  const variantH = useMilkVariant("skim-milk");
  const variantI = useMilkVariant("whole-milk");

  return (
    <div className={styles.productCardGroups}>
      <div>
        <Text variant="normalBold" as="h3" className={styles.cardGroupLabel}>
          Horizontal — 458px
        </Text>
        <div className={styles.cardRow}>
          <div className={[styles.cardCell, styles.cardCellHorizontal].join(" ")}>
            <ProductCard layout="horizontal" showDiscount {...SAMPLE} {...cardA} {...wishlistA} />
            <Text variant="smallRegular" className={styles.muted}>
              Show Discount = true
            </Text>
          </div>
          <div className={[styles.cardCell, styles.cardCellHorizontal].join(" ")}>
            <ProductCard
              layout="horizontal"
              showDiscount={false}
              {...SAMPLE}
              {...cardB}
              {...wishlistB}
            />
            <Text variant="smallRegular" className={styles.muted}>
              Show Discount = false (slot stays reserved)
            </Text>
          </div>
          <div className={[styles.cardCell, styles.cardCellHorizontal].join(" ")}>
            <ProductCard
              layout="horizontal"
              showDiscount={false}
              {...SAMPLE}
              originalPrice={undefined}
              {...cardE}
              {...wishlistE}
            />
            <Text variant="smallRegular" className={styles.muted}>
              No discount — price centred on the ADD line
            </Text>
          </div>
        </div>
      </div>

      <div>
        <Text variant="normalBold" as="h3" className={styles.cardGroupLabel}>
          Vertical — 204px
        </Text>
        <div className={styles.cardRow}>
          <div className={[styles.cardCell, styles.cardCellVertical].join(" ")}>
            <ProductCard layout="vertical" showDiscount {...SAMPLE} {...cardC} {...wishlistC} />
            <Text variant="smallRegular" className={styles.muted}>
              Show Discount = true
            </Text>
          </div>
          <div className={[styles.cardCell, styles.cardCellVertical].join(" ")}>
            <ProductCard
              layout="vertical"
              showDiscount={false}
              {...SAMPLE}
              {...cardD}
              {...wishlistD}
            />
            <Text variant="smallRegular" className={styles.muted}>
              Show Discount = false (slot stays reserved)
            </Text>
          </div>
          <div className={[styles.cardCell, styles.cardCellVertical].join(" ")}>
            <ProductCard
              layout="vertical"
              showDiscount={false}
              {...SAMPLE}
              originalPrice={undefined}
              {...cardF}
              {...wishlistF}
            />
            <Text variant="smallRegular" className={styles.muted}>
              No discount — price centred on the ADD line
            </Text>
          </div>
        </div>
      </div>

      <div>
        <Text variant="normalBold" as="h3" className={styles.cardGroupLabel}>
          With a variant chooser
        </Text>
        <Text variant="smallRegular" className={styles.muted}>
          A card can carry the choice behind it — which milk, which size of egg,
          which cut of chicken. The control is passed in as{" "}
          <code>variantControl</code>, so the card itself stays presentational.
          Press one: the whole card changes, because a variant is a different
          product rather than the same product relabelled.
        </Text>
        <div className={styles.cardRow}>
          <div className={[styles.cardCell, styles.cardCellVertical].join(" ")}>
            <ProductCard
              layout="vertical"
              showDiscount={false}
              {...SAMPLE}
              brand="Great Value"
              originalPrice={undefined}
              {...variantG}
              {...cardG}
              {...wishlistG}
            />
            <Text variant="smallRegular" className={styles.muted}>
              Vertical — chooser shares the brand line
            </Text>
          </div>
          <div className={[styles.cardCell, styles.cardCellVertical].join(" ")}>
            <ProductCard
              layout="vertical"
              showDiscount={false}
              {...SAMPLE}
              storeName="Walmart"
              storeDistanceKm={0.5}
              storeLogoSrc="/stores/Store Logos/Walmart.png"
              brand="Lactantia"
              description="Chocolate Milk 2 L"
              imageSrc="/stores/Brand Photos/chocolate-milk.superstore.png"
              imageFit="contain"
              price={4.29}
              originalPrice={undefined}
              {...cardJ}
              {...wishlistJ}
            />
            <Text variant="smallRegular" className={styles.muted}>
              No chooser — same height, so the two line up
            </Text>
          </div>
          <div className={[styles.cardCell, styles.cardCellVertical].join(" ")}>
            <ProductCard
              layout="vertical"
              showDiscount={false}
              {...SAMPLE}
              brand=""
              originalPrice={undefined}
              {...variantH}
              {...cardH}
              {...wishlistH}
            />
            <Text variant="smallRegular" className={styles.muted}>
              No brand to print — the chooser sits alone on the line
            </Text>
          </div>
          <div className={[styles.cardCell, styles.cardCellHorizontal].join(" ")}>
            <ProductCard
              layout="horizontal"
              showDiscount={false}
              {...SAMPLE}
              brand="President&rsquo;s Choice Organics"
              originalPrice={undefined}
              {...variantI}
              {...cardI}
              {...wishlistI}
            />
            <Text variant="smallRegular" className={styles.muted}>
              Horizontal — a long brand truncates, the chooser keeps its width
            </Text>
          </div>
        </div>
        <Text variant="smallRegular" className={styles.muted}>
          The brand line reserves exactly one line-height whether or not a
          chooser is on it, so a card with one is no taller than a card without
          — a mixed row still lines its prices and ADD buttons up. The panel is
          drawn against the window and portalled out of the page, so nothing
          clips it; see <code>lib/ui/useAnchoredPanel.ts</code>.
        </Text>
      </div>
    </div>
  );
}
