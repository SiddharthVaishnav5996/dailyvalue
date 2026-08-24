import styles from "./AddButton.module.css";

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
   * Force a visual state. Real hover/press styling is automatic; this is for
   * showing the Default / Active / Hover variants (e.g. in the styleguide).
   */
  state?: "default" | "active" | "hover";
  onAdd?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  className?: string;
}

export function AddButton({
  quantity = 0,
  label = "ADD",
  showIcon = true,
  state = "default",
  onAdd,
  onIncrement,
  onDecrement,
  className,
}: AddButtonProps) {
  // "Grocery added" — quantity stepper.
  if (quantity > 0) {
    return (
      <div className={[styles.stepper, className].filter(Boolean).join(" ")}>
        <button
          type="button"
          className={styles.stepBtn}
          onClick={onDecrement}
          aria-label="Decrease quantity"
        >
          <MinusCircle className={styles.icon} />
        </button>
        <span className={styles.qty}>{quantity}</span>
        <button
          type="button"
          className={styles.stepBtn}
          onClick={onIncrement}
          aria-label="Increase quantity"
        >
          <PlusCircle className={styles.icon} />
        </button>
      </div>
    );
  }

  // "ADD" button.
  const stateClass =
    state === "active"
      ? styles.stateActive
      : state === "hover"
        ? styles.stateHover
        : "";

  return (
    <button
      type="button"
      className={[styles.addBtn, stateClass, className].filter(Boolean).join(" ")}
      onClick={onAdd}
      // Only spell out the bare "ADD" label; for a custom label (Checkout,
      // SHOP, LOGIN…) the visible text is already the accessible name, and
      // hard-coding "Add to cart" would mis-announce the button.
      aria-label={label === "ADD" ? "Add to cart" : undefined}
    >
      {showIcon && <PlusCircle className={styles.icon} />}
      <span className={styles.label}>{label}</span>
    </button>
  );
}
