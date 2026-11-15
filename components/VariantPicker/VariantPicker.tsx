"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import NextImage from "next/image";
import { Check, ChevronDown, Image as ImageIcon } from "lucide-react";
import { Text } from "@/components/Text/Text";
import { formatPrice } from "@/lib/format";
import { useAnchoredPanel } from "@/lib/ui/useAnchoredPanel";
import { moveFocusInList } from "@/lib/ui/moveFocusInList";
import type { VariantFamilyInfo } from "@/lib/types";
import styles from "./VariantPicker.module.css";

/*
 * The choice behind the card.
 * ---------------------------------------------------------------------------
 * Ask for "some milk" and this app gives you a 2% carton. That was always a
 * decision - see data/variants.ts for who made it and when - but until now it
 * was an invisible one, and a shopper only found out at the checkout.
 *
 * This control is the whole fix: it says which kind arrived, and it lets you
 * change it in one press. It does NOT ask a question first. An assistant that
 * asked "which milk?" before showing a price would turn a twelve-item recipe
 * into a five-question quiz, and the cost of that grows with the length of
 * the list - exactly the wrong way round.
 *
 * It is the same bargain the app already makes for shops: pick one, show which
 * one, make switching cheap.
 *
 * WHY THE PANEL IS DRAWN AGAINST THE WINDOW
 *
 * Because the card grid and the details modal both clip their contents, and a
 * menu that is clipped is not merely ugly - it is unclickable. That bug cost
 * this project five of eight shops once already. See lib/ui/useAnchoredPanel.ts,
 * which is where the fix now lives so it only had to be worked out once.
 *
 * AND WHY IT IS PORTALLED OUT OF THE PAGE
 *
 * The trigger sits on the card's brand line, which is a <p>. The panel has a
 * heading of its own, so rendering it where it is written put a <p> inside a
 * <p> - which HTML does not allow, and which React reports as a hydration
 * error the moment the menu opens. The browser silently closes the outer
 * paragraph when it parses that, so the server's HTML and the browser's tree
 * stop matching and React gives up on the whole subtree.
 *
 * A portal moves the panel to <body>, which fixes it at the root rather than
 * by swapping the heading for a <span>: `position: fixed` means the panel is
 * already positioned against the window, so where it LIVES in the document is
 * nothing but a source of bugs like this one. React keeps the click and
 * keyboard handlers wired through the portal, so nothing else changes.
 */

export interface VariantPickerProps {
  family: VariantFamilyInfo;
  /** Called with the chosen member's key. */
  onSelect: (key: string) => void;
  /**
   * The scrolling box this control sits in, when it has one. The panel closes
   * if the button scrolls out of it, rather than hanging over the page
   * pointing at nothing.
   */
  scrollerRef?: React.RefObject<HTMLElement | null>;
  /** "chip" is the compact form for a card; "control" is roomier, for the modal. */
  size?: "chip" | "control";
  className?: string;
}

