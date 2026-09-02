/**
 * Demo delivery countdown for the active order. Started the moment an order is
 * placed (the order-confirmation page) — the same point the cart is emptied —
 * and read by the Track-Order banner on the landing page. The Order Status
 * "Continue Shopping" CTA also calls startDelivery as a no-op safety net.
 *
 * The delivery deadline (an epoch-ms timestamp) is kept in localStorage so it
 * survives client-side navigation (and reloads) back to the landing page. All
 * helpers no-op on the server (no `window`).
 */

export const DELIVERY_KEY = "dv_delivery_deadline";

/** Demo delivery time — 3 minutes (the order is "out for delivery"). */
export const DELIVERY_MS = 3 * 60 * 1000;

/** Fired on start/clear so a same-tab banner (useSyncExternalStore) re-reads. */
export const DELIVERY_CHANGE_EVENT = "dv-delivery-change";

function notify(): void {
  window.dispatchEvent(new Event(DELIVERY_CHANGE_EVENT));
}

/** Start (or keep) the countdown. Won't reset a delivery that's still running. */
export function startDelivery(): void {
  if (typeof window === "undefined") return;
  const existing = getDeadline();
  if (existing == null || existing <= Date.now()) {
    window.localStorage.setItem(DELIVERY_KEY, String(Date.now() + DELIVERY_MS));
    notify();
  }
}

/** The active order's delivery deadline (epoch ms), or null if none. Safe on
 *  the server — returns null so it doubles as the SSR snapshot. */
export function getDeadline(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DELIVERY_KEY);
  if (raw == null) return null; // absent — Number(null) would be 0, not NaN
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Clear the order (used when the user dismisses the delivered banner). */
export function clearDelivery(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DELIVERY_KEY);
  notify();
}
