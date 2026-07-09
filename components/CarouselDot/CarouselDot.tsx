import styles from "./CarouselDot.module.css";

/**
 * A single carousel pagination dot. Figma component: "Carousel swipe".
 * Selected = active pill that "moves with" the swipe; Non-selected = circle.
 */
export function CarouselDot({
  selected = false,
  className,
}: {
  selected?: boolean;
  className?: string;
}) {
  return (
    <span
      className={[styles.dot, selected ? styles.selected : styles.unselected, className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    />
  );
}
