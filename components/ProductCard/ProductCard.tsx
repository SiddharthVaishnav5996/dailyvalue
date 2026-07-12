import NextImage from "next/image";
import { ChevronDown, Image as ImageIcon } from "lucide-react";
import { Text } from "@/components/Text/Text";
import { StoreName } from "@/components/StoreName/StoreName";
import { StarRating } from "@/components/StarRating/StarRating";
import { AddButton } from "@/components/AddButton/AddButton";
import { formatPrice } from "@/lib/format";
import styles from "./ProductCard.module.css";

export interface ProductCardProps {
  layout?: "horizontal" | "vertical";
  imageSrc?: string;
  imageAlt?: string;
  storeName: string;
  storeDistanceKm: number;
  storeLogoSrc?: string;
  /** Figma "Show Discount" boolean — hides the pill and closes the gap it left. */
  showDiscount?: boolean;
  discountLabel?: string;
  description: string;
  rating: number;
  reviewCount: number;
  price: number;
  /** Shown struck-through next to price when given. */
  originalPrice?: number;
  deliveryText?: string;
  quantity?: number;
  onAdd?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onReviewClick?: () => void;
  onExpandDelivery?: () => void;
  className?: string;
}

export function ProductCard({
  layout = "horizontal",
  imageSrc,
  imageAlt,
  storeName,
  storeDistanceKm,
  storeLogoSrc,
  showDiscount = false,
  discountLabel = "Last Chance Saving",
  description,
  rating,
  reviewCount,
  price,
  originalPrice,
  deliveryText = "Free Delivery, Tomorrow",
  quantity = 0,
  onAdd,
  onIncrement,
  onDecrement,
  onReviewClick,
  onExpandDelivery,
  className,
}: ProductCardProps) {
  const isVertical = layout === "vertical";

  const image = (
    <div
      className={[styles.imageWrap, isVertical ? styles.imageWrapVertical : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {imageSrc ? (
        <NextImage
          src={imageSrc}
          alt={imageAlt ?? storeName}
          fill
          sizes={isVertical ? "204px" : "217px"}
          className={styles.image}
        />
      ) : (
        <div className={styles.imagePlaceholder}>
          <ImageIcon size={32} strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}
    </div>
  );

  const body = (
    <div className={styles.body}>
      <StoreName name={storeName} distanceKm={storeDistanceKm} logoSrc={storeLogoSrc} />

      {showDiscount && (
        <span className={styles.discountPill}>
          <Text as="span" variant="xxsmallBold" className={styles.discountLabel}>
            {discountLabel}
          </Text>
        </span>
      )}

      <Text as="p" variant="smallRegular" className={styles.description}>
        {description}
      </Text>

      <div className={styles.ratingRow}>
        <StarRating rating={rating} size={16} />
        <button type="button" className={styles.reviewLink} onClick={onReviewClick}>
          <Text as="span" variant="smallRegular">
            {reviewCount} Reviews
          </Text>
        </button>
      </div>

      <div className={styles.priceRow}>
        <Text as="span" variant="mediumBold" className={styles.price}>
          {formatPrice(price)}
        </Text>
        {originalPrice != null && (
          <Text as="span" variant="smallRegular" className={styles.originalPrice}>
            {formatPrice(originalPrice)}
          </Text>
        )}
      </div>

      <div className={styles.deliveryRow}>
        <Text as="span" variant="smallRegular" className={styles.deliveryText}>
          {deliveryText}
        </Text>
        <button
          type="button"
          className={styles.expandBtn}
          onClick={onExpandDelivery}
          aria-label="More delivery options"
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>

      <AddButton
        quantity={quantity}
        onAdd={onAdd}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        className={styles.addButtonFull}
      />
    </div>
  );

  return (
    <article
      className={[styles.card, isVertical ? styles.vertical : styles.horizontal, className]
        .filter(Boolean)
        .join(" ")}
    >
      {isVertical ? (
        <>
          {image}
          {body}
        </>
      ) : (
        <div className={styles.topRow}>
          {image}
          {body}
        </div>
      )}
    </article>
  );
}
