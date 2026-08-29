"use client";

import { useRouter } from "next/navigation";
import { Text } from "@/components/Text/Text";
import { AddButton } from "@/components/AddButton/AddButton";
import { ItemRow } from "@/components/ItemRow/ItemRow";
import { ItemListPopup } from "@/components/ItemListPopup/ItemListPopup";
import { useAuth } from "@/components/Auth/AuthContext";
import { LoginGateBar } from "@/components/Auth/LoginGateBar";
import { formatPrice } from "@/lib/format";
import { useCart } from "./CartContext";
import styles from "./CartPopup.module.css";

/** Where "Checkout" leads. */
const ORDER_ROUTE = "/results/order";

export interface CartPopupProps {
  onClose: () => void;
}

/**
 * The basket, opened from the Header's cart icon. Each line shows its store,
 * product and price, with a trash icon to drop it. Reads the shared
 * CartProvider, so it shows the same basket on every page.
 */
export function CartPopup({ onClose }: CartPopupProps) {
  const router = useRouter();
  const { items, count, subtotal, remove } = useCart();
  const { isLoggedIn, promptLogin } = useAuth();

  function goToCheckout() {
    onClose();
    router.push(ORDER_ROUTE);
  }

  // Everyone can view the basket. Only checking out is gated: logged out, the
  // Checkout footer is replaced by the green "Login to Proceed" bar.
  return (
    <ItemListPopup
      title="My Cart"
      subtitle={count > 0 ? `${count} ${count === 1 ? "item" : "items"}` : undefined}
      onClose={onClose}
      isEmpty={items.length === 0}
      emptyMessage="Your cart is empty — add something to get started."
      footer={
        items.length === 0 ? undefined : !isLoggedIn ? (
          <LoginGateBar
            summaryValue={formatPrice(subtotal)}
            summaryLabel="TOTAL"
            onProceed={() => {
              onClose();
              promptLogin();
            }}
          />
        ) : (
          /* "Subtotal" with its amount stacked underneath, and Checkout taking
             the spot the amount used to sit in. */
          <div className={styles.footerRow}>
            <div className={styles.subtotalBlock}>
              <Text as="span" variant="mediumRegular">
                Subtotal
              </Text>
              <Text as="span" variant="mediumBold" className={styles.subtotalPrice}>
                {formatPrice(subtotal)}
              </Text>
            </div>
            <AddButton
              label="Checkout"
              showIcon={false}
              onAdd={goToCheckout}
              className={styles.checkoutBtn}
            />
          </div>
        )
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
          quantity={item.quantity}
          onRemove={() => remove(item.id)}
          removeLabel="Remove from cart"
        />
      ))}
    </ItemListPopup>
  );
}
