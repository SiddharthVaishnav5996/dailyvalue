"use client";

import {
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import styles from "./ResizableSplit.module.css";

export interface ResizableSplitHandle {
  /** Returns the panes to `initialRatio`. */
  reset: () => void;
}

export interface ResizableSplitProps {
  left: ReactNode;
  right: ReactNode;
  /** Starting share of the width given to the left pane, 0–1. */
  initialRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  ref?: Ref<ResizableSplitHandle>;
  className?: string;
}

/** Ratio moved per arrow-key press when the separator has focus. */
const KEY_STEP = 0.02;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Two panes divided by a 15px grab bar that runs the full height of the
 * frame. Dragging it — or focusing it and pressing ←/→ — trades width
 * between the two sides.
 */
export function ResizableSplit({
  left,
  right,
  initialRatio = 0.5,
  minRatio = 0.25,
  maxRatio = 0.75,
  ref,
  className,
}: ResizableSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [ratio, setRatio] = useState(initialRatio);
  const [dragging, setDragging] = useState(false);

  useImperativeHandle(ref, () => ({ reset: () => setRatio(initialRatio) }), [
    initialRatio,
  ]);

  function ratioFromClientX(clientX: number) {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return null;
    return clamp((clientX - rect.left) / rect.width, minRatio, maxRatio);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Pointer capture keeps move/up events coming to the bar even when the
    // cursor outruns it, so no window-level listeners are needed.
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const next = ratioFromClientX(e.clientX);
    if (next !== null) setRatio(next);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    draggingRef.current = false;
    setDragging(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step =
      e.key === "ArrowLeft" ? -KEY_STEP : e.key === "ArrowRight" ? KEY_STEP : 0;
    if (step === 0) return;
    e.preventDefault();
    setRatio((r) => clamp(r + step, minRatio, maxRatio));
  }

  return (
    <div
      ref={containerRef}
      className={[styles.split, dragging ? styles.dragging : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Only the left pane is sized; the right one takes whatever is left, so
          the separator's own 15px never overflows the container. */}
      <div
        className={styles.paneLeft}
        style={{ flexBasis: `calc(${ratio * 100}% - 7.5px)` }}
      >
        {left}
      </div>

      <div
        className={styles.separator}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={Math.round(minRatio * 100)}
        aria-valuemax={Math.round(maxRatio * 100)}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.handle} aria-hidden="true" />
      </div>

      <div className={styles.paneRight}>{right}</div>
    </div>
  );
}
