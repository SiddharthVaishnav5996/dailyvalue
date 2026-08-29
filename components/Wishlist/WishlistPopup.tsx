"use client";

import { ItemRow } from "@/components/ItemRow/ItemRow";
import { ItemListPopup } from "@/components/ItemListPopup/ItemListPopup";
import { useAuth } from "@/components/Auth/AuthContext";
import { LoginGateBar } from "@/components/Auth/LoginGateBar";
import { useWishlist } from "./WishlistContext";

export interface WishlistPopupProps {
  onClose: () => void;
}

/**
 * Saved items, opened from the Header's bookmark icon. The same list lines as
 * the cart, minus the quantity stepper and the heart — a wishlist doesn't
 * track quantities, and every line in here is already saved.
 *
 * Everyone can view saved items; only moving forward is gated. Logged out, a
 * "Login to Proceed" bar sits under the list.
 */
export function WishlistPopup({ onClose }: WishlistPopupProps) {
  const { items, count, remove } = useWishlist();
  const { isLoggedIn, promptLogin } = useAuth();

  return (
    <ItemListPopup
      title="My Wishlist"
      subtitle={count > 0 ? `${count} ${count === 1 ? "item" : "items"}` : undefined}
      onClose={onClose}
      isEmpty={items.length === 0}
      emptyMessage="Nothing saved yet — tap the heart on a product to save it."
      footer={
        items.length > 0 && !isLoggedIn ? (
          <LoginGateBar
            summaryValue={String(count)}
            summaryLabel="SAVED"
            onProceed={() => {
              onClose();
              promptLogin();
            }}
          />
        ) : undefined
      }
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
