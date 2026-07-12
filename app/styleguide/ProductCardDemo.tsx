"use client";

import { useState } from "react";
import { ProductCard } from "@/components/ProductCard/ProductCard";
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

export function ProductCardDemo() {
  const cardA = useQuantity();
  const cardB = useQuantity();
  const cardC = useQuantity();

  return (
    <div className={styles.productCardGrid}>
      <ProductCard layout="horizontal" showDiscount {...SAMPLE} {...cardA} />
      <ProductCard layout="horizontal" showDiscount={false} {...SAMPLE} {...cardB} />
      <ProductCard layout="vertical" showDiscount {...SAMPLE} {...cardC} />
    </div>
  );
}
