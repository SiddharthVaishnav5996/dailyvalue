import type { CSSProperties } from "react";
import styles from "./CategorySelector.module.css";

export interface CategorySelectorProps {
  label: string;
  /** CSS var name (e.g. "--color-category-dairy") shown as the hover fill. */
  hoverColorVar: string;
  onClick?: () => void;
  className?: string;
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
}: CategorySelectorProps) {
  return (
    <button
      type="button"
      className={[styles.chip, className].filter(Boolean).join(" ")}
      style={{ "--hover-bg": `var(${hoverColorVar})` } as CSSProperties}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
