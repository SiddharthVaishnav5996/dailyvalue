"use client";

import { ItemRow } from "@/components/ItemRow/ItemRow";
import { ItemListPopup } from "@/components/ItemListPopup/ItemListPopup";
import { useWishlist } from "./WishlistContext";

export interface WishlistPopupProps {
  onClose: () => void;
}

/**
 * Saved items, opened from the Header's bookmark icon. The same list lines as
 * the cart, minus the quantity stepper and the heart — a wishlist doesn't
 * track quantities, and every line in here is already saved.
 */
export function WishlistPopup({ onClose }: WishlistPopupProps) {
  const { items, count, remove } = useWishlist();

  return (
    <ItemListPopup
      title="My Wishlist"
      subtitle={count > 0 ? `${count} ${count === 1 ? "item" : "items"}` : undefined}
      onClose={onClose}
      isEmpty={items.length === 0}
      emptyMessage="Nothing saved yet — tap the heart on a product to save it."
    >
      {items.map((item) => (
        <ItemRow
          key={item.id}
          name={item.name}
          price={item.price}
          imageSrc={item.imageSrc}
          imageAlt={item.imageAlt}
          storeName={item.storeName}
          storeLogoSrc={item.storeLogoSrc}
          onRemove={() => remove(item.id)}
          removeLabel="Remove from wishlist"
        />
      ))}
    </ItemListPopup>
  );
}
