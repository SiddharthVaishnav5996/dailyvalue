import NextImage from "next/image";
import { ChevronDown, Heart, Image as ImageIcon, Star } from "lucide-react";
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
  /** How the image sits in the frame: "cover" crops to fill; "contain" fits the
   *  whole image (Figma "Fit") — the frame goes transparent so the card's own
   *  surface shows behind letterboxed edges. */
  imageFit?: "cover" | "contain";
  storeName: string;
  storeDistanceKm: number;
  storeLogoSrc?: string;
  /** Wishlist heart, top-right of the image. Solid when saved, outline when not. */
  isWishlisted?: boolean;
  onToggleWishlist?: () => void;
  /** Figma "Show Discount" boolean — hides the pill and closes the gap it left. */
  showDiscount?: boolean;
  discountLabel?: string;
  description: string;
  /**
   * The brand, printed above the name.
   *
   * Three states, and the empty one matters: passing `undefined` leaves the
   * line out altogether (the landing page, whose cards were designed without
   * one), while passing `""` keeps the space reserved but blank. That is what
   * holds a grid of search results on the same horizontal lines when one
   * product happens to have no brand.
   */
  brand?: string;
  /** Marks the brand with a star, for one the shopper always buys. */
  brandIsFavourite?: boolean;
  /**
   * Reserve exactly this many lines for the description (it also truncates at
   * that many). Short copy then leaves the reserved space empty instead of
   * pulling the rating/price/delivery/button up, so every card in a row keeps
   * its elements on the same horizontal lines. Omit for natural height.
   */
  descriptionLines?: number;
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
  /**
   * Click anywhere on the card — except its own controls (heart, ADD/stepper,
   * chevron, reviews) — e.g. to open a details pop-up. When set, the card also
   * shows a pointer cursor.
   */
  onCardClick?: () => void;
  className?: string;
}

export function ProductCard({
  layout = "horizontal",
  imageSrc,
  imageAlt,
  imageFit = "cover",
  storeName,
  storeDistanceKm,
  storeLogoSrc,
  isWishlisted = false,
  onToggleWishlist,
  showDiscount = false,
  discountLabel = "Last Chance Saving",
  description,
  brand,
  brandIsFavourite,
  descriptionLines,
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
  onCardClick,
  className,
}: ProductCardProps) {
  const isVertical = layout === "vertical";
  const isContain = imageFit === "contain";

  const image = (
    <div
      className={[
        styles.imageWrap,
        isVertical ? styles.imageWrapVertical : "",
        isContain ? styles.imageWrapContain : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {imageSrc ? (
        <NextImage
          src={imageSrc}
          alt={imageAlt ?? storeName}
          fill
          sizes={isVertical ? "204px" : "217px"}
          className={[styles.image, isContain ? styles.imageContain : ""]
            .filter(Boolean)
            .join(" ")}
        />
      ) : (
        <div className={styles.imagePlaceholder}>
          <ImageIcon size={32} strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}
      <button
        type="button"
        className={styles.wishlistBtn}
        onClick={onToggleWishlist}
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={isWishlisted}
      >
        <Heart
          size={22}
          className={isWishlisted ? styles.wishlistIconActive : undefined}
          fill={isWishlisted ? "currentColor" : "none"}
          aria-hidden="true"
        />
      </button>
    </div>
  );

  // Hide the brand line when the name already says it - "Inniskillin" above
  // "Inniskillin Vidal Icewine" is just the word twice. The slot stays
  // reserved, so the card keeps its height either way.
  const flatten = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const brandLine =
    brand && !flatten(description).includes(flatten(brand)) ? brand : "";

  const body = (
    <div className={styles.body}>
      <StoreName
        name={storeName}
        distanceKm={storeDistanceKm}
        logoSrc={storeLogoSrc}
        nameVariant="smallBold"
      />

      {/* Always rendered (not conditionally) so its slot stays reserved —
          only its visibility toggles, keeping price/rating/delivery/button
          pinned to the same spot whether or not a discount is showing. */}
      <span
        className={[styles.discountPill, !showDiscount ? styles.discountPillHidden : ""]
          .filter(Boolean)
          .join(" ")}
        aria-hidden={!showDiscount}
      >
        <Text as="span" variant="xxsmallBold" className={styles.discountLabel}>
          {discountLabel}
        </Text>
      </span>

      {brand !== undefined && (
        <Text as="p" variant="xsmallBold" className={styles.brand}>
          {brandLine && brandIsFavourite && (
            <Star
              size={11}
              className={styles.brandStar}
              fill="currentColor"
              aria-label="A brand you always buy"
            />
          )}
          {brandLine}
        </Text>
      )}

      <Text
        as="p"
        variant="smallRegular"
        className={styles.description}
        style={
          descriptionLines
            ? {
                // min-height reserves the slot; line-clamp caps it — together
                // they pin the block to exactly `descriptionLines` lines.
                minHeight: `${descriptionLines}lh`,
                WebkitLineClamp: descriptionLines,
              }
            : undefined
        }
      >
        {description}
      </Text>

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

      <div className={styles.ratingRow}>
        <StarRating rating={rating} size={16} />
        <button type="button" className={styles.reviewLink} onClick={onReviewClick}>
          <Text as="span" variant="smallRegular">
            {reviewCount} Reviews
          </Text>
        </button>
      </div>

      {/* Price left, Add/stepper right — pinned to the card's bottom (see
          .priceStepperRow's margin-top: auto) so it lands on the same spot
          whether or not the discount pill above is showing. */}
      <div className={styles.priceStepperRow}>
        <div className={styles.priceRow}>
          <Text as="span" variant="mediumBold" className={styles.price}>
            {formatPrice(price)}
          </Text>
          {/* Always rendered so every price block is the same two-line height —
              that keeps the Add button on the same line across a row whether or
              not a card is discounted. Space is held (visibility) when there's
              no original price. */}
          <Text
            as="span"
            variant="smallRegular"
            className={[
              styles.originalPrice,
              originalPrice == null ? styles.originalPriceHidden : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden={originalPrice == null}
          >
            {originalPrice != null ? formatPrice(originalPrice) : " "}
          </Text>
        </div>

        <AddButton
          quantity={quantity}
          onAdd={onAdd}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          className={styles.addButtonInline}
        />
      </div>
    </div>
  );

  return (
    <article
      className={[
        styles.card,
        isVertical ? styles.vertical : styles.horizontal,
        onCardClick ? styles.clickable : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={
        onCardClick
          ? (e) => {
              // The card's own controls (heart, ADD/stepper, chevron, reviews)
              // handle their own clicks; a click anywhere else opens the pop.
              if ((e.target as HTMLElement).closest("button, a")) return;
              onCardClick();
            }
          : undefined
      }
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
