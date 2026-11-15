"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { ChevronDown } from "lucide-react";
import { Text } from "@/components/Text/Text";
import { AddButton } from "@/components/AddButton/AddButton";
import { formatPrice } from "@/lib/format";
import { moveFocusInList } from "@/lib/ui/moveFocusInList";
import type { StoreOffer } from "@/data/productPop";
import styles from "./CartLineItem.module.css";

export interface CartLineItemProps {
  name: string;
  /** Partner store label shown under the name, with a dropdown chevron. */
  storeName: string;
  imageSrc?: string;
  imageAlt?: string;
  quantity: number;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onAdd?: () => void;
  /**
   * Price-comparison offers behind the store chevron. When present, the chevron
   * opens a dropdown of the other nearby stores; picking one calls onSelectOffer
   * (the page swaps this line's store + price, which re-totals the cart). Omit to
   * leave the chevron inert.
   */
  storeOffers?: StoreOffer[];
  /**
   * What this line costs at the store currently showing, per single unit.
   * Rendered under the store so the shopper can read a price without opening
   * the comparison dropdown — which was the only place it existed before.
   */
  price?: number;
  /**
   * The catalog unit this price is per: "jar", "bag", "block". Drives the
   * "/jar" suffix. Omit when unknown and the price shows on its own.
   */
  unit?: string;
  /** Id of the currently selected offer (defaults to the first). */
  selectedOfferId?: string;
  onSelectOffer?: (offerId: string) => void;
  className?: string;
}

/**
 * One row of the "My Cart" list: a contained product thumbnail, the name + store
 * dropdown, and the quantity stepper (the shared AddButton in its "added" state).
 * When storeOffers are given, the store label becomes a price-comparison dropdown
 * mirroring the one in ProductPop.
 *
 * The thumbnail column and gap are read from `--cart-thumb` / `--cart-gap` so the
 * list header ("My Cart" / "Edit") can pad to the same edges — see the checkout
 * page CSS.
 */
export function CartLineItem({
  name,
  storeName,
  imageSrc,
  imageAlt,
  quantity,
  onIncrement,
  onDecrement,
  onAdd,
  storeOffers,
  price,
  unit,
  selectedOfferId,
  onSelectOffer,
  className,
}: CartLineItemProps) {
  const [open, setOpen] = useState(false);
  const storeBtnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keyboard: opening focuses the first shop, and closing - by a pick or by
  // Escape - hands focus back to the store button instead of letting it fall
  // to <body> with the row that had it.
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>('[role="option"]')?.focus();
  }, [open]);

  function closeList() {
    setOpen(false);
    storeBtnRef.current?.focus();
  }

  /*
   * "$4.99/jar", or "$2.09 each" when the unit is the catalog's "each" — by
   * far its most common value (618 products), and "/each" does not read as
   * English. No unit at all (a generated or curated line) shows the bare
   * price rather than inventing one.
   */
  const perUnit = !unit ? "" : unit === "each" ? " each" : `/${unit}`;

  const offers = storeOffers ?? [];
  const hasOffers = offers.length > 0;
  const selected = offers.find((o) => o.id === selectedOfferId) ?? offers[0];
  // The other stores to switch to — the selected one already shows as the label.
  const alternatives = selected ? offers.filter((o) => o.id !== selected.id) : [];

  return (
    <div className={[styles.row, className].filter(Boolean).join(" ")}>
      <div className={styles.thumb}>
        {imageSrc && (
          <NextImage
            src={imageSrc}
            alt={imageAlt ?? name}
            fill
            sizes="72px"
            className={styles.thumbImg}
          />
        )}
      </div>

      <div className={styles.meta}>
        <Text as="p" variant="mediumRegular" className={styles.name}>
          {name}
        </Text>

        <div className={styles.storeWrap}>
          <button
            type="button"
            ref={storeBtnRef}
            className={styles.storeBtn}
            onClick={() => hasOffers && setOpen((o) => !o)}
            aria-haspopup={hasOffers ? "listbox" : undefined}
            aria-expanded={hasOffers ? open : undefined}
            // Names the product, because a cart has one of these per line,
            // and keeps the shop (the visible text) inside the name.
            aria-label={hasOffers ? `Change store for ${name}, now ${storeName}` : undefined}
          >
            <Text as="span" variant="normalRegular" className={styles.storeName}>
              {storeName}
            </Text>
            <ChevronDown
              size={16}
              strokeWidth={2}
              className={styles.storeChevron}
              aria-hidden="true"
            />
          </button>

          {hasOffers && open && (
            <>
              {/* Transparent full-screen catcher for outside clicks. */}
              <div
                className={styles.catcher}
                onClick={() => setOpen(false)}
                role="presentation"
              />
              <div
                ref={listRef}
                className={styles.dropdown}
                role="listbox"
                aria-label={`Other stores for ${name}`}
                onKeyDown={(e) => {
                  if (moveFocusInList(e, listRef.current, '[role="option"]')) return;
                  if (e.key === "Escape") {
                    e.preventDefault();
                    closeList();
                  }
                }}
              >
                {alternatives.map((o) => (
                  <button
                    type="button"
                    key={o.id}
                    className={styles.offerRow}
                    onClick={() => {
                      onSelectOffer?.(o.id);
                      closeList();
                    }}
                    role="option"
                    aria-selected={false}
                  >
                    <span className={styles.offerLogo} aria-hidden="true">
                      {o.storeLogoSrc && (
                        // eslint-disable-next-line @next/next/no-img-element -- store logos are arbitrary assets
                        <img src={o.storeLogoSrc} alt="" className={styles.offerLogoImg} />
                      )}
                    </span>
                    <span className={styles.offerInfo}>
                      <Text as="span" variant="normalRegular" className={styles.offerStore}>
                        {o.storeName}
                      </Text>
                      <Text as="span" variant="xxsmallRegular" className={styles.offerDistance}>
                        {o.storeDistanceKm.toFixed(1)} km away
                      </Text>
                      {o.promo && (
                        <Text as="span" variant="xsmallBold" className={styles.offerPromo}>
                          {o.promo}
                        </Text>
                      )}
                    </span>
                    <Text as="span" variant="normalBold" className={styles.offerPrice}>
                      {formatPrice(o.price)}
                    </Text>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {price !== undefined && (
          <Text as="p" variant="smallBold" className={styles.price}>
            {formatPrice(price)}
            {perUnit}
          </Text>
        )}
      </div>

      <AddButton
        itemName={name}
        quantity={quantity}
        onAdd={onAdd}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        className={styles.stepper}
      />
    </div>
  );
}
