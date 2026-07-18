"use client";

import { useRef } from "react";
import { CategorySelector } from "@/components/CategorySelector/CategorySelector";
import { CATEGORIES } from "@/data/categories";
import styles from "./CategoryMarquee.module.css";

export interface CategoryMarqueeProps {
  onSelect?: (categoryId: string) => void;
  className?: string;
}

/**
 * How many identical copies of the category list the track holds. The scroll
 * shifts by exactly one copy (-100%/COPIES, see the @keyframes in the CSS), and
 * the remaining copies keep the strip fully covered so the loop never shows a
 * gap. 4 covers viewports up to ~3× one copy width. Keep in sync with the
 * `translateX(-25%)` keyframe.
 */
const COPIES = 4;

/**
 * The category selector strip. It scrolls continuously right → left. When the
 * cursor enters, it stops and glides back to its original start position; when
 * the cursor leaves, the loop resumes from the start.
 */
export function CategoryMarquee({ onSelect, className }: CategoryMarqueeProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Cursor enters: freeze wherever it is, then transition back to the start.
  function handleEnter() {
    const el = trackRef.current;
    if (!el) return;
    const current = getComputedStyle(el).transform;
    // Pin the current position inline and drop the animation so the transform
    // becomes transitionable (an active animation would override it).
    el.style.animation = "none";
    el.style.transform = current === "none" ? "translateX(0)" : current;
    // Next frame: glide from the frozen spot back to the origin.
    requestAnimationFrame(() => {
      el.style.transition = "transform var(--marquee-return) ease";
      el.style.transform = "translateX(0)";
    });
  }

  // Cursor leaves: clear the inline overrides so the CSS animation runs again
  // from 0% (which is translateX(0) — where we just returned to).
  function handleLeave() {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.transform = "";
    el.style.animation = "";
  }

  return (
    <div
      className={[styles.viewport, className].filter(Boolean).join(" ")}
      aria-label="Shop by category"
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
    >
      <div className={styles.track} ref={trackRef}>
        {Array.from({ length: COPIES }, (_, copy) =>
          CATEGORIES.map((cat) => (
            <div
              key={`${copy}-${cat.id}`}
              className={styles.item}
              // Only the first copy is "real"; the rest exist for the seamless
              // loop, so keep them out of the tab order / accessibility tree.
              inert={copy > 0}
            >
              <CategorySelector
                label={cat.label}
                hoverColorVar={cat.hoverColorVar}
                onClick={onSelect ? () => onSelect(cat.id) : undefined}
              />
            </div>
          )),
        )}
      </div>
    </div>
  );
}
