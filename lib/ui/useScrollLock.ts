"use client";

import { useEffect } from "react";

/*
 * Stop the page scrolling while something is open on top of it.
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT ONE LINE
 *
 * The obvious version is `document.body.style.overflow = "hidden"`, and it is
 * what this project used to do. It quietly did nothing.
 *
 * A browser does not scroll the <body>. It scrolls the VIEWPORT, and it takes
 * the viewport's overflow setting from the <html> element. There is one
 * exception, and it is the reason the one-liner is so widely believed: when
 * <html> has no overflow of its own, the browser reads <body>'s instead.
 *
 * app/globals.css sets `html, body { overflow-x: hidden }` to stop sideways
 * scrolling. That gives <html> an overflow of its own - so the exception no
 * longer applies, and hiding <body>'s overflow stops meaning anything to the
 * viewport. Modals opened, and the page behind them kept scrolling.
 *
 * So the lock goes on <html>, which is the element that is actually scrolling.
 *
 * TWO DETAILS THAT MATTER
 *
 * 1. Hiding the overflow removes the scrollbar, and on Windows the scrollbar
 *    takes up real width - so the page would get about 15px wider and every
 *    centred thing on it would jump sideways. Measuring that width and adding
 *    it back as padding keeps everything exactly where it was.
 *
 * 2. Two overlapping things can be open at once. If each one locked and
 *    unlocked on its own, closing the first would unlock the page while the
 *    second was still open. So the locks are counted: the first one locks, and
 *    only the last one to close unlocks.
 *
 * Note for later: anything `position: fixed` and full-width - the header, for
 * one - is measured against the viewport rather than the page, so it still
 * widens by the scrollbar while the lock is on. It sits behind the backdrop in
 * every case today, so it is not visible. Fixing it properly means publishing
 * the measured width as a custom property and padding those elements too.
 */

/** How many things are currently asking for the page to stay still. */
let lockCount = 0;
/** Puts back exactly what was there before the first lock. */
let release: (() => void) | null = null;

function lock(): void {
  lockCount += 1;
  if (lockCount > 1) return; // already locked by someone else

  const root = document.documentElement;

  // innerWidth counts the scrollbar; clientWidth does not. The difference is
  // the scrollbar, and it is 0 on phones and on overlay-scrollbar systems.
  const scrollbarWidth = window.innerWidth - root.clientWidth;

  const previousOverflow = root.style.overflow;
  const previousPadding = root.style.paddingRight;

  root.style.overflow = "hidden";
  if (scrollbarWidth > 0) root.style.paddingRight = `${scrollbarWidth}px`;

  release = () => {
    root.style.overflow = previousOverflow;
    root.style.paddingRight = previousPadding;
  };
}

function unlock(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return; // something else still needs it

  release?.();
  release = null;
}

/**
 * Freeze the page behind a modal for as long as this component is mounted.
 *
 * Pass `false` to opt out - for a component that is always mounted and only
 * sometimes covering the page.
 */
export function useScrollLock(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;
    lock();
    return unlock;
  }, [enabled]);
}
