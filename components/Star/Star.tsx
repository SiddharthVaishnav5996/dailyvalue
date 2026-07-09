import type { CSSProperties } from "react";
import styles from "./Star.module.css";

const STAR_PATH =
  "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

/** Figma "Style" property: Full Star / Half Star / No Star. */
export type StarVariant = "full" | "half" | "none";

/**
 * A single rating star. Figma component name: "Rating".
 * Size defaults to the Figma 10px; override via `size`.
 */
export function Star({
  variant = "full",
  size = 10,
  className,
}: {
  variant?: StarVariant;
  size?: number;
  className?: string;
}) {
  const style = { "--star-size": `${size}px` } as CSSProperties;

  // Half star = grey outline underneath + filled star clipped to the left half.
  if (variant === "half") {
    return (
      <span
        className={[styles.star, styles.half, className].filter(Boolean).join(" ")}
        style={style}
        aria-hidden="true"
      >
        <svg className={styles.base} viewBox="0 0 24 24">
          <path d={STAR_PATH} />
        </svg>
        <svg className={styles.fill} viewBox="0 0 24 24">
          <path d={STAR_PATH} />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={[
        styles.star,
        variant === "full" ? styles.full : styles.empty,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24">
        <path d={STAR_PATH} />
      </svg>
    </span>
  );
}
