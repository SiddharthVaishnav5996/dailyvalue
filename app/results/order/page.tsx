"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import {
  Share2,
  Pencil,
  CircleUserRound,
  Phone,
  Mail,
  Truck,
  CreditCard,
  CircleDot,
} from "lucide-react";
import { Header } from "@/components/Header/Header";
import { Footer } from "@/components/Footer/Footer";
import { useWishlist } from "@/components/Wishlist/WishlistContext";
import { useCart, type CartItem } from "@/components/Cart/CartContext";
import { Text } from "@/components/Text/Text";
import { AddButton } from "@/components/AddButton/AddButton";
import { ProductCard } from "@/components/ProductCard/ProductCard";
import { CartLineItem } from "@/components/CartLineItem/CartLineItem";
import { PRODUCT_BY_ID } from "@/lib/catalog/products";
import { TipCard } from "@/components/TipCard/TipCard";
import {
  ORDER_SUMMARY,
  CUSTOMER,
  SHIPPING,
  PAYMENT,
  TIP_PRESETS,
} from "@/data/checkout";
import { PRODUCT_POP_BY_ID, type StoreOffer } from "@/data/productPop";
import { useSearch } from "@/lib/search/SearchContext";
import type { ResolvedProduct } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import styles from "./page.module.css";

/**
 * Page 4 — Checkout / Order page. Reached from "Order Now" (and the cart) on the
 * AI Search Result page (Page 3).
 *
 * The "My Cart" list is the shared cart — everything added anywhere (landing
 * storefront, AI-result products, or the suggestions below) — so the basket is
 * consistent across the whole journey. Two columns: the left holds the cart list
 * and a "People also bought" grid (adding a suggestion drops it into the same
 * cart); the right stacks the Order Summary and the saved info cards. Customer /
 * shipping / payment and the delivery/tax/promo lines are still demo data.
 */
