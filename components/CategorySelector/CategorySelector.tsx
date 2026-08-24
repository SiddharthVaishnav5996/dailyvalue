import type { CSSProperties } from "react";
import styles from "./CategorySelector.module.css";

export interface CategorySelectorProps {
  label: string;
  /** CSS var name (e.g. "--color-category-dairy") shown as the hover fill. */
  hoverColorVar: string;
  onClick?: () => void;
  className?: string;
  /**
   * A purely visual copy (e.g. a marquee's loop duplicates). Still fills on
   * hover, but is taken out of the tab order and hidden from assistive tech so
   * the same chip isn't announced or tabbed to multiple times.
   */
  decorative?: boolean;
}

/**
 * A single category chip. Transparent by default; fills with its category
 * color on hover. Width/height are intrinsic (padding + text), not fixed,
 * so it stays correct as labels change or new categories are added.
 */
export function CategorySelector({
  label,
  hoverColorVar,
  onClick,
  className,
  decorative = false,
}: CategorySelectorProps) {
  return (
    <button
      type="button"
      className={[styles.chip, className].filter(Boolean).join(" ")}
      style={{ "--hover-bg": `var(${hoverColorVar})` } as CSSProperties}
      onClick={onClick}
      tabIndex={decorative ? -1 : undefined}
      aria-hidden={decorative || undefined}
    >
      {label}
    </button>
  );
}