export function VariantPicker({
  family,
  onSelect,
  scrollerRef,
  size = "chip",
  className,
}: VariantPickerProps) {
  const [open, setOpen] = useState(false);
  const labelId = useId();

  /*
   * KEYBOARD
   *
   * The panel is portalled to the end of <body>, so in Tab order it sits after
   * the footer. A keyboard-only run took 29 presses to reach the first kind of
   * milk, and choosing one dropped focus on <body>. So focus is carried by
   * hand: into the menu when it opens, round it with the arrow keys, and back
   * to this chip when it closes - by Escape, Tab, or a choice.
   */
  const menuRef = useRef<HTMLDivElement | null>(null);
  /** Set when the menu closes with focus inside it, so the chip takes it back. */
  const refocusTrigger = useRef(false);

  // Stable, so the hook's listeners are not torn down and resubscribed on
  // every render of the card this sits on.
  const close = useCallback(() => {
    // Focus inside the menu is about to be removed along with it.
    if (menuRef.current?.contains(document.activeElement)) refocusTrigger.current = true;
    setOpen(false);
  }, []);

  const { anchorRef, panelRef, placement } = useAnchoredPanel<HTMLButtonElement>(
    open,
    close,
    // 288, not the 248 it started at: the apple family has eleven members
    // with names like "Golden Delicious", and at the narrower width the text
    // column was about 80px. Still clamped to the window, so a phone gets
    // whatever room it actually has.
    { minWidth: 288, scrollerRef },
  );

  // The panel needs two refs: the hook's, for outside clicks and placement,
  // and ours, for the focus checks above.
  const setMenuEl = useCallback(
    (el: HTMLDivElement | null) => {
      menuRef.current = el;
      panelRef.current = el;
    },
    [panelRef],
  );

  // Opening focuses the kind already chosen - where the shopper starts from.
  // Once per opening: placement updates on every scroll, and focus that has
  // moved on inside the menu is left where it is.
  useEffect(() => {
    if (!open || !placement) return;
    const menu = menuRef.current;
    if (!menu || menu.contains(document.activeElement)) return;
    const chosen =
      menu.querySelector<HTMLElement>('[aria-checked="true"]') ??
      menu.querySelector<HTMLElement>('[role="menuitemradio"]');
    chosen?.focus();
  }, [open, placement]);

  // Closing with focus inside hands it back to the chip.
  useEffect(() => {
    if (open || !refocusTrigger.current) return;
    refocusTrigger.current = false;
    anchorRef.current?.focus();
  }, [open, anchorRef]);

  const current =
    family.members.find((m) => m.key === family.selected) ?? family.members[0];

  return (
    <>
      <button
        type="button"
        ref={anchorRef}
        className={[
          styles.trigger,
          size === "control" ? styles.triggerControl : styles.triggerChip,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={(e) => {
          // The card underneath opens a details modal when clicked. This
          // button is its own thing, so the press stops here.
          e.stopPropagation();
          setOpen((s) => !s);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${family.label}: ${current.label}. Change it`}
      >
        <Text as="span" variant={size === "control" ? "smallBold" : "xxsmallBold"}>
          {current.label}
        </Text>
        <ChevronDown size={size === "control" ? 16 : 12} aria-hidden="true" />
      </button>

      {open &&
        placement &&
        createPortal(
          <div
            ref={setMenuEl}
            className={styles.panel}
            style={{
              left: placement.left,
              top: placement.top,
              bottom: placement.bottom,
              width: placement.width,
              maxHeight: placement.maxHeight,
            }}
            role="menu"
            aria-labelledby={labelId}
            onKeyDown={(e) => {
              if (moveFocusInList(e, menuRef.current, '[role="menuitemradio"]')) return;
              // Tab leaves a menu rather than walking through it - and walking
              // on from here would land in the footer.
              if (e.key === "Tab") {
                e.preventDefault();
                close();
              }
            }}
          >
            <Text as="p" variant="xxsmallBold" className={styles.heading} id={labelId}>
              {family.label}
            </Text>

            {family.members.map((member) => {
              const chosen = member.key === family.selected;
              // Already ranked best-first by the resolver, so this is the
              // price the card would open on if this member were picked.
              const best = member.product.offers[0];

              return (
                <button
                  type="button"
                  key={member.key}
                  className={[styles.row, chosen ? styles.rowChosen : ""]
                    .filter(Boolean)
                    .join(" ")}
                  role="menuitemradio"
                  aria-checked={chosen}
                  // Reached with the arrow keys, not Tab - see onKeyDown above.
                  tabIndex={-1}
                  onClick={() => {
                    close();
                    // Re-picking what is already showing is a no-op, not a
                    // reason to rebuild the card.
                    if (!chosen) onSelect(member.key);
                  }}
                >
                  <span className={styles.thumb} aria-hidden="true">
                    {member.product.imageSrc ? (
                      <NextImage
                        src={member.product.imageSrc}
                        alt=""
                        fill
                        sizes="40px"
                        className={styles.thumbImg}
                      />
                    ) : (
                      <ImageIcon size={16} strokeWidth={1.5} />
                    )}
                  </span>

                  <span className={styles.info}>
                    <Text as="span" variant="normalRegular" className={styles.label}>
                      {member.label}
                    </Text>
                    {member.note && (
                      <Text as="span" variant="xxsmallRegular" className={styles.note}>
                        {member.note}
                      </Text>
                    )}
                  </span>

                  {best && (
                    <Text as="span" variant="smallBold" className={styles.price}>
                      {formatPrice(best.price)}
                    </Text>
                  )}

                  <span className={styles.tick} aria-hidden="true">
                    {chosen && <Check size={14} strokeWidth={2.5} />}
                  </span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
