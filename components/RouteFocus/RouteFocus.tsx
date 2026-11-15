"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/*
 * Where keyboard focus goes after moving to another page.
 * ---------------------------------------------------------------------------
 * A full page load starts focus at the top, which is right. A client-side
 * navigation - pressing Confirm, Order Now, Place Order - swaps the page under
 * a focus that pointed at the button just pressed. That button is gone, so the
 * browser drops focus on <body> and the next Tab starts from the logo again.
 * A keyboard-only run through the shop hit this on every step.
 *
 * So after each navigation, focus moves to the new page's heading, or to its
 * main content when it has none. A screen reader then announces where the
 * shopper has landed, and the next Tab goes into the page rather than back
 * through the header. Shift+Tab still reaches the header.
 *
 * Renders nothing. Lives once, in the root layout.
 */
export function RouteFocus() {
  const pathname = usePathname();
  // Compared rather than "skip the first run": React's development mode runs
  // effects twice on mount, which would otherwise move focus on a fresh load.
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;

    const target =
      document.querySelector<HTMLElement>("main h1") ??
      document.querySelector<HTMLElement>("main");
    if (!target) return;

    // Focusable from code without becoming a Tab stop, and without a ring:
    // it is a landing point, not a control. See [data-route-focus] in
    // app/globals.css.
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.setAttribute("data-route-focus", "");
    // Next.js already scrolls the new page to the top; do not fight it.
    target.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
