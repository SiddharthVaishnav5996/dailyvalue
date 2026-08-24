"use client";

import { useCallback, useMemo, useState } from "react";
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
import { useCart } from "@/components/Cart/CartContext";
import { Text } from "@/components/Text/Text";
import { AddButton } from "@/components/AddButton/AddButton";
import { ProductCard } from "@/components/ProductCard/ProductCard";
import { CartLineItem } from "@/components/CartLineItem/CartLineItem";
import {
  ORDER_SUMMARY,
  CUSTOMER,
  SHIPPING,
  PAYMENT,
  PEOPLE_ALSO_BOUGHT,
} from "@/data/checkout";
import { PRODUCT_POP_BY_ID, type StoreOffer } from "@/data/productPop";
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
  // Which store offer is chosen per cart line (empty → each line's first offer).
  const [selectedOffer, setSelectedOffer] = useState<Record<string, string>>({});

  // The store offer currently chosen for a cart line (or its default first
  // offer), when the product has a price comparison — cream cheese only for now.
  const selectedOfferFor = useCallback(
    (id: string): StoreOffer | undefined => {
      const offers = PRODUCT_POP_BY_ID[id]?.storeOffers;
      if (!offers) return undefined;
      return offers.find((o) => o.id === selectedOffer[id]) ?? offers[0];
    },
    [selectedOffer],
  );

  const { delivery, tax, promoDiscount } = ORDER_SUMMARY;

  // Subtotal prices every cart unit (using the chosen store offer where the line
  // has one); total then layers on the fixed delivery/tax and the promo credit.
  const subtotal = useMemo(() => {
    const cart = items.reduce(
      (sum, i) => sum + (selectedOfferFor(i.id)?.price ?? i.price) * i.quantity,
      0,
    );
    return Math.round(cart * 100) / 100;
  }, [items, selectedOfferFor]);

  const total = useMemo(
    () => Math.round((subtotal + delivery + tax - promoDiscount) * 100) / 100,
    [subtotal, delivery, tax, promoDiscount],
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
                  <Text as="span" variant="mediumBold">
                    Edit
                  </Text>
                </div>

                <div className={styles.cartList}>
                  {items.length === 0 ? (
                    <Text as="p" variant="mediumRegular" className={styles.emptyCart}>
                      Your cart is empty.
                    </Text>
                  ) : (
                    items.map((item) => {
                      const offer = selectedOfferFor(item.id);
                      return (
                        <CartLineItem
                          key={item.id}
                          name={item.name}
                          storeName={offer?.storeName ?? item.storeName ?? ""}
                          imageSrc={item.imageSrc}
                          imageAlt={item.imageAlt}
                          quantity={item.quantity}
                          onAdd={() => increment(item.id)}
                          onIncrement={() => increment(item.id)}
                          onDecrement={() => decrement(item.id)}
                          storeOffers={PRODUCT_POP_BY_ID[item.id]?.storeOffers}
                          selectedOfferId={selectedOffer[item.id]}
                          onSelectOffer={(offerId) =>
                            setSelectedOffer((prev) => ({ ...prev, [item.id]: offerId }))
                          }
                        />
                      );
                    })
                  )}
                </div>
              </section>

              <section className={styles.suggestions}>
                <Text as="h2" variant="heading5" className={styles.suggestionsTitle}>
                  People also bought
                </Text>
                <div className={styles.suggestionGrid}>
                  {PEOPLE_ALSO_BOUGHT.map((p) => (
                    <ProductCard
                      key={p.id}
                      layout="vertical"
                      descriptionLines={2}
                      imageSrc={p.imageSrc}
                      imageAlt={p.imageAlt}
                      imageFit={p.imageFit}
                      storeName={p.storeName}
                      storeDistanceKm={p.storeDistanceKm}
                      storeLogoSrc={p.storeLogoSrc}
                      showDiscount={p.showDiscount}
                      discountLabel={p.discountLabel}
                      description={p.description}
                      rating={p.rating}
                      reviewCount={p.reviewCount}
                      price={p.price}
                      quantity={quantityOf(p.id)}
                      onAdd={() =>
                        addItem({
                          id: p.id,
                          name: p.description,
                          price: p.price,
                          imageSrc: p.imageSrc,
                          imageAlt: p.imageAlt,
                          storeName: p.storeName,
                          storeLogoSrc: p.storeLogoSrc,
                        })
                      }
                      onIncrement={() => increment(p.id)}
                      onDecrement={() => decrement(p.id)}
                      isWishlisted={isWishlisted(p.id)}
                      onToggleWishlist={() =>
                        toggleWishlist({
                          id: p.id,
                          name: p.description,
                          price: p.price,
                          imageSrc: p.imageSrc,
                          imageAlt: p.imageAlt,
                          storeName: p.storeName,
                          storeLogoSrc: p.storeLogoSrc,
                        })
                      }
                    />
                  ))}
                </div>
              </section>
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
                  <div className={[styles.sumRow, styles.promoRow].join(" ")}>
                    <Text as="span" variant="mediumRegular">
                      Promotion Code Applied
                    </Text>
                    <Text as="span" variant="mediumBold">
                      -{formatPrice(promoDiscount)}
                    </Text>
                  </div>
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
                  onAdd={() => router.push("/results/order/verifying")}
                />
                <button
                  type="button"
                  className={styles.backLink}
                  onClick={() => router.push("/results/products")}
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
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
