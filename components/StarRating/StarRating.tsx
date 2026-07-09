import type { CSSProperties } from "react";
import { Star, type StarVariant } from "@/components/Star/Star";
import styles from "./StarRating.module.css";

/**
 * A row of rating stars. Figma component name: "Star Rating".
 * Give it a `rating` (supports halves, e.g. 4.5) and it fills each star
 * full / half / none accordingly. The Figma "quick" presets (1, 2, 4.5, 5 …)
 * map to this single prop.
 */
export function StarRating({
  rating,
  count = 5,
  size = 10,
  gap = 5,
  className,
}: {
  rating: number;
  count?: number;
  size?: number;
  gap?: number;
  className?: string;
}) {
  const style = { "--star-gap": `${gap}px` } as CSSProperties;

  return (
    <div
      className={[styles.row, className].filter(Boolean).join(" ")}
      style={style}
      role="img"
      aria-label={`Rated ${rating} out of ${count}`}
    >
      {Array.from({ length: count }, (_, i) => {
        const position = i + 1;
        const variant: StarVariant =
          rating >= position ? "full" : rating >= position - 0.5 ? "half" : "none";
        return <Star key={i} variant={variant} size={size} />;
      })}
    </div>
  );
}
