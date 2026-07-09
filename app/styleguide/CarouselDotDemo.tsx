"use client";

import { useState } from "react";
import { CarouselDot } from "@/components/CarouselDot/CarouselDot";
import styles from "./styleguide.module.css";

export function CarouselDotDemo() {
  const [active, setActive] = useState(0);
  const count = 5;

  return (
    <div className={styles.dotRow} role="tablist" aria-label="Carousel demo">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          className={styles.dotButton}
          role="tab"
          aria-selected={i === active}
          aria-label={`Go to slide ${i + 1}`}
          onClick={() => setActive(i)}
        >
          <CarouselDot selected={i === active} />
        </button>
      ))}
    </div>
  );
}
