"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header/Header";
import { Footer } from "@/components/Footer/Footer";
import { useWishlist } from "@/components/Wishlist/WishlistContext";
import { useCart, type CartItemInput } from "@/components/Cart/CartContext";
import { AddButton } from "@/components/AddButton/AddButton";
import { ResultTable, type ResultTableRow } from "@/components/ResultTable/ResultTable";
import { ProductCard } from "@/components/ProductCard/ProductCard";
import { ProductPop } from "@/components/ProductPop/ProductPop";
import { Text } from "@/components/Text/Text";
import { useSearch } from "@/lib/search/SearchContext";
import type { AIItem, Offer, ResolvedProduct } from "@/lib/types";
import {
  PRODUCT_POP_BY_ID,
  type ProductPopData,
  type RelatedProduct,
} from "@/data/productPop";
import styles from "./page.module.css";

/** Where Order Now leads. */
const ORDER_ROUTE = "/results/order";

/**
 * Page 3 — AI Search Result.
 *
 * Reads the search result the chat page produced (see
 * lib/search/SearchContext.tsx), repeats its tables, then lists one product
 * card per item beneath them.
 *
 * THE BASKET ON THIS PAGE IS A SELECTION, NOT THE CART.
 *
 * Each card opens at the quantity the AI suggested, so the page arrives with a
 * sensible basket already filled in. But none of it touches the shared cart
 * until the shopper presses Order Now. Seeding the real cart on page load meant
 * the header badge climbed with every search the shopper merely looked at,
 * including ones they never confirmed - which is exactly as odd as it sounds.
 *
 * Everything else behaves as it always has:
 *   - taking a card to 0 reddens the table rows it fulfils
 *   - deleting a row's last owner drops the card entirely
 *   - the chevron opens a details modal where the store can be switched
 */
