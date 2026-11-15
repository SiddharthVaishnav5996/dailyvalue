import type { KeyboardEvent } from "react";

/**
 * Arrow keys for a list of choices - a menu or a listbox.
 *
 * Down and Up step through the items and wrap at the ends; Home and End jump
 * to the first and last. A role="menu" or role="listbox" tells a screen
 * reader to expect exactly this, so leaving it out is not a missing extra, it
 * is a broken promise: the keyboard run that found it pressed Down on the
 * milk chooser and nothing happened.
 *
 * Call it from the list's onKeyDown. Returns true when it used the key.
 */
export function moveFocusInList(
  e: KeyboardEvent,
  list: HTMLElement | null,
  itemSelector: string,
): boolean {
  if (!list) return false;

  const items = Array.from(list.querySelectorAll<HTMLElement>(itemSelector));
  if (items.length === 0) return false;

  const at = items.indexOf(document.activeElement as HTMLElement);
  let next: number;

  switch (e.key) {
    case "ArrowDown":
      next = at < 0 ? 0 : (at + 1) % items.length;
      break;
    case "ArrowUp":
      next = at < 0 ? items.length - 1 : (at - 1 + items.length) % items.length;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = items.length - 1;
      break;
    default:
      return false;
  }

  // Without this the arrow keys would also scroll the page or the list.
  e.preventDefault();
  items[next].focus();
  return true;
}
