/**
 * Page 7 — Order Status. Demo tracking data for the timeline + delivery map.
 * Static for now (a real tracking API comes later); wording and IDs mirror the
 * design. The final step (`Delivered`) is intentionally not yet complete, so it
 * renders in the muted/disabled treatment.
 */

export interface TrackingStep {
  /** Bold step title, e.g. "In-Transit". */
  title: string;
  /** Muted detail lines shown under the title (order preserved). */
  lines: string[];
  /** Reached yet? Complete → green tick; pending → muted grey tick. */
  complete: boolean;
}

export interface OrderTracking {
  /** Bold summary line at the top of the timeline column. */
  headline: string;
  orderId: string;
  trackingNumber: string;
  steps: TrackingStep[];
  /** Driver ETA shown on the map tooltip. */
  eta: { minutes: number; distanceKm: number };
  /** "Have a query?" contact line under the map. */
  contactEmail: string;
  contactPhone: string;
}

export const ORDER_TRACKING: OrderTracking = {
  headline: "Order will be delivered by 8.00 pm today.",
  orderId: "#3202",
  trackingNumber: "#123456789",
  steps: [
    {
      title: "Order Received",
      lines: ["Track Order : #3202", "Date : 16-03-2026"],
      complete: true,
    },
    {
      title: "Packed",
      lines: ["Order is getting packed at Calgary, Queen Street", "Date : 16-03-2026"],
      complete: true,
    },
    {
      title: "In-Transit",
      lines: [
        "Order will be delivered by 8.00 pm today.",
        "Order has left the facility, currently enroute to drop-off address.",
        "Date : 16-03-2026",
      ],
      complete: true,
    },
    {
      title: "Delivered",
      lines: ["Order is successfully delivered", "Date : 16-03-2026"],
      complete: false,
    },
  ],
  eta: { minutes: 13, distanceKm: 10.3 },
  contactEmail: "xxxxx@gmail.com",
  contactPhone: "+ 1 (825)-967-1512",
};
