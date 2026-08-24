"use client";

import { useCart } from "@/components/Cart/CartContext";
import { useWishlist } from "@/components/Wishlist/WishlistContext";
import { ProductCard, type ProductCardProps } from "./ProductCard";

export type ProductCardInteractiveProps = Omit<
  ProductCardProps,
  | "quantity"
  | "onAdd"
  | "onIncrement"
  | "onDecrement"
  | "isWishlisted"
  | "onToggleWishlist"
> & {
  /** Product id — keys this card into the shared cart and wishlist. */
  id: string;
};

/**
 * A ProductCard wired to the shared CartProvider (ADD adds it to the cart and
 * turns into the quantity stepper) and WishlistProvider (its heart), so the
 * Header badges — and the checkout list — reflect it immediately. The card's
 * own details (name/price/image/store) go into the cart line.
 */
export function ProductCardInteractive({ id, ...props }: ProductCardInteractiveProps) {
  const { quantityOf, addItem, increment, decrement } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  return (
    <ProductCard
      {...props}
      quantity={quantityOf(id)}
      onAdd={() =>
        addItem({
          id,
          name: props.description,
          price: props.price,
          imageSrc: props.imageSrc,
          imageAlt: props.imageAlt,
          storeName: props.storeName,
          storeLogoSrc: props.storeLogoSrc,
        })
      }
      onIncrement={() => increment(id)}
      onDecrement={() => decrement(id)}
      isWishlisted={isWishlisted(id)}
      onToggleWishlist={() =>
        toggleWishlist({
          id,
          name: props.description,
          price: props.price,
          imageSrc: props.imageSrc,
          imageAlt: props.imageAlt,
          storeName: props.storeName,
          storeLogoSrc: props.storeLogoSrc,
        })
      }
    />
  );
}
