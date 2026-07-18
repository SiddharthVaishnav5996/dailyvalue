"use client";

import { useState } from "react";
import { ProductCard, type ProductCardProps } from "./ProductCard";

export type ProductCardInteractiveProps = Omit<
  ProductCardProps,
  | "quantity"
  | "onAdd"
  | "onIncrement"
  | "onDecrement"
  | "isWishlisted"
  | "onToggleWishlist"
>;

/**
 * A ProductCard wired to its own local state: clicking ADD turns it into the
 * quantity stepper, and tapping the heart toggles the wishlist (filled/primary
 * when saved). This keeps the storefront cards interactive on the landing page
 * without committing to a cart/wishlist backend yet (swap for CartContext
 * wiring when the catalog is real).
 */
export function ProductCardInteractive(props: ProductCardInteractiveProps) {
  const [quantity, setQuantity] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  return (
    <ProductCard
      {...props}
      quantity={quantity}
      onAdd={() => setQuantity(1)}
      onIncrement={() => setQuantity((q) => q + 1)}
      onDecrement={() => setQuantity((q) => Math.max(0, q - 1))}
      isWishlisted={isWishlisted}
      onToggleWishlist={() => setIsWishlisted((w) => !w)}
    />
  );
}
