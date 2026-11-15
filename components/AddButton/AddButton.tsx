"use client";

import { useAuth } from "@/components/Auth/AuthContext";
import styles from "./AddButton.module.css";

/** The add-to-cart role — the default label. */
const ADD_LABEL = "ADD";

function PlusCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 8v8M8 12h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MinusCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export interface AddButtonProps {
  /** 0 → "ADD" button; greater than 0 → the quantity stepper ("Grocery added"). */
  quantity?: number;
  label?: string;
  /** Figma "Show Add Button" boolean — when false, the + icon is hidden. */
  showIcon?: boolean;
  /**
   * Drop the word and keep just the +.
   *
   * For rows too tight to spell ADD out - the header's instant results list,
   * where the control sits beside a product, a shop and a price. The icon then
   * carries the whole meaning, so the button always keeps an aria-label; the
   * quantity stepper it turns into is already icon-only either way.
   */
  iconOnly?: boolean;
  /**
   * Force a visual state. Real hover/press styling is automatic; this is for
   * showing the Default / Active / Hover / Disabled variants (e.g. in the
   * styleguide). To actually disable the control, use `disabled` — that also
   * blocks the click.
   */
  state?: "default" | "active" | "hover" | "disabled";
  /** Greys the button out and stops it responding (also disables the stepper). */
  disabled?: boolean;
  /**
   * What this button adds, e.g. "2% Milk 2 L from Walmart".
   *
   * Goes into the accessible names: "Add 2% Milk 2 L to cart", "Decrease
   * quantity of 2% Milk 2 L". Without it a results list read out eight
   * buttons all called "Add to cart", and a screen reader user had no way to
   * tell which product each one was for.
   */
  itemName?: string;
  /**
   * Gate the action behind login — a logged-out click opens the login dialog
   * instead of firing `onAdd`. Off by default: adding to cart/wishlist and plain
   * navigation stay open to everyone. Opt in on the "move forward" CTAs (the
   * chat's Confirm) so login is required only before proceeding.
   */
  requiresAuth?: boolean;
  onAdd?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  className?: string;
}

export function AddButton({
  quantity = 0,
  label = ADD_LABEL,
  showIcon = true,
  iconOnly = false,
  state = "default",
  disabled = false,
  itemName,
  requiresAuth,
  onAdd,
  onIncrement,
  onDecrement,
  className,
}: AddButtonProps) {
  const { isLoggedIn, promptLogin } = useAuth();
  const gated = requiresAuth ?? false;
  // `disabled` is the real thing; state="disabled" is the styleguide's way of
  // showing the same look without wiring up a dead control.
  const isDisabled = disabled || state === "disabled";

  function handleAdd() {
    // Logged out: send them through the login dialog first — the add itself
    // isn't queued, so they tap ADD again once they're in.
    if (gated && !isLoggedIn) {
      promptLogin();
      return;
    }
    onAdd?.();
  }

  // "Grocery added" — quantity stepper.
  if (quantity > 0) {
    return (
      <div
        className={[styles.stepper, isDisabled ? styles.stepperDisabled : "", className]
          .filter(Boolean)
          .join(" ")}
      >
        <button
          type="button"
          className={styles.stepBtn}
          onClick={onDecrement}
          disabled={isDisabled}
          aria-label={itemName ? `Decrease quantity of ${itemName}` : "Decrease quantity"}
        >
          <MinusCircle className={styles.icon} />
        </button>
        <span className={styles.qty}>{quantity}</span>
        <button
          type="button"
          className={styles.stepBtn}
          onClick={onIncrement}
          disabled={isDisabled}
          aria-label={itemName ? `Increase quantity of ${itemName}` : "Increase quantity"}
        >
          <PlusCircle className={styles.icon} />
        </button>
      </div>
    );
  }

  // "ADD" button.
  const stateClass = isDisabled
    ? styles.stateDisabled
    : state === "active"
      ? styles.stateActive
      : state === "hover"
        ? styles.stateHover
        : "";

  // "ADD" reads as "Add to cart"; a custom label already says what it does.
  // It still starts with "Add", so the visible ADD stays part of the name.
  const accessibleName =
    label === ADD_LABEL ? (itemName ? `Add ${itemName} to cart` : "Add to cart") : label;

  return (
    <button
      type="button"
      className={[
        styles.addBtn,
        iconOnly ? styles.addBtnIconOnly : "",
        stateClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleAdd}
      disabled={isDisabled}
      // Only spell out the bare "ADD" label; for a custom label (Checkout,
      // SHOP, LOGIN…) the visible text is already the accessible name, and
      // hard-coding "Add to cart" would mis-announce the button. With no text
      // at all there is nothing to read, so a name is always supplied.
      aria-label={iconOnly || label === ADD_LABEL ? accessibleName : undefined}
    >
      {(showIcon || iconOnly) && <PlusCircle className={styles.icon} />}
      {!iconOnly && <span className={styles.label}>{label}</span>}
    </button>
  );
}
