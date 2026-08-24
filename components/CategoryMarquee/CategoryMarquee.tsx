import type { CSSProperties } from "react";
import { CATEGORIES } from "@/data/categories";
import styles from "./CategoryMarquee.module.css";

export interface CategoryMarqueeProps {
  className?: string;
}

/** Copies rendered so the loop is seamless (the shift equals one copy). */
const COPIES = 4;

/**
 * The category strip in the muted "logo cloud" theme: category names scroll
 * continuously on a light band, sit greyed-out, and brighten to their own
 * category colour on hover; the whole strip pauses while hovered. The list is
 * repeated for a seamless loop — duplicate copies are aria-hidden so a screen
 * reader announces each category once.
 *
 * Pure CSS — stays a Server Component. Motion respects reduced-motion.
 */
export function CategoryMarquee({ className }: CategoryMarqueeProps) {
  return (
    <div
      className={[styles.viewport, className].filter(Boolean).join(" ")}
      aria-label="Shop by category"
    >
      <div className={styles.track}>
        {Array.from({ length: COPIES }, (_, copy) =>
          CATEGORIES.map((cat) => (
            <span
              key={`${copy}-${cat.id}`}
              className={styles.item}
              style={{ "--cat-color": `var(${cat.hoverColorVar})` } as CSSProperties}
              aria-hidden={copy > 0 ? true : undefined}
            >
              {cat.label}
            </span>
          )),
        )}
      </div>
    </div>
  );
}
