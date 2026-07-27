"use client";

import { useEffect, useState } from "react";
import NextImage from "next/image";
import { ChevronDown, Image as ImageIcon, X } from "lucide-react";
import { Text } from "@/components/Text/Text";
import { StoreName } from "@/components/StoreName/StoreName";
import { ProductCard } from "@/components/ProductCard/ProductCard";
import { formatPrice } from "@/lib/format";
import type { ProductPopData } from "@/data/productPop";
import styles from "./ProductPop.module.css";

export interface ProductPopProps {
  pop: ProductPopData;
  /** Currently selected store offer id (defaults to the first offer). */
  selectedOfferId?: string;
  onSelectOffer?: (offerId: string) => void;
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
export function ProductPop({
  pop,
  selectedOfferId,
  onSelectOffer,
  quantities,
  onAdd,
  onIncrement,
  onDecrement,
  onClose,
}: ProductPopProps) {
  const [showCompare, setShowCompare] = useState(false);

  const offers = pop.storeOffers;
  const selected = offers.find((o) => o.id === selectedOfferId) ?? offers[0];
  const alternatives = offers.filter((o) => o.id !== selected.id);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`${pop.brand} ${pop.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <X size={22} aria-hidden="true" />
        </button>

        <div className={styles.scroll}>
          {/* 1. Product image */}
          <div className={styles.hero}>
            {pop.imageSrc ? (
              <NextImage
                src={pop.imageSrc}
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
                  {pop.brand}
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
              </div>

              <div className={styles.priceWrap}>
                <button
                  type="button"
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

                {showCompare && alternatives.length > 0 && (
                  <>
                    {/* Outside-click catcher (transparent, full-screen). */}
                    <div
                      className={styles.compareCatcher}
                      onClick={() => setShowCompare(false)}
                      role="presentation"
                    />
                    <div
                      className={styles.compareDropdown}
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
                  </>
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
