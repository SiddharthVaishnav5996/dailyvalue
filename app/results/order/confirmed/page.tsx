"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header/Header";
import { Text } from "@/components/Text/Text";
import styles from "./page.module.css";

/** Page 1 — landing. "Continue Shopping" sends the user here. */
const LANDING_ROUTE = "/";
/** Page 7 — order status. The CTA and the idle auto-redirect both go here. */
const ORDER_STATUS_ROUTE = "/results/order/status";
/** Auto-advance to order status if the user doesn't act within this window. */
const AUTO_REDIRECT_MS = 3000;

/**
 * Page 6 — Order confirmation ("Thank you for your order!"). Reached
 * automatically from the verifying page (Page 5), ~2s after payment is verified.
 *
 * It shows the *same* completed green tick as Page 5 (not re-animated) so the
 * hand-off reads as continuous; the surrounding thank-you content fades up on
 * arrival. If the user clicks neither action, we move them on to the order
 * status page after AUTO_REDIRECT_MS. No page background.
 */
export default function OrderConfirmedPage() {
  const router = useRouter();

  // Prefetch order status, and auto-advance there if the user stays idle.
  // Clicking either action navigates away first, which unmounts this page and
  // cancels the timer via cleanup.
  useEffect(() => {
    router.prefetch(ORDER_STATUS_ROUTE);
    const timeout = setTimeout(
      () => router.replace(ORDER_STATUS_ROUTE),
      AUTO_REDIRECT_MS,
    );
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <>
      <Header />

      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.icon}>
            <svg
              className={styles.check}
              viewBox="0 0 52 52"
              role="img"
              aria-label="Order placed"
            >
              <circle className={styles.checkCircle} cx="26" cy="26" r="24" />
              <path className={styles.checkMark} d="M14 27 l7 7 l16 -17" />
            </svg>
          </div>

          <Text as="h1" variant="heading2" className={styles.heading}>
            Thank you for your order !
          </Text>
          <Text as="p" variant="largeRegular" className={styles.subtext}>
            Your order will be delivered in next 5 hours
          </Text>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => router.replace(ORDER_STATUS_ROUTE)}
          >
            <Text as="span" variant="largeRegular">
              Go to Order Status
            </Text>
          </button>

          <button
            type="button"
            className={styles.statusLink}
            onClick={() => router.replace(LANDING_ROUTE)}
          >
            <Text as="span" variant="mediumBold">
              Continue Shopping
            </Text>
          </button>
        </div>
      </main>
    </>
  );
}
