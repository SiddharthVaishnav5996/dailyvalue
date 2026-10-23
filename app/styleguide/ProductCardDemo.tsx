"use client";

import { useState } from "react";
import { ProductCard } from "@/components/ProductCard/ProductCard";
import { Text } from "@/components/Text/Text";
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
    </div>
  );
}
