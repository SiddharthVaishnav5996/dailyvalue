"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header/Header";
import { Footer } from "@/components/Footer/Footer";
import { useWishlist } from "@/components/Wishlist/WishlistContext";
import { useCart, type CartItemInput } from "@/components/Cart/CartContext";
import { AddButton } from "@/components/AddButton/AddButton";
import { ResultTable } from "@/components/ResultTable/ResultTable";
import { ProductCard } from "@/components/ProductCard/ProductCard";
import { ProductPop } from "@/components/ProductPop/ProductPop";
import { INGREDIENTS_TABLE, WINE_TABLE } from "@/data/chatResult";
import {
  INGREDIENT_PRODUCTS,
  WINE_PRODUCTS,
  ALL_SEARCH_PRODUCTS,
  type SearchProduct,
} from "@/data/searchResults";
import {
  PRODUCT_POP_BY_ID,
  type StoreOffer,
  type RelatedProduct,
} from "@/data/productPop";
import styles from "./page.module.css";

/** Where the cart and Order Now lead — the checkout page, designed later. */
const ORDER_ROUTE = "/results/order";

/** A shared-cart line from a product (base details — store offers are a
 *  display-only override on the card, not stored on the cart line). */
function toCartItem(p: SearchProduct | RelatedProduct): CartItemInput {
  return {
    id: p.id,
    name: p.description,
    price: p.price,
    imageSrc: p.imageSrc,
    imageAlt: p.imageAlt,
    storeName: p.storeName,
    storeLogoSrc: p.storeLogoSrc,
  };
}

/**
 * Page 3 — AI Search Result. Reached from Confirm on the chat-result page
 * (/results): it repeats the recipe's ingredient + wine tables, then lists one
 * product card per unique item beneath them (ingredients first, the wine
 * pairings on their own new row).
 *
 * The recipe's products are pre-loaded into the shared cart (so cards open in
 * the basket and carry through to checkout alongside anything added on the
 * landing page). Taking a card to 0 (back to "ADD") reddens the table rows it
 * fulfils — no longer being bought but still listed. Deleting a table row (its
 * trash icon) is stronger: once a product's last row is gone, its card
 * disappears and its line leaves the cart.
 *
 * A card's chevron opens its Product-pop (a details modal with alternatives);
 * adding an alternative there drops it into the same shared cart.
 */
