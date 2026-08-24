"use client";

import { useRouter } from "next/navigation";
import { AddButton } from "@/components/AddButton/AddButton";
import { startDelivery } from "@/lib/delivery";
import styles from "./ContinueShoppingCta.module.css";

/**
 * "Continue Shopping" CTA on the Order Status page (Page 7). Reuses the shared
 * <AddButton> so its colour, shape and hover come from that component (and track
 * any change to it) — the local class only scales it up into a page-level CTA.
 * On click it starts the demo delivery countdown (so the landing page shows the
 * Track-Order banner), then navigates back to the landing page.
 */
export function ContinueShoppingCta() {
  const router = useRouter();

  function handleContinue() {
    startDelivery();
    router.push("/");
  }

  return (
    <AddButton
      label="Continue Shopping"
      showIcon={false}
      onAdd={handleContinue}
      className={styles.cta}
    />
  );
}
