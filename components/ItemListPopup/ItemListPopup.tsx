"use client";

import { useEffect, type ReactNode } from "react";
import { Text } from "@/components/Text/Text";
import styles from "./ItemListPopup.module.css";

export interface ItemListPopupProps {
  title: string;
  /** Shown next to the title, e.g. "3 items". */
  subtitle?: string;
  onClose: () => void;
  /** Message for when the list has nothing in it. */
  emptyMessage: string;
  isEmpty: boolean;
  /** The ItemRow lines. */
  children: ReactNode;
  /** Optional pinned footer — the cart's subtotal + checkout CTA. */
  footer?: ReactNode;
}

/**
 * Shared shell for the cart and wishlist popups: a titled list shown as a
 * dropdown anchored under the Header icon that opened it (same pattern as
 * ProductPop's price-comparison dropdown — a fixed transparent catcher behind
 * it handles outside clicks). Escape closes it too. Keeping both popups on one
 * shell is what makes them read as the same component.
 *
 * Render this inside a `position: relative` anchor.
 */
export function ItemListPopup({
  title,
  subtitle,
  onClose,
  emptyMessage,
  isEmpty,
  children,
  footer,
}: ItemListPopupProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <>
      <div className={styles.catcher} onClick={onClose} role="presentation" />
      <div className={styles.dropdown} role="dialog" aria-label={title}>
        <div className={styles.head}>
          <Text as="h2" variant="heading6">
            {title}
          </Text>
          {subtitle && (
            <Text as="span" variant="smallRegular" className={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </div>

        {isEmpty ? (
          <Text as="p" variant="mediumRegular" className={styles.empty}>
            {emptyMessage}
          </Text>
        ) : (
          <div className={styles.list}>{children}</div>
        )}

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </>
  );
}
