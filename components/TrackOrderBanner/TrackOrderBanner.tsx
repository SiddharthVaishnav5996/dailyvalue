"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Truck, CircleCheck, X } from "lucide-react";
import { Text } from "@/components/Text/Text";
import { clearDelivery, getDeadline, DELIVERY_CHANGE_EVENT } from "@/lib/delivery";
import styles from "./TrackOrderBanner.module.css";

/** Page 7 — the full order-tracking view the ongoing banner links to. */
const ORDER_STATUS_ROUTE = "/results/order/status";

/** M:SS, floored at 0 (e.g. 180000ms → "3:00"). */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Re-read the deadline whenever it's started/cleared (same tab) or changed in
 *  another tab. */
function subscribe(onChange: () => void) {
  window.addEventListener(DELIVERY_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(DELIVERY_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * The active-order strip shown under the header on the landing page. While the
 * order is out for delivery it counts down (soft-green); when the countdown ends
 * it flips to a brand-coloured "Order Delivered" and stays until the user closes
 * it with the cross. It only renders for someone with an order in flight — the
 * deadline is seeded by the Order Status "Continue Shopping" CTA (see
 * lib/delivery), so a first-time visitor sees nothing. Height matches the header.
 */
export function TrackOrderBanner() {
  // getDeadline doubles as the SSR snapshot (returns null with no window).
  const deadline = useSyncExternalStore(subscribe, getDeadline, getDeadline);
  const [now, setNow] = useState(() => Date.now());

  // Tick each second until delivered, then stop.
  useEffect(() => {
    if (deadline == null) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= deadline) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (deadline == null) return null;

  const delivered = now >= deadline;

  return (
    <div
      className={[styles.banner, delivered ? styles.delivered : styles.ongoing].join(" ")}
    >
      {delivered ? (
        <div className={styles.content}>
          <CircleCheck size={26} className={styles.icon} aria-hidden="true" />
          <Text as="span" variant="mediumBold" className={styles.label}>
            Order Delivered
          </Text>
        </div>
      ) : (
        <Link
          href={ORDER_STATUS_ROUTE}
          className={[styles.content, styles.trackLink].join(" ")}
        >
          <Truck size={26} className={styles.icon} aria-hidden="true" />
          <Text as="span" variant="mediumBold" className={styles.label}>
            Track Order · Arriving in{" "}
            <span className={styles.timer}>{formatRemaining(deadline - now)}</span>
          </Text>
        </Link>
      )}

      <button
        type="button"
        className={styles.close}
        onClick={clearDelivery}
        aria-label="Dismiss order tracking"
      >
        <X size={22} aria-hidden="true" />
      </button>
    </div>
  );
}
