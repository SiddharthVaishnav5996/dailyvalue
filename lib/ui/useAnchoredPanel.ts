"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/*
 * A small panel that hangs off a button without being clipped by it.
 * ---------------------------------------------------------------------------
 * This is the lesson from the price-comparison dropdown in ProductPop, written
 * down once so the next menu does not have to learn it again.
 *
 * WHAT GOES WRONG WITHOUT IT
 *
 * A dropdown positioned the obvious way - `position: absolute` inside the
 * button's own box - is clipped by the first ancestor with `overflow: hidden`.
 * The modal has one. In a laptop window that hid five of the eight shops
 * outright: they were in the page, they were in the accessibility tree, and no
 * click could ever reach them, because anything past an `overflow: hidden`
 * edge is neither painted nor hit-testable.
 *
 * HOW THIS FIXES IT
 *
 * The panel is drawn against the VIEWPORT (`position: fixed`), which steps
 * outside every clip on the way up. The price of that is that nothing
 * positions it for you any more, so this hook measures the button by hand and
 * hands back coordinates.
 *
 * AND THE PRICE OF THE PRICE
 *
 * A fixed panel does not move when an ancestor scrolls - it would sit there,
 * pointing at nothing, while its button slid away. So scrolling re-measures,
 * and a button that scrolls out of its own scroller closes the panel, which is
 * what every menu on every platform does.
 */

/**
 * Below this many pixels, the space under the button cannot hold a menu worth
 * showing - roughly two rows - and flipping upwards is worth the jump.
 */
const MIN_USABLE = 150;

/** A panel never grows past this; the rest of the list scrolls inside it. */
const MAX_HEIGHT = 360;

/** Where to draw the panel, in viewport coordinates. */
export interface PanelPlacement {
  left: number;
  /** Exactly one of top / bottom is set - bottom when it opens upwards. */
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
}

export interface AnchoredPanelOptions {
  /** The panel is at least this wide, whatever the button measures. */
  minWidth?: number;
  /** Gap between the button and the panel, in px. */
  gap?: number;
  /** Never come closer than this to the window edge, in px. */
  edge?: number;
  /**
   * The scroller the button lives in. When the button scrolls out of it the
   * panel closes, because it is now pointing at something nobody can see.
   */
  scrollerRef?: React.RefObject<HTMLElement | null>;
}

/** Two measurements that would draw the panel in exactly the same place. */
function samePlacement(a: PanelPlacement | null, b: PanelPlacement): boolean {
  return (
    a !== null &&
    a.left === b.left &&
    a.top === b.top &&
    a.bottom === b.bottom &&
    a.width === b.width &&
    a.maxHeight === b.maxHeight
  );
}

export function useAnchoredPanel<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
  { minWidth = 0, gap = 8, edge = 12, scrollerRef }: AnchoredPanelOptions = {},
) {
  const anchorRef = useRef<T | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<PanelPlacement | null>(null);

  /*
   * `onClose` through a ref, and this is not a style preference.
   *
   * Callers write `onClose={() => setOpen(false)}`, which is a brand new
   * function on every render. Listing it in the dependencies below made
   * `place` new on every render too, which made the layout effect run on every
   * render, which called `place`, which set state, which caused a render.
   * React stopped it with "Maximum update depth exceeded" and the menu never
   * opened at all.
   *
   * A ref holds the latest callback without being part of any dependency
   * list, so `place` is created once and the loop cannot start.
   */
  const onCloseRef = useRef(onClose);
  // Assigned in an effect, not during render: a render must not have side
  // effects, and React's linter enforces it. Being one render behind cannot
  // matter here - every caller's close function does nothing but call a
  // setState, and setState functions are stable for the life of a component.
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const box = anchor.getBoundingClientRect();

    // Has the anchor scrolled out of view inside its own scroller?
    //
    // A zero-height scroller has not been laid out yet - during the open, or
    // in a hidden tab - and measuring against it would close the panel the
    // instant it opened. So skip the check until there is something to measure.
    const scroller = scrollerRef?.current;
    if (scroller) {
      const view = scroller.getBoundingClientRect();
      const middle = box.top + box.height / 2;
      if (view.height > 0 && (middle < view.top || middle > view.bottom)) {
        onCloseRef.current();
        return;
      }
    }

    const width = Math.min(
      Math.max(box.width, minWidth),
      window.innerWidth - edge * 2,
    );

    // Keep the panel on screen horizontally. It prefers to line up with the
    // button's left edge and gives that up rather than hang off the window.
    const left = Math.max(edge, Math.min(box.left, window.innerWidth - width - edge));

    const roomBelow = window.innerHeight - box.bottom - gap - edge;
    const roomAbove = box.top - gap - edge;

    /*
     * Hang below the button unless that is genuinely unusable.
     *
     * This used to flip whenever there were fewer than 220px below, which
     * sounds cautious and behaved badly: the flavour chooser in the details
     * pop-up had 178px underneath it - room for three scrolling rows, which
     * is a perfectly good menu - and instead flew upwards, grew to 416px and
     * came out of the top of the modal, over the product photograph, nowhere
     * near the button it belonged to.
     *
     * A menu that leaves its own button is worse than a menu that scrolls. So
     * flipping now needs below to be too small for even a couple of rows AND
     * above to be clearly roomier, not merely roomier by a pixel.
     */
    const flip = roomBelow < MIN_USABLE && roomAbove > roomBelow * 1.4;

    // Capped, so a long list reads as a menu rather than a column running the
    // height of the window. Anything past the cap scrolls inside the panel -
    // the same bargain the price comparison makes with eight shops.
    const room = Math.min(flip ? roomAbove : roomBelow, MAX_HEIGHT);

    const next: PanelPlacement = {
      left,
      width,
      ...(flip
        ? { bottom: window.innerHeight - box.top + gap, maxHeight: room }
        : { top: box.bottom + gap, maxHeight: room }),
    };

    // Only publish a measurement that actually differs. This runs on every
    // scroll and resize event, and handing React a new object each time would
    // re-render the whole panel for coordinates that have not moved.
    setPlacement((current) => (samePlacement(current, next) ? current : next));
  }, [edge, gap, minWidth, scrollerRef]);

  // Measure before the browser paints, so the panel never appears in the
  // wrong place for one frame and then jumps.
  //
  // Closing deliberately leaves the last measurement behind instead of
  // clearing it. Clearing would be a setState in an effect that nothing is
  // waiting for, and it would buy nothing: the caller renders the panel only
  // while `open`, and the next open re-measures here, before paint. So a
  // stale number can never reach the screen.
  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  // Follow the button while the page moves under it.
  //
  // Scroll is listened for in the CAPTURE phase, because scroll events do not
  // bubble: without it, a scroll inside the modal would never be heard out
  // here and the panel would drift away from its button.
  useEffect(() => {
    if (!open) return;

    const onScroll = () => place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, place]);

  // Close on a press anywhere else, and on Escape.
  //
  // `pointerdown` rather than `click`: a press that starts outside should
  // dismiss the panel even if the finger lifts somewhere else entirely. The
  // listener deliberately ignores presses on the button itself, which has its
  // own toggle and would otherwise close and reopen in the same gesture.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onCloseRef.current();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
    // Only `open`: both handlers reach the caller through onCloseRef, so they
    // are subscribed once per opening rather than once per render.
  }, [open]);

  return { anchorRef, panelRef, placement };
}