export default function OrderPage() {
  const router = useRouter();
  const { items, quantityOf, addItem, increment, decrement } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  // The current AI search, so a cart line can still be moved between stores at
  // checkout. Products added from the landing storefront are not in here, and
  // correctly show no store comparison.
  const { result } = useSearch();
  // Which store offer is chosen per cart line (empty → each line's first offer).
  const [selectedOffer, setSelectedOffer] = useState<Record<string, string>>({});
  // Delivery tip: a preset's id, "custom", or null (no tip picked yet).
  const [tipId, setTipId] = useState<string | null>(null);
  const [customTip, setCustomTip] = useState("");
  // "People also bought" — complementary products for THIS search, built by
  // POST /api/suggestions (see lib/catalog/suggestions.ts).
  const [suggestions, setSuggestions] = useState<ResolvedProduct[]>([]);

  /*
   * Refetch whenever the search changes, and only then.
   *
   * Deliberately not keyed on the cart: adding a suggestion would otherwise
   * rebuild the strip and swap the remaining cards out from under the shopper
   * mid-tap. The picks are deterministic per query anyway, so a re-run returns
   * the same four - what changes them is a new search.
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: result?.items ?? [],
            query: result?.query ?? "",
            // Don't offer back what this search already put on the page.
            exclude: (result?.products ?? []).map((p) => p.id),
          }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as { products?: ResolvedProduct[] };
        if (!cancelled) setSuggestions(data.products ?? []);
      } catch {
        // Offline, or the server is restarting. The strip just stays hidden.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [result]);

  /**
   * Every store that stocks a given cart line, newest search first.
   *
   * Looks in the live AI result, then falls back to the hand-written pop data
   * for anything added from the landing storefront. Returns undefined when
   * neither knows the product, and CartLineItem then simply hides the store
   * dropdown rather than showing an empty one.
   */
  const offersFor = useCallback(
    (item: CartItem): StoreOffer[] | undefined => {
      const live = result?.products.find((p) => p.id === item.id);

      // A card whose kind was switched on the results page (1% milk instead of
      // the 2% the search chose) keeps the card's id but carries the chosen
      // member's product, while the search result still holds the default.
      // The line's name tells them apart. Pricing a 1% carton from the 2%
      // carton's shops would be wrong, so a switched line uses its member's
      // own offers - or none, which leaves the line's own store and price.
      if (live && live.description !== item.name) {
        const bought = live.variantFamily?.members.find(
          (m) => m.product.description === item.name,
        )?.product;
        return bought && bought.offers.length > 1 ? bought.offers : undefined;
      }

      if (live && live.offers.length > 1) return live.offers;
      return PRODUCT_POP_BY_ID[item.id]?.storeOffers;
    },
    [result],
  );

  /*
   * The catalog unit for a cart line ("jar", "bag"), for the per-unit price.
   *
   * A resolved product's id is the catalog id with a "p-" prefix, so both
   * spellings are tried. Generated ("g-…") and curated ("cc-…") lines have no
   * catalog row and correctly return undefined — their price shows unsuffixed.
   */
  const unitFor = useCallback((id: string): string | undefined => {
    const product = PRODUCT_BY_ID[id] ?? PRODUCT_BY_ID[id.replace(/^p-/, "")];
    return product?.unit || undefined;
  }, []);

  /*
   * The store offer shown for a cart line: one picked on this page, else the
   * store the line was added from, else the first.
   *
   * The middle step matters. The shopper may already have switched store in
   * the results page's pop-up, and that choice is saved on the cart line.
   * Falling straight back to the first (cheapest-ranked) offer here quietly
   * undid it - the checkout showed, and charged, a shop they had moved away
   * from.
   */
  const selectedOfferFor = useCallback(
    (item: CartItem): StoreOffer | undefined => {
      const offers = offersFor(item);
      if (!offers) return undefined;
      return (
        offers.find((o) => o.id === selectedOffer[item.id]) ??
        offers.find((o) => o.storeName === item.storeName) ??
        offers[0]
      );
    },
    [offersFor, selectedOffer],
  );

  // An empty basket carries no charges: tax drops to zero and the promo credit
  // doesn't apply (its row hides below), so the summary reads $0.00 throughout
  // instead of taxing — or discounting — nothing.
  const hasItems = items.length > 0;
  const { delivery } = ORDER_SUMMARY;
  const tax = hasItems ? ORDER_SUMMARY.tax : 0;
  const promoDiscount = hasItems ? ORDER_SUMMARY.promoDiscount : 0;

  // Subtotal prices every cart unit (using the chosen store offer where the line
  // has one); total then layers on the fixed delivery/tax and the promo credit.
  const subtotal = useMemo(() => {
    const cart = items.reduce(
      (sum, i) => sum + (selectedOfferFor(i)?.price ?? i.price) * i.quantity,
      0,
    );
    return Math.round(cart * 100) / 100;
  }, [items, selectedOfferFor]);

  // The chosen tip's dollar amount — a preset's fixed price, or the parsed
  // custom field (invalid/blank/negative all count as no tip).
  const tipAmount = useMemo(() => {
    // Nothing to deliver on an empty basket — the tip card is hidden below, so
    // a tip picked earlier mustn't linger in the summary either.
    if (!hasItems) return 0;
    if (tipId === "custom") {
      const n = parseFloat(customTip);
      return Number.isFinite(n) && n > 0 ? n : 0;
    }
    return TIP_PRESETS.find((t) => t.id === tipId)?.amount ?? 0;
  }, [hasItems, tipId, customTip]);

  const total = useMemo(
    () =>
      Math.round((subtotal + delivery + tax - promoDiscount + tipAmount) * 100) / 100,
    [subtotal, delivery, tax, promoDiscount, tipAmount],
  );

  return (
    <>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.layout}>
            {/* ---- Left: cart + suggestions ---- */}
            <div className={styles.left}>
              <section className={styles.cart}>
                <div className={styles.cartHeader}>
                  <Text as="span" variant="mediumBold">
                    My Cart
                  </Text>
                  {/* Back to the chat result (Page 2) to change the order —
                      hidden on an empty basket, where there's nothing to edit. */}
                  {hasItems && (
                    <button
                      type="button"
                      className={styles.editCartBtn}
                      onClick={() => router.push("/results")}
                      aria-label="Edit cart"
                    >
                      <Text as="span" variant="mediumBold">
                        Edit
                      </Text>
                    </button>
                  )}
                </div>

                <div className={styles.cartList}>
                  {items.length === 0 ? (
                    <div className={styles.emptyCart}>
                      <Text
                        as="p"
                        variant="mediumRegular"
                        className={styles.emptyCartText}
                      >
                        Your cart is empty.
                      </Text>
                      {/* The empty state carries its own way out, rather than
                          repurposing Edit / Go back to Chat. */}
                      <AddButton
                        label="Browse Products"
                        showIcon={false}
                        onAdd={() => router.push("/")}
                      />
                    </div>
                  ) : (
                    items.map((item) => {
                      const offer = selectedOfferFor(item);
                      return (
                        <CartLineItem
                          key={item.id}
                          name={item.name}
                          storeName={offer?.storeName ?? item.storeName ?? ""}
                          /* Each shop's own packshot when it has one, so
                             switching store switches the picture — the Great
                             Value tub and the Compliments tub are different
                             products (Chapter 9f). Falls back to the line's
                             own photo for shops with none. */
                          imageSrc={offer?.imageSrc ?? item.imageSrc}
                          imageAlt={item.imageAlt}
                          price={offer?.price ?? item.price}
                          unit={unitFor(item.id)}
                          quantity={item.quantity}
                          onAdd={() => increment(item.id)}
                          onIncrement={() => increment(item.id)}
                          onDecrement={() => decrement(item.id)}
                          storeOffers={offersFor(item)}
                          selectedOfferId={offer?.id}
                          onSelectOffer={(offerId) =>
                            setSelectedOffer((prev) => ({ ...prev, [item.id]: offerId }))
                          }
                        />
                      );
                    })
                  )}
                </div>
              </section>

              {suggestions.length > 0 && (
              <section className={styles.suggestions}>
                <Text as="h2" variant="heading5" className={styles.suggestionsTitle}>
                  People also bought
                </Text>
                <div className={styles.suggestionGrid}>
                  {suggestions.map((p) => {
                    // Already ranked best-first by the resolver.
                    const offer = p.offers[0];
                    if (!offer) return null;
                    const line = {
                      id: p.id,
                      name: p.description,
                      price: offer.price,
                      imageSrc: p.imageSrc,
                      imageAlt: p.imageAlt,
                      storeName: offer.storeName,
                      storeLogoSrc: offer.storeLogoSrc,
                    };
                    return (
                    <ProductCard
                      key={p.id}
                      layout="vertical"
                      descriptionLines={2}
                      imageSrc={offer.imageSrc ?? p.imageSrc}
                      imageAlt={p.imageAlt ?? p.description}
                      imageFit={p.imageFit}
                      storeName={offer.storeName}
                      storeDistanceKm={offer.storeDistanceKm}
                      storeLogoSrc={offer.storeLogoSrc}
                      showDiscount={offer.cardBadge != null}
                      discountLabel={offer.cardBadge}
                      description={p.description}
                      brand={offer.brand ?? ""}
                      rating={offer.rating}
                      reviewCount={offer.reviewCount}
                      price={offer.price}
                      originalPrice={offer.originalPrice}
                      quantity={quantityOf(p.id)}
                      onAdd={() => addItem(line)}
                      onIncrement={() => increment(p.id)}
                      onDecrement={() => decrement(p.id)}
                      isWishlisted={isWishlisted(p.id)}
                      onToggleWishlist={() => toggleWishlist(line)}
                    />
                    );
                  })}
                </div>
              </section>
              )}
            </div>

            {/* ---- Right: order summary + saved details ---- */}
            <aside className={styles.right}>
              {/* Order Summary */}
              <section className={[styles.card, styles.summaryCard].join(" ")}>
                <div className={styles.cardHead}>
                  <Text as="h2" variant="heading5">
                    Order Summary
                  </Text>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label="Share order"
                  >
                    <Share2 size={30} className={styles.shareIcon} aria-hidden="true" />
                  </button>
                </div>

                <input
                  type="text"
                  className={styles.promoInput}
                  placeholder="Enter promo code"
                  aria-label="Promo code"
                />

                <div className={styles.summaryRows}>
                  <div className={styles.sumRow}>
                    <Text as="span" variant="mediumRegular">
                      Subtotal
                    </Text>
                    <Text as="span" variant="mediumBold">
                      {formatPrice(subtotal)}
                    </Text>
                  </div>
                  <div className={styles.sumRow}>
                    <Text as="span" variant="mediumRegular">
                      Delivery
                    </Text>
                    <Text as="span" variant="mediumBold">
                      {formatPrice(delivery)}
                    </Text>
                  </div>
                  <div className={styles.sumRow}>
                    <Text as="span" variant="mediumRegular">
                      Tax
                    </Text>
                    <Text as="span" variant="mediumBold">
                      {formatPrice(tax)}
                    </Text>
                  </div>
                  {hasItems && (
                    <div className={[styles.sumRow, styles.promoRow].join(" ")}>
                      <Text as="span" variant="mediumRegular">
                        Promotion Code Applied
                      </Text>
                      <Text as="span" variant="mediumBold">
                        -{formatPrice(promoDiscount)}
                      </Text>
                    </div>
                  )}
                  {tipAmount > 0 && (
                    <div className={styles.sumRow}>
                      <Text as="span" variant="mediumRegular">
                        Delivery Tip
                      </Text>
                      <Text as="span" variant="mediumBold">
                        {formatPrice(tipAmount)}
                      </Text>
                    </div>
                  )}
                </div>

                <div className={styles.divider} />

                <div className={styles.totalRow}>
                  <Text as="span" variant="mediumBold">
                    Total
                  </Text>
                  <Text as="span" variant="mediumBold">
                    {formatPrice(total)}
                  </Text>
                </div>

                <AddButton
                  label="Place Order"
                  showIcon={false}
                  className={styles.placeBtn}
                  // Nothing to order on an empty basket — the component's
                  // disabled state also blocks the click through to payment.
                  disabled={!hasItems}
                  onAdd={() => router.push("/results/order/verifying")}
                />
                <button
                  type="button"
                  className={styles.backLink}
                  // The chat result is /results — /results/products is the
                  // product grid, which is a different page with no chat on it.
                  onClick={() => router.push("/results")}
                >
                  <Text as="span" variant="mediumBold">
                    Go back to Chat
                  </Text>
                </button>
              </section>

              {/* Your Info */}
              <section className={[styles.card, styles.infoCard].join(" ")}>
                <div className={styles.cardHead}>
                  <div className={styles.cardTitle}>
                    <CircleUserRound size={26} aria-hidden="true" />
                    <Text as="h2" variant="heading5">
                      Your Info
                    </Text>
                  </div>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label="Edit your info"
                  >
                    <Pencil size={20} className={styles.editIcon} aria-hidden="true" />
                  </button>
                </div>

                <div className={styles.infoBody}>
                  <Text as="p" variant="mediumRegular" className={styles.infoLine}>
                    Name : {CUSTOMER.name}
                  </Text>
                  <p className={styles.infoLine}>
                    <Phone size={20} aria-hidden="true" />
                    <Text as="span" variant="mediumRegular">
                      : {CUSTOMER.phone}
                    </Text>
                  </p>
                  <p className={styles.infoLine}>
                    <Mail size={20} aria-hidden="true" />
                    <Text as="span" variant="mediumRegular">
                      : {CUSTOMER.email}
                    </Text>
                  </p>
                </div>
              </section>

              {/* Shipping Info */}
              <section className={[styles.card, styles.infoCard].join(" ")}>
                <div className={styles.cardHead}>
                  <div className={styles.cardTitle}>
                    <Truck size={26} aria-hidden="true" />
                    <Text as="h2" variant="heading5">
                      Shipping Info
                    </Text>
                  </div>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label="Edit shipping info"
                  >
                    <Pencil size={20} className={styles.editIcon} aria-hidden="true" />
                  </button>
                </div>

                <div className={styles.addressRow}>
                  <Text as="span" variant="mediumRegular">
                    Address :
                  </Text>
                  <div className={styles.addressLines}>
                    {SHIPPING.addressLines.map((line) => (
                      <Text as="span" variant="mediumRegular" key={line}>
                        {line}
                      </Text>
                    ))}
                  </div>
                </div>
              </section>

              {/* Payment Method */}
              <section className={[styles.card, styles.infoCard].join(" ")}>
                <div className={styles.cardHead}>
                  <div className={styles.cardTitle}>
                    <CreditCard size={26} aria-hidden="true" />
                    <Text as="h2" variant="heading5">
                      Payment Method
                    </Text>
                  </div>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label="Edit payment method"
                  >
                    <Pencil size={20} className={styles.editIcon} aria-hidden="true" />
                  </button>
                </div>

                <div className={styles.paymentRow}>
                  <span className={styles.payBrand}>
                    <NextImage
                      src={PAYMENT.brandImageSrc}
                      alt={PAYMENT.brandAlt}
                      fill
                      sizes="64px"
                      className={styles.payBrandImg}
                    />
                  </span>
                  <div className={styles.payMeta}>
                    <Text as="span" variant="mediumRegular">
                      {PAYMENT.type}
                    </Text>
                    <Text as="span" variant="mediumRegular" className={styles.payMasked}>
                      ***** {PAYMENT.last4}
                    </Text>
                  </div>
                  <CircleDot
                    size={24}
                    className={styles.radioSelected}
                    aria-hidden="true"
                  />
                </div>
              </section>

              {/* Delivery tip — only once there's an order to deliver. */}
              {hasItems && (
                <TipCard
                  className={[styles.card, styles.infoCard].join(" ")}
                  presets={TIP_PRESETS}
                  selectedId={tipId}
                  onSelectPreset={(id) => setTipId(id)}
                  onSelectCustom={() => setTipId("custom")}
                  customValue={customTip}
                  onCustomValueChange={setCustomTip}
                />
              )}
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
