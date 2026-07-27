"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { Header } from "@/components/Header/Header";
import { Text } from "@/components/Text/Text";
import styles from "./page.module.css";

/** Countdown length shown on the clock (5:00). */
const COUNTDOWN_SECONDS = 5 * 60;
/** How long the (simulated) payment check runs before it resolves to success. */
const VERIFY_MS = 4000;
/** Pause on the green tick after verifying, then move to the confirmation page. */
const REDIRECT_AFTER_VERIFIED_MS = 2000;
/** Where we hand off to once payment is verified. */
const CONFIRMED_ROUTE = "/results/order/confirmed";

/** Seconds → "M:SS". */
function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Page 5 — "Verifying your payment" interstitial. Reached from "Place Order" on
 * the checkout page (Page 4).
 *
 * A spinner and a 5:00 countdown run while the payment is (pretend-)verified;
 * after VERIFY_MS the spinner swaps to an animated green tick, the heading flips
 * to a success message, and the countdown fades out. There's no real gateway —
 * the delay is a fixed demo timer so the success state is always shown.
 */
export default function VerifyingPaymentPage() {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);

  // Warm up the confirmation page so the hand-off is instant when we get there.
  useEffect(() => {
    router.prefetch(CONFIRMED_ROUTE);
  }, [router]);

  // Resolve the payment after the fixed delay.
  useEffect(() => {
    const timeout = setTimeout(() => setVerified(true), VERIFY_MS);
    return () => clearTimeout(timeout);
  }, []);

  // Once verified, hold on the green tick briefly, then move to the thank-you
  // page. The tick looks identical there, so it reads as staying in place.
  useEffect(() => {
    if (!verified) return;
    const timeout = setTimeout(
      () => router.replace(CONFIRMED_ROUTE),
      REDIRECT_AFTER_VERIFIED_MS,
    );
    return () => clearTimeout(timeout);
  }, [verified, router]);

  // Tick the countdown down each second; stop once verified (or it reaches 0).
  useEffect(() => {
    if (verified) return;
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [verified]);

  return (
    <>
      <Header />

      <main className={styles.main}>
        <div className={styles.status}>
          {/* Spinner → animated green tick share one fixed slot: no reflow. */}
          <div className={styles.icon}>
            {verified ? (
              <svg
                className={styles.check}
                viewBox="0 0 52 52"
                role="img"
                aria-label="Payment verified"
              >
                <circle className={styles.checkCircle} cx="26" cy="26" r="24" />
                <path className={styles.checkMark} d="M14 27 l7 7 l16 -17" />
              </svg>
            ) : (
              <span className={styles.spinner} aria-hidden="true" />
            )}
          </div>

          <Text as="h3" variant="heading3" className={styles.heading} aria-live="polite">
            {verified ? "Payment verified" : "Verifying your payment"}
          </Text>

          <div
            className={styles.timer}
            data-hidden={verified || undefined}
            aria-hidden={verified || undefined}
          >
            <History size={30} strokeWidth={1.75} aria-hidden="true" />
            <Text as="span" variant="largeRegular">
              {formatClock(remaining)}
            </Text>
          </div>
        </div>
      </main>
    </>
  );
}
