"use client";

import { useEffect, type RefObject } from "react";

/*
 * Where keyboard focus goes when a pop-up opens and closes.
 * ---------------------------------------------------------------------------
 * Found by a keyboard-only run through the whole shop (November 2026). Every
 * pop-up already closed on Escape, but none of them moved focus. So:
 *
 *   - Opening the login dialog left focus on the Confirm button BEHIND it.
 *     The next Tab walked into the dialog by luck of the DOM order, and the
 *     one after that walked straight back out into the page underneath.
 *   - Opening a product's details left focus on the card. The dialog is
 *     portaled to the end of <body>, so reaching its first button took 27
 *     presses, every one of them landing on a control hidden under the
 *     backdrop - where Enter could quietly change the basket.
 *   - Closing either one dropped focus on <body>, so the next Tab started
 *     again from the logo.
 *
 * Three pop-ups, one cause, so one fix that all of them share:
 *
 *   OPEN    focus moves into the pop-up. To the pop-up itself rather than its
 *           first control: a screen reader announces the dialog's name, and
 *           nothing gets pressed by accident. (It also keeps the login's
 *           phone placeholder visible, which focusing the field would hide.)
 *   WHILE   for a modal, Tab and Shift+Tab wrap around inside it. The page
 *           underneath is covered, so it should not be reachable either.
 *   CLOSE   focus goes back to whatever opened it, so the shopper carries on
 *           from where they were.
 */

/** Everything Tab can land on. */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** The controls inside `container` that Tab can reach, in order. */
function tabbableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    // No boxes means display:none somewhere up the tree - not reachable.
    (el) => el.getClientRects().length > 0,
  );
}

export interface DialogFocusOptions {
  /**
   * Keep Tab inside the pop-up. On for modal dialogs, which cover the page.
   * Off for a dropdown panel like the cart, which sits beside the page and
   * should let the shopper tab on past it.
   */
  trap?: boolean;
}

/**
 * Move focus into a pop-up while it is open, and back out when it closes.
 *
 * Call it from the component that renders the pop-up, with a ref to the
 * element carrying role="dialog". The pop-up must be mounted only while open:
 * mounting is the "open" and unmounting is the "close".
 */
export function useDialogFocus(
  containerRef: RefObject<HTMLElement | null>,
  { trap = true }: DialogFocusOptions = {},
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Whatever had focus a moment ago is what opened this. <body> means
    // nothing did - a click on an element that cannot take focus, like a
    // product card - and there is nowhere useful to come back to.
    const before = document.activeElement;
    const opener =
      before instanceof HTMLElement && before !== document.body ? before : null;

    if (!container.contains(document.activeElement)) {
      // tabindex -1: focusable from code, never a Tab stop of its own.
      if (!container.hasAttribute("tabindex")) container.setAttribute("tabindex", "-1");
      container.focus({ preventScroll: true });
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!trap || e.key !== "Tab" || e.defaultPrevented) return;

      const active = document.activeElement;
      // Focus can fall to <body> while the pop-up is open, when the control
      // that had it is removed - a store row that moves once it is picked.
      const lost = !active || active === document.body;
      // Focus somewhere else entirely is not ours to move. That is how a menu
      // this dialog opened, but drew at the end of <body>, gets to handle its
      // own Tab key.
      if (!lost && !container!.contains(active)) return;

      const items = tabbableIn(container!);
      if (items.length === 0) {
        e.preventDefault();
        container!.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (lost) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && (active === first || active === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);

      // Only hand focus back if it is still ours to give. When the pop-up
      // closed because the shopper tabbed away from a non-modal panel, focus
      // is already on the next thing and should stay there. When it closed
      // with focus inside it, the focused element has just been removed and
      // the browser has dropped focus on <body>.
      const now = document.activeElement;
      const ours = !now || now === document.body || container.contains(now);
      if (ours && opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [containerRef, trap]);
}
