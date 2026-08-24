"use client";

import NextImage from "next/image";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import { Text } from "@/components/Text/Text";
import { StoreName } from "@/components/StoreName/StoreName";
import { formatPrice } from "@/lib/format";
import styles from "./ItemRow.module.css";

export interface ItemRowProps {
  name: string;
  price: number;
  imageSrc?: string;
  imageAlt?: string;
  storeName?: string;
  storeLogoSrc?: string;
  /** Prices the line as price x quantity. Omit for a single unit (the
   *  wishlist, which doesn't track quantities). */
  quantity?: number;
  /** Trash icon — removes the line from whichever list it's in. */
  onRemove?: () => void;
  removeLabel?: string;
}

/**
 * One line in the cart / wishlist popup: product thumbnail on the left, then a
 * column with its store, name and price, and a delete icon.
 *
 * The details stack rather than sharing one row with the price — side by side,
 * the store and product names were squeezed down to a couple of ellipsised
 * characters in the narrow dropdown.
 */
export function ItemRow({
  name,
  price,
  imageSrc,
  imageAlt,
  storeName,
  storeLogoSrc,
  quantity,
  onRemove,
  removeLabel = "Remove item",
}: ItemRowProps) {
  const multiple = quantity != null && quantity > 1;
  // The big number is what this line costs; the unit price x quantity sits
  // beside it so a multi-quantity line still says where the total came from
  // (there's no stepper here showing the count).
  const lineTotal = quantity != null ? price * quantity : price;

  return (
    <div className={styles.row}>
      <div className={styles.thumb}>
        {imageSrc ? (
          <NextImage
            src={imageSrc}
            alt={imageAlt ?? name}
            fill
            sizes="66px"
            className={styles.thumbImg}
          />
        ) : (
          <div className={styles.thumbPlaceholder}>
            <ImageIcon size={22} strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}
      </div>

      <div className={styles.meta}>
        <div className={styles.topLine}>
          {storeName && (
            <StoreName
              name={storeName}
              logoSrc={storeLogoSrc}
              nameVariant="smallBold"
              className={styles.store}
            />
          )}
          <button
            type="button"
            className={[styles.iconBtn, styles.removeBtn].join(" ")}
            onClick={onRemove}
            aria-label={removeLabel}
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>

        <Text as="p" variant="normalRegular" className={styles.name}>
          {name}
        </Text>

        <div className={styles.priceLine}>
          <Text as="span" variant="mediumBold" className={styles.price}>
            {formatPrice(lineTotal)}
          </Text>
          {multiple && (
            <Text as="span" variant="xsmallRegular" className={styles.unitPrice}>
              {formatPrice(price)} &times; {quantity}
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}
