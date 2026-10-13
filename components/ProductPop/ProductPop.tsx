"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { ChevronDown, Image as ImageIcon, Star, X } from "lucide-react";
import { Text } from "@/components/Text/Text";
import { StoreName } from "@/components/StoreName/StoreName";
import { ProductCard } from "@/components/ProductCard/ProductCard";
import { formatPrice } from "@/lib/format";
import { useScrollLock } from "@/lib/ui/useScrollLock";
import type { ProductPopData } from "@/data/productPop";
import styles from "./ProductPop.module.css";

export interface ProductPopProps {
  pop: ProductPopData;
  /** Currently selected store offer id (defaults to the first offer). */
  selectedOfferId?: string;
  onSelectOffer?: (offerId: string) => void;
  /** Does the shopper always buy this brand? */
  isPreferredBrand?: (brand: string | undefined) => boolean;
  /** Mark a brand as one they always buy, or stop. */
  onToggleBrand?: (brand: string) => void;
  /** Quantities of the related items (a separate cart bucket from the table). */
  quantities: Record<string, number>;
  onAdd: (id: string) => void;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onClose: () => void;
}

/**
 * Product-pop — the details modal opened from a product card's chevron. Shows
 * the product image, its name and the price at the selected store, then a grid
 * of alternatives (3 per row) whose ADD buttons drop into the cart.
 *
 * The price is a dropdown: its chevron opens a price-comparison across the other
 * nearby stores. Picking one there selects it — the header, the Page-3 card and
 * its price all switch to that store, and the previously-selected store rejoins
 * the comparison list. Closes on the backdrop, the ×, or Escape (which shuts the
 * comparison first if it's open); body scroll is locked while open.
 */
/**
 * Where the price comparison is drawn, in viewport coordinates.
 *
 * Exactly one of top / bottom is set: top when the list hangs below the price
 * button, bottom when there is no room and it opens upwards instead.
 */
interface ComparePlacement {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
}

