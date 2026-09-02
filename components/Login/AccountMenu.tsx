"use client";

import { useEffect } from "react";
import { Text } from "@/components/Text/Text";
import styles from "./AccountMenu.module.css";

export interface AccountMenuProps {
  /** The signed-in phone number, shown under the greeting. */
  phone?: string;
  onClose: () => void;
  onLogout: () => void;
}

/**
 * The account dropdown, opened from the Header avatar once signed in. Same
 * dropdown mechanics as the cart / wishlist panels: an absolutely positioned
 * panel anchored under the avatar, with a fixed transparent catcher behind it
 * for outside clicks, plus Escape to close.
 *
 * Log Out is the only item wired up — the rest have no page to go to yet (My
 * Orders means past orders, which don't exist; /results/order/status is live
 * tracking for the current order, not history). Give each a destination as
 * those pages get built.
 *
 * Render this inside a `position: relative` anchor.
 */
export function AccountMenu({ phone, onClose, onLogout }: AccountMenuProps) {
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
      <div className={styles.menu} role="menu" aria-label="Account">
        <div className={styles.head}>
          <Text as="p" variant="normalBold">
            Hello, welcome
          </Text>
          {phone && (
            <Text as="p" variant="normalRegular" className={styles.phone}>
              {phone}
            </Text>
          )}
        </div>

        <ul className={styles.list}>
          <li>
            <button type="button" className={styles.item} role="menuitem">
              My Orders
            </button>
          </li>
          <li>
            <button type="button" className={styles.item} role="menuitem">
              Saved Addresses
            </button>
          </li>
          <li>
            <button type="button" className={styles.item} role="menuitem">
              Saved Cards
            </button>
          </li>
          <li>
            <button type="button" className={styles.item} role="menuitem">
              E-Gift Cards
            </button>
          </li>
          <li>
            <button type="button" className={styles.item} role="menuitem">
              FAQ&apos;s
            </button>
          </li>
          <li>
            <button type="button" className={styles.item} role="menuitem">
              Account Privacy
            </button>
          </li>
          <li>
            <button
              type="button"
              className={styles.item}
              role="menuitem"
              onClick={() => {
                onClose();
                onLogout();
              }}
            >
              Log Out
            </button>
          </li>
        </ul>
      </div>
    </>
  );
}