export default function ProductResultsPage() {
  const router = useRouter();
  const { result, registerCommitted } = useSearch();
  const { setItemQuantity } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const products = useMemo(() => result?.products ?? [], [result]);

  /** Every product's suggested quantity, as the page's opening selection. */
  function openingSelection(list: ResolvedProduct[]): Record<string, number> {
    const next: Record<string, number> = {};
    for (const product of list) next[product.id] = product.quantity;
    return next;
  }

  // Local copies of the table rows and the chosen quantities.
  //
  // Two different things can arrive, and they deserve different treatment:
  //
  //   A NEW SEARCH  - a new shopping list. Tables and basket both start over.
  //   REBUILT CARDS - the same list, re-resolved against current data after a
  //                   reload (see SearchContext). The shopper's table edits and
  //                   chosen quantities must survive that.
  //
  // They are told apart by object identity. Every search produces a fresh
  // `items` array; a rebuild keeps the same one and replaces only `products`.
  //
  // React's documented way to reset state when an input changes is to adjust it
  // during render rather than in an effect: remember what the current state was
  // built from, and rebuild the moment that changes. React discards the
  // in-progress render and redoes it immediately, so nothing stale is painted.
  const [tables, setTables] = useState(result?.tables ?? []);
  const [selection, setSelection] = useState<Record<string, number>>(() =>
    openingSelection(result?.products ?? []),
  );
  const [builtFromItems, setBuiltFromItems] = useState<AIItem[] | null>(
    result?.items ?? null,
  );
  const [builtFromProducts, setBuiltFromProducts] = useState<ResolvedProduct[] | null>(
    result?.products ?? null,
  );

  if (result && builtFromItems !== result.items) {
    setBuiltFromItems(result.items);
    setBuiltFromProducts(result.products);
    setTables(result.tables);
    setSelection(openingSelection(result.products));
  } else if (result && builtFromProducts !== result.products) {
    const rebuilt = result.products;
    setBuiltFromProducts(rebuilt);
    // Keep what the shopper chose for every product that still exists. A card
    // whose id changed - say, a generated product that now matches a curated
    // photo - opens at its suggested quantity like any new card.
    setSelection((previous) => {
      const next = openingSelection(rebuilt);
      for (const id of Object.keys(next)) {
        if (id in previous) next[id] = previous[id];
      }
      return next;
    });
  }

  const [popupProductId, setPopupProductId] = useState<string | null>(null);
  // Which store offer is selected per product (empty → each product's first).
  const [selectedOffer, setSelectedOffer] = useState<Record<string, string>>({});

  /* --- the selection ----------------------------------------------------- */

  const qtyOf = (id: string): number => selection[id] ?? 0;

  const bump = (id: string, delta: number) =>
    setSelection((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));

  /* --- offers and cart lines --------------------------------------------- */

  /** The offer currently chosen for a product, or its top-ranked default. */
  const offerFor = (product: ResolvedProduct): Offer =>
    product.offers.find((o) => o.id === selectedOffer[product.id]) ?? product.offers[0];

  /** A cart line built from a product and whichever store is selected. */
  const toCartItem = (product: ResolvedProduct): CartItemInput => {
    const offer = offerFor(product);
    return {
      id: product.id,
      name: product.description,
      price: offer.price,
      imageSrc: product.imageSrc,
      imageAlt: product.imageAlt,
      storeName: offer.storeName,
      storeLogoSrc: offer.storeLogoSrc,
    };
  };

  /** A cart line for one of the modal's alternative products. */
  const relatedToCartItem = (related: RelatedProduct): CartItemInput => ({
    id: related.id,
    name: related.description,
    price: related.price,
    imageSrc: related.imageSrc,
    imageAlt: related.imageAlt,
    storeName: related.storeName,
    storeLogoSrc: related.storeLogoSrc,
  });

  /* --- which cards are still on the page --------------------------------- */

  // Row ids still present in the tables. A card shows only while at least one
  // of the rows it fulfils survives.
  const remainingRowIds = useMemo(() => {
    const ids = new Set<string>();
    for (const table of tables) {
      for (const row of table.rows) ids.add(row.id);
    }
    return ids;
  }, [tables]);

  const presentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const product of products) {
      // A product with no rowIds at all is still shown — the AI sometimes
      // returns an item that belongs to no specific row.
      if (product.rowIds.length === 0) ids.add(product.id);
      else if (product.rowIds.some((r) => remainingRowIds.has(r))) ids.add(product.id);
    }
    return ids;
  }, [products, remainingRowIds]);

  // Rows fulfilled by a still-present product the shopper has zeroed out.
  const removedRowIds = useMemo(() => {
    const ids: string[] = [];
    for (const product of products) {
      if (presentIds.has(product.id) && (selection[product.id] ?? 0) === 0) {
        ids.push(...product.rowIds);
      }
    }
    return ids;
  }, [products, presentIds, selection]);

  function deleteRow(tableIndex: number, rowId: string) {
    setTables((prev) =>
      prev.map((table, i) =>
        i === tableIndex
          ? { ...table, rows: table.rows.filter((r: ResultTableRow) => r.id !== rowId) }
          : table,
      ),
    );
  }

  /* --- the details modal -------------------------------------------------- */

  const activeProduct = products.find((p) => p.id === popupProductId) ?? null;

  /**
   * Is there anything worth opening the details modal for?
   *
   * Yes if the product has a hand-built pop, because those carry alternative
   * products regardless of how many shops stock the item. Otherwise only when
   * there is more than one shop, since a comparison of one is not a comparison.
   */
  const hasDetails = (product: ResolvedProduct): boolean =>
    Boolean(PRODUCT_POP_BY_ID[product.id]) || product.offers.length > 1;

  /**
   * The details modal's content.
   *
   * A hand-built Product-pop always wins. Those carry things the pipeline
   * cannot reconstruct: the brand line, the loyalty points line, the exact
   * store comparison with its promo copy, and a grid of real alternative
   * products with their own photography. Rebuilding that from a resolved
   * product would silently throw all of it away.
   */
  const activePop: ProductPopData | null = (() => {
    if (!activeProduct) return null;

    const authored = PRODUCT_POP_BY_ID[activeProduct.id];
    if (authored) return authored;

    return {
      productId: activeProduct.id,
      brand: activeProduct.brand,
      name: activeProduct.description,
      imageSrc: activeProduct.imageSrc,
      imageAlt: activeProduct.imageAlt,
      storeOffers: activeProduct.offers,
      related: [],
    };
  })();

  /** Alternatives share the same selection map, so they commit together. */
  const popQuantities: Record<string, number> = {};
  if (activePop) {
    for (const related of activePop.related) popQuantities[related.id] = qtyOf(related.id);
  }

  /* --- confirming --------------------------------------------------------- */

  /**
   * Move the whole selection into the shared cart, then go to checkout.
   *
   * This is the only place on this page that writes to the cart. The ids are
   * reported back to the search context so the NEXT search can clear exactly
   * these lines rather than letting baskets stack up.
   */
  function confirmAndOrder() {
    const committed: string[] = [];

    for (const product of products) {
      if (!presentIds.has(product.id)) continue;
      const quantity = qtyOf(product.id);
      if (quantity <= 0) continue;
      setItemQuantity(toCartItem(product), quantity);
      committed.push(product.id);
    }

    // Alternatives picked inside a details modal are part of the basket too.
    for (const pop of Object.values(PRODUCT_POP_BY_ID)) {
      for (const related of pop.related) {
        const quantity = qtyOf(related.id);
        if (quantity <= 0) continue;
        setItemQuantity(relatedToCartItem(related), quantity);
        committed.push(related.id);
      }
    }

    registerCommitted(committed);
    router.push(ORDER_ROUTE);
  }

  /* --- rendering ---------------------------------------------------------- */

  function renderCard(product: ResolvedProduct) {
    const offer = offerFor(product);

    return (
      <ProductCard
        key={product.id}
        layout="vertical"
        descriptionLines={2}
        imageSrc={product.imageSrc}
        imageAlt={product.imageAlt ?? product.description}
        imageFit={product.imageFit}
        storeName={offer.storeName}
        storeDistanceKm={offer.storeDistanceKm}
        storeLogoSrc={offer.storeLogoSrc}
        description={product.description}
        rating={offer.rating}
        reviewCount={offer.reviewCount}
        price={offer.price}
        originalPrice={offer.originalPrice}
        showDiscount={offer.cardBadge != null}
        discountLabel={offer.cardBadge}
        quantity={qtyOf(product.id)}
        onAdd={() => bump(product.id, 1)}
        onIncrement={() => bump(product.id, 1)}
        onDecrement={() => bump(product.id, -1)}
        isWishlisted={isWishlisted(product.id)}
        onToggleWishlist={() => toggleWishlist(toCartItem(product))}
        onExpandDelivery={
          hasDetails(product) ? () => setPopupProductId(product.id) : undefined
        }
        onCardClick={hasDetails(product) ? () => setPopupProductId(product.id) : undefined}
      />
    );
  }

  // Landed here with nothing to show, e.g. a direct link or a new tab.
  if (!result || products.length === 0) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.content}>
            <div className={styles.empty}>
              <Text as="p" variant="mediumBold">
                No search to show
              </Text>
              <Text as="p" variant="normalRegular" className={styles.emptyText}>
                Start from the search bar and your products will appear here.
              </Text>
              <AddButton
                label="Start a search"
                showIcon={false}
                onAdd={() => router.push("/")}
              />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const visible = products.filter((p) => presentIds.has(p.id));

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
            {tables.map((table, index) => (
              <ResultTable
                key={table.title}
                title={table.title}
                columns={table.columns}
                rows={table.rows}
                groupFirstColumn={table.groupFirstColumn}
                mutedRowIds={removedRowIds}
                onDeleteRow={(rowId) => deleteRow(index, rowId)}
              />
            ))}
          </div>

          <div className={styles.products}>
            <div className={styles.productGrid}>{visible.map(renderCard)}</div>
          </div>

          {/* The one control that moves this basket into the real cart. */}
          <div className={styles.orderBar}>
            <AddButton label="Order Now" showIcon={false} onAdd={confirmAndOrder} />
          </div>
        </div>
      </main>

      <Footer />

      {activePop && activeProduct && (
        <ProductPop
          pop={activePop}
          selectedOfferId={selectedOffer[activeProduct.id]}
          onSelectOffer={(offerId) =>
            setSelectedOffer((prev) => ({ ...prev, [activeProduct.id]: offerId }))
          }
          quantities={popQuantities}
          onAdd={(id) => bump(id, 1)}
          onIncrement={(id) => bump(id, 1)}
          onDecrement={(id) => bump(id, -1)}
          onClose={() => setPopupProductId(null)}
        />
      )}
    </>
  );
}