export default function ProductResultsPage() {
  const router = useRouter();
  const { quantityOf, addItem, increment, decrement, remove, ensureItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [ingredients, setIngredients] = useState(INGREDIENTS_TABLE.rows);
  const [wines, setWines] = useState(WINE_TABLE.rows);
  const [popupProductId, setPopupProductId] = useState<string | null>(null);
  // Which store offer is selected per product (empty → each product's first offer).
  const [selectedOffer, setSelectedOffer] = useState<Record<string, string>>({});

  // Pre-load the recipe's products into the shared cart once. ensureItem leaves
  // anything the user already added or removed untouched, so navigating away and
  // back doesn't undo their edits.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    for (const p of ALL_SEARCH_PRODUCTS) {
      ensureItem(toCartItem(p), p.initialQuantity ?? 1);
    }
  }, [ensureItem]);

  // Row ids still present in the tables (a delete removes a row here). A product
  // card is shown only while at least one of the rows it fulfils survives, so
  // deleting a row's last owner also drops its card — and its line from the cart
  // (see the effect below). A multi-row product (e.g. the one sugar covering
  // three rows) stays until its final row is deleted.
  const remainingRowIds = useMemo(() => {
    const s = new Set<string>();
    for (const r of ingredients) s.add(r.id);
    for (const r of wines) s.add(r.id);
    return s;
  }, [ingredients, wines]);

  const presentIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of ALL_SEARCH_PRODUCTS) {
      if (p.rowIds.some((r) => remainingRowIds.has(r))) s.add(p.id);
    }
    return s;
  }, [remainingRowIds]);

  // Once a product's last table row is deleted, take it out of the cart too.
  useEffect(() => {
    for (const p of ALL_SEARCH_PRODUCTS) {
      if (!presentIds.has(p.id) && quantityOf(p.id) > 0) remove(p.id);
    }
  }, [presentIds, quantityOf, remove]);

  // Rows fulfilled by a still-present product that's been zeroed out → shown red.
  const removedRowIds = useMemo(() => {
    const ids: string[] = [];
    for (const p of ALL_SEARCH_PRODUCTS) {
      if (presentIds.has(p.id) && quantityOf(p.id) === 0) {
        ids.push(...p.rowIds);
      }
    }
    return ids;
  }, [presentIds, quantityOf]);

  const goToOrder = () => router.push(ORDER_ROUTE);

  // A card's chevron opens its Product-pop, if one is defined (cream cheese
  // only for now — the rest follow later).
  const openPopup = (id: string) => {
    if (PRODUCT_POP_BY_ID[id]) setPopupProductId(id);
  };
  const activePop = popupProductId ? PRODUCT_POP_BY_ID[popupProductId] : null;

  // The store offer currently chosen for a product (or its default first offer).
  const selectedOfferFor = (id: string): StoreOffer | undefined => {
    const offers = PRODUCT_POP_BY_ID[id]?.storeOffers;
    if (!offers) return undefined;
    return offers.find((o) => o.id === selectedOffer[id]) ?? offers[0];
  };

  // Quantities for the active pop's alternatives, read from the shared cart.
  const popQuantities = useMemo(() => {
    const rec: Record<string, number> = {};
    if (activePop) for (const r of activePop.related) rec[r.id] = quantityOf(r.id);
    return rec;
  }, [activePop, quantityOf]);

  function renderCard(product: SearchProduct) {
    const { id } = product;
    const quantity = quantityOf(id);
    // If the product has store offers, the selected one overrides its store /
    // price / badge (the image + description stay). Otherwise use it as-is.
    const offer = selectedOfferFor(id);
    const cardProps = offer
      ? {
          ...product,
          storeName: offer.storeName,
          storeDistanceKm: offer.storeDistanceKm,
          storeLogoSrc: offer.storeLogoSrc,
          price: offer.price,
          originalPrice: offer.originalPrice,
          showDiscount: offer.cardBadge != null,
          discountLabel: offer.cardBadge ?? product.discountLabel,
        }
      : product;
    return (
      <ProductCard
        key={id}
        {...cardProps}
        layout="vertical"
        descriptionLines={2}
        quantity={quantity}
        onAdd={() => addItem(toCartItem(product))}
        onIncrement={() => increment(id)}
        onDecrement={() => decrement(id)}
        isWishlisted={isWishlisted(id)}
        onToggleWishlist={() => toggleWishlist(toCartItem(product))}
        onExpandDelivery={() => openPopup(id)}
        onCardClick={PRODUCT_POP_BY_ID[id] ? () => openPopup(id) : undefined}
      />
    );
  }

  return (
    <>
      <Header />

      <main className={styles.main}>
        <div className={styles.content}>
          {/* The ADD button reused as a back link — left-aligned to the column. */}
          <div className={styles.backBar}>
            <AddButton
              label="Go Back to Chat"
              showIcon={false}
              onAdd={() => router.push("/results")}
            />
          </div>

          <div className={styles.tables}>
            <ResultTable
              {...INGREDIENTS_TABLE}
              rows={ingredients}
              mutedRowIds={removedRowIds}
              onDeleteRow={(id) =>
                setIngredients((rows) => rows.filter((r) => r.id !== id))
              }
            />
            <ResultTable
              {...WINE_TABLE}
              rows={wines}
              mutedRowIds={removedRowIds}
              onDeleteRow={(id) =>
                setWines((rows) => rows.filter((r) => r.id !== id))
              }
            />
          </div>

          {/* Two grids so the wine pairings always begin on a fresh row,
              regardless of how the ingredient cards happen to wrap. */}
          <div className={styles.products}>
            <div className={styles.productGrid}>
              {INGREDIENT_PRODUCTS.filter((p) => presentIds.has(p.id)).map(renderCard)}
            </div>
            <div className={styles.productGrid}>
              {WINE_PRODUCTS.filter((p) => presentIds.has(p.id)).map(renderCard)}
            </div>
          </div>

          {/* Primary CTA under the last card — to checkout (designed later). */}
          <div className={styles.orderBar}>
            <AddButton label="Order Now" showIcon={false} onAdd={goToOrder} />
          </div>
        </div>
      </main>

      <Footer />

      {activePop && (
        <ProductPop
          pop={activePop}
          selectedOfferId={popupProductId ? selectedOffer[popupProductId] : undefined}
          onSelectOffer={(offerId) =>
            popupProductId &&
            setSelectedOffer((prev) => ({ ...prev, [popupProductId]: offerId }))
          }
          quantities={popQuantities}
          onAdd={(id) => {
            const related = activePop.related.find((x) => x.id === id);
            if (related) addItem(toCartItem(related));
          }}
          onIncrement={(id) => increment(id)}
          onDecrement={(id) => decrement(id)}
          onClose={() => setPopupProductId(null)}
        />
      )}
    </>
  );
}