export function ProductPop({
  pop,
  selectedOfferId,
  onSelectOffer,
  isPreferredBrand,
  onToggleBrand,
  quantities,
  onAdd,
  onIncrement,
  onDecrement,
  onClose,
}: ProductPopProps) {
  const [showCompare, setShowCompare] = useState(false);
  const [placement, setPlacement] = useState<ComparePlacement | null>(null);

  const priceButtonRef = useRef<HTMLButtonElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  /** Did the press that is currently underway begin on the backdrop? */
  const pressedBackdrop = useRef(false);

  const offers = pop.storeOffers;
  const favourite = (brand: string | undefined) =>
    isPreferredBrand ? isPreferredBrand(brand) : false;
  const selected = offers.find((o) => o.id === selectedOfferId) ?? offers[0];
  const alternatives = offers.filter((o) => o.id !== selected.id);

  // Freeze the page behind the modal. See lib/ui/useScrollLock.ts - hiding
  // <body>'s overflow, which is what this used to do, does nothing on this
  // site, and the page kept scrolling underneath.
  useScrollLock();

  /**
   * Work out where the comparison list should sit.
   *
   * It is drawn against the window rather than tucked under the button,
   * because the modal clips anything that runs past its own edge. In a laptop
   * window that hid five of the eight shops outright - they were in the page,
   * but no click could ever reach them. Viewport coordinates step outside the
   * clip; the price of that is measuring the position by hand.
   */
  const placeCompare = useCallback(() => {
    const button = priceButtonRef.current;
    if (!button) return;

    const box = button.getBoundingClientRect();

    // The list floats free of the modal now, so it has to be told when its
    // anchor has gone: scroll the price button out of sight and a list still
    // hanging there points at nothing. Closing is what every menu does.
    const scroller = scrollerRef.current;
    if (scroller) {
      const view = scroller.getBoundingClientRect();
      // A zero-height box has not been laid out yet - during the open, or in a
      // hidden tab. Measuring against it would close the list the instant it
      // opened, so skip the check until there is something to measure.
      const middle = box.top + box.height / 2;
      if (view.height > 0 && (middle < view.top || middle > view.bottom)) {
        setShowCompare(false);
        return;
      }
    }

    const GAP = 8; // between the button and the list
    const EDGE = 12; // never right up against the window edge

    const width = Math.min(380, window.innerWidth * 0.78);
    // Line its right edge up with the button, then pull it back inside the
    // window if that would push it off the side.
    const left = Math.min(
      Math.max(EDGE, box.right - width),
      window.innerWidth - width - EDGE,
    );

    const roomBelow = window.innerHeight - box.bottom - GAP - EDGE;
    const roomAbove = box.top - GAP - EDGE;
    // Below, unless it would be cramped there and there is more room above.
    const upwards = roomBelow < 220 && roomAbove > roomBelow;

    setPlacement({
      left,
      top: upwards ? undefined : box.bottom + GAP,
      bottom: upwards ? window.innerHeight - box.top + GAP : undefined,
      width,
      maxHeight: Math.max(160, upwards ? roomAbove : roomBelow),
    });
  }, []);

  // Keep the list glued to the button while the modal scrolls or the window is
  // resized. The scroll listener is in the CAPTURE phase, because scroll events
  // do not bubble and the thing that moves is the modal own scroller.
  //
  // useLayoutEffect, so the position is settled before the first paint - with a
  // plain effect the list would flash in the top-left corner first.
  useLayoutEffect(() => {
    if (!showCompare) return;
    placeCompare();
    window.addEventListener("resize", placeCompare);
    document.addEventListener("scroll", placeCompare, true);
    return () => {
      window.removeEventListener("resize", placeCompare);
      document.removeEventListener("scroll", placeCompare, true);
    };
  }, [showCompare, placeCompare]);

  // Press anywhere else and the list closes.
  //
  // This replaces a transparent full-screen <div> that used to sit over the
  // page to catch those presses. Being position:fixed, that div belonged to the
  // window rather than to the modal, so a wheel over it scrolled the PAGE
  // instead of the modal - which is exactly how it looked from the outside:
  // scrolling worked over the list, and nowhere else.
  useEffect(() => {
    if (!showCompare) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (compareRef.current?.contains(target)) return;
      if (priceButtonRef.current?.contains(target)) return; // the button toggles itself
      setShowCompare(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showCompare]);

  // Escape closes the price comparison first (if open), otherwise the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showCompare) setShowCompare(false);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, showCompare]);

  return (
    <div
      className={styles.backdrop}
      // The backdrop closes the modal, but only when the WHOLE press happened
      // on it. Checking the click alone is not enough: press inside the modal,
      // release out here - dragging across text, or on a row that moved under
      // the pointer - and the browser reports that as a click on the nearest
      // ancestor the two have in common, which is the backdrop. The modal then
      // shuts on a gesture that was never meant to close it.
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedBackdrop.current) onClose();
      }}
      role="presentation"
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`${pop.brand} ${pop.name}`}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <X size={22} aria-hidden="true" />
        </button>

        <div className={styles.scroll} ref={scrollerRef}>
          {/* 1. Product image */}
          <div className={styles.hero}>
            {selected.imageSrc || pop.imageSrc ? (
              <NextImage
                src={selected.imageSrc ?? pop.imageSrc!}
                alt={pop.imageAlt ?? pop.name}
                fill
                sizes="(max-width: 900px) 90vw, 800px"
                className={styles.heroImg}
              />
            ) : (
              <div className={styles.heroPlaceholder}>
                <ImageIcon size={48} strokeWidth={1.5} aria-hidden="true" />
              </div>
            )}
          </div>

          {/* 2. Description + price, then the Product Details toggle */}
          <div className={styles.details}>
            <div className={styles.headRow}>
              <div className={styles.desc}>
                <Text as="p" variant="largeBold" className={styles.brand}>
                  {/* The selected shop's own brand wins over the product's
                      general one: at Costco this tub really is Kirkland. */}
                  {selected.brand || pop.brand}
                </Text>
                <Text as="h2" variant="heading5" className={styles.name}>
                  {pop.name}
                </Text>
                {pop.points && (
                  <Text as="p" variant="smallBold" className={styles.points}>
                    {pop.points}
                  </Text>
                )}
                <StoreName
                  name={selected.storeName}
                  distanceKm={selected.storeDistanceKm}
                  logoSrc={selected.storeLogoSrc}
                  nameVariant="smallBold"
                />

                {/* Brand loyalty, in one press. Marking a brand here makes
                    every later search open on it wherever it is sold, instead
                    of on whatever happens to be cheapest. */}
                {selected.brand && onToggleBrand && (
                  <button
                    type="button"
                    className={[
                      styles.brandPrefer,
                      favourite(selected.brand) ? styles.brandPreferOn : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => onToggleBrand(selected.brand!)}
                    aria-pressed={favourite(selected.brand)}
                  >
                    <Star
                      size={14}
                      aria-hidden="true"
                      fill={favourite(selected.brand) ? "currentColor" : "none"}
                    />
                    <Text as="span" variant="xsmallBold">
                      {favourite(selected.brand)
                        ? "A brand you always buy"
                        : `Always buy ${selected.brand}`}
                    </Text>
                  </button>
                )}
              </div>

              <div className={styles.priceWrap}>
                <button
                  type="button"
                  ref={priceButtonRef}
                  className={styles.priceDropdown}
                  onClick={() => alternatives.length > 0 && setShowCompare((s) => !s)}
                  aria-expanded={showCompare}
                  aria-label="Compare price across nearby stores"
                >
                  <Text as="span" variant="mediumBold">
                    {formatPrice(selected.price)}
                  </Text>
                  <ChevronDown size={20} aria-hidden="true" />
                </button>

                {showCompare && alternatives.length > 0 && placement && (
                  <div
                    ref={compareRef}
                    className={styles.compareDropdown}
                    style={{
                      left: placement.left,
                      top: placement.top,
                      bottom: placement.bottom,
                      width: placement.width,
                      maxHeight: placement.maxHeight,
                    }}
                    role="listbox"
                    aria-label="Price comparison across stores"
                  >
                    {alternatives.map((o) => (
                      <button
                        type="button"
                        key={o.id}
                        className={styles.compareRow}
                        onClick={() => onSelectOffer?.(o.id)}
                        role="option"
                        aria-selected={false}
                      >
                        <span className={styles.compareLogo} aria-hidden="true">
                          {o.storeLogoSrc && (
                            // eslint-disable-next-line @next/next/no-img-element -- store logos are arbitrary assets
                            <img
                              src={o.storeLogoSrc}
                              alt=""
                              className={styles.compareLogoImg}
                            />
                          )}
                        </span>
                        <span className={styles.compareInfo}>
                          <Text
                            as="span"
                            variant="normalRegular"
                            className={styles.compareStore}
                          >
                            {o.storeName}
                          </Text>
                          {o.brand && (
                            <Text
                              as="span"
                              variant="xsmallBold"
                              className={styles.compareBrand}
                            >
                              {favourite(o.brand) && (
                                <Star
                                  size={10}
                                  className={styles.compareStar}
                                  fill="currentColor"
                                  aria-label="A brand you always buy"
                                />
                              )}
                              {o.brand}
                              {o.isOwnBrand ? " · their own" : ""}
                            </Text>
                          )}
                          <Text
                            as="span"
                            variant="xxsmallRegular"
                            className={styles.compareDistance}
                          >
                            {o.storeDistanceKm.toFixed(1)} km away
                          </Text>
                          {o.promo && (
                            <Text
                              as="span"
                              variant="xsmallBold"
                              className={styles.comparePromo}
                            >
                              {o.promo}
                            </Text>
                          )}
                        </span>
                        <Text
                          as="span"
                          variant="normalBold"
                          className={styles.comparePrice}
                        >
                          {formatPrice(o.price)}
                        </Text>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button type="button" className={styles.productDetails}>
              <Text as="span" variant="smallBold">
                PRODUCT DETAILS
              </Text>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          </div>

          {/* 3. Alternatives — 3 per row; ADD drops them into the cart */}
          <div className={styles.related}>
            {pop.related.map(({ id, ...cardProps }) => {
              const quantity = quantities[id] ?? 0;
              return (
                <ProductCard
                  key={id}
                  {...cardProps}
                  layout="vertical"
                  descriptionLines={2}
                  quantity={quantity}
                  onAdd={() => onAdd(id)}
                  onIncrement={() => onIncrement(id)}
                  onDecrement={() => onDecrement(id)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
