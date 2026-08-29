"use client";

import { ChevronRight } from "lucide-react";
import { Text } from "@/components/Text/Text";
import styles from "./LoginGateBar.module.css";

export interface LoginGateBarProps {
  /** Big number on the left, e.g. "₹601" (cart total) or "3" (saved count). */
  summaryValue?: string;
  /** Small caption under it, e.g. "TOTAL" or "SAVED". */
  summaryLabel?: string;
  /** CTA text on the right. */
  label?: string;
  /** Fires when the bar is tapped — opens the login dialog. */
  onProceed: () => void;
}

/**
 * The green gate shown as the cart/wishlist popup footer while logged out: a
 * summary figure on the left and a "Login to Proceed" CTA on the right. The whole
 * bar is the button.
 */
export function LoginGateBar({
  summaryValue,
  summaryLabel,
  label = "Login to Proceed",
  onProceed,
}: LoginGateBarProps) {
  return (
    <button type="button" className={styles.bar} onClick={onProceed}>
      {summaryValue && (
        <span className={styles.summary}>
          <Text as="span" variant="largeBold" className={styles.value}>
            {summaryValue}
          </Text>
          {summaryLabel && (
            <Text as="span" variant="xsmallBold" className={styles.label}>
              {summaryLabel}
            </Text>
          )}
        </span>
      )}
      <span className={styles.cta}>
        <Text as="span" variant="mediumBold">
          {label}
        </Text>
        <ChevronRight size={20} strokeWidth={2.5} aria-hidden="true" />
      </span>
    </button>
  );
}
