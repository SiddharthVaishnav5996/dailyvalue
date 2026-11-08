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
import { VariantPicker } from "@/components/VariantPicker/VariantPicker";
import { Text } from "@/components/Text/Text";
import { useSearch } from "@/lib/search/SearchContext";
import { useBrandPreferences } from "@/lib/brand/BrandPreferenceContext";
import { applyVariant } from "@/lib/ui/applyVariant";
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
  const { isPreferred, togglePreferred, preferredFirst } = useBrandPreferences();

  /**
   * Which kind of each product the shopper chose: card id -> member key.
   *
   * Empty to begin with, and that is not the same as "nothing chosen" - it
   * means "whatever the search resolved to", which for "some milk" is the 2%
   * carton. See data/variants.ts. Deliberately NOT stored: a variant is an
   * answer to this list, not a standing preference like a favourite brand.
   */
  const [variantChoice, setVariantChoice] = useState<Record<string, string>>({});

  const products = useMemo(
    () => (result?.products ?? []).map((p) => applyVariant(p, variantChoice[p.id])),
    [result, variantChoice],
  );

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
    // A new list, so the variants chosen for the old one mean nothing. Kept
    // across a REBUILD, though - that is the same list re-resolved, and
    // throwing away the shopper's choices would be as rude as resetting
    // their quantities.
    setVariantChoice({});
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

  /**
   * The offer to show for a product.
   *
   * In order: what the shopper picked in the pop-up, then a brand they always
   * buy, then whatever the server ranked first on price and stars.
   *
   * The brand step happens HERE, in the browser, rather than in the ranking on
   * the server - the server has no idea who is asking, and it does not need
   * to. Nothing about a shopper's taste leaves their machine.
   */
  const offerFor = (product: ResolvedProduct): Offer =>
    product.offers.find((o) => o.id === selectedOffer[product.id]) ??
    preferredFirst(product.offers) ??
    product.offers[0];

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

  /**
   * The tables as drawn, with any variant the shopper chose written into them.
   *
   * Switch the ice cream from cookies-and-cream to strawberry and the card
   * changes, but the list above it went on saying "Cookies and cream ice
   * cream" - two different answers to the same question, on the same screen.
   * The list is what you are buying, so it follows what you chose.
   *
   * DERIVED, NOT WRITTEN BACK. The shopper's own `tables` state is left
   * exactly as the AI wrote it and this view is rebuilt on top, so deleting a
   * row still edits the real list by the same index and nothing accumulates.
   *
   * One consequence worth knowing: once a row has been touched it names the
   * PRODUCT from then on, even if the shopper switches back. "Cookies and
   * cream ice cream" returns as "Cookies and Cream Ice Cream 1.5 L" - the
   * same thing, said the catalog's way rather than the model's. Rows nobody
   * touched keep the model's wording exactly.
   *
   * Only the ITEM column is touched, found by its label rather than its
   * position: an ingredient table is always CATEGORY / ITEM / QUANTITY, but a
   * non-grocery table uses whatever columns inform the choice (see
   * lib/ai/planPrompt.ts). A table with no ITEM column is left alone rather
   * than guessed at.
   *
   * The recipe is untouched by any of this - it lives in `result.recipe` and
   * keeps the dish as the model wrote it, which is what the PDF prints.
   */
  const shownTables = useMemo(() => {
    const renamed = new Map<string, string>();
    for (const product of products) {
      if (!variantChoice[product.id]) continue;
      for (const rowId of product.rowIds) renamed.set(rowId, product.description);
    }
    if (renamed.size === 0) return tables;

    return tables.map((table) => {
      const itemColumn = table.columns.findIndex(
        (c) => c.trim().toUpperCase() === "ITEM",
      );
      if (itemColumn === -1) return table;

      return {
        ...table,
        rows: table.rows.map((row: ResultTableRow) => {
          const name = renamed.get(row.id);
          if (!name) return row;
          return {
            ...row,
            cells: row.cells.map((cell, i) => (i === itemColumn ? name : cell)),
          };
        }),
      };
    });
  }, [tables, products, variantChoice]);

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

    // The hand-authored pop-up describes ONE product - the Philadelphia
    // Original tub, its five shops, its Optimum points. The moment the shopper
    // switches the card to the chocolate one, that write-up is describing
    // something they are no longer looking at, so it stops being the better
    // answer and the resolved product is used instead.
    const authored = variantChoice[activeProduct.id]
      ? undefined
      : PRODUCT_POP_BY_ID[activeProduct.id];
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
        // The chosen shop's own packshot when there is one, so switching
        // store in the pop-up switches the picture as well as the price.
        imageSrc={offer.imageSrc ?? product.imageSrc}
        imageAlt={product.imageAlt ?? product.description}
        imageFit={product.imageFit}
        storeName={offer.storeName}
        storeDistanceKm={offer.storeDistanceKm}
        storeLogoSrc={offer.storeLogoSrc}
        description={product.description}
        // The brand follows the chosen shop, because it IS the shop's: switch
        // the store in the pop-up and this becomes Compliments or Kirkland.
        // Always passed, even when empty, so the grid stays aligned.
        brand={offer.brand ?? ""}
        brandIsFavourite={isPreferred(offer.brand)}
        // The choice nobody asked about: which milk, which eggs, which flour.
        // Shown right on the card, so the shopper finds out here rather than
        // at the checkout. See data/variants.ts.
        variantControl={
          product.variantFamily && (
            <VariantPicker
              family={product.variantFamily}
              onSelect={(key) =>
                setVariantChoice((prev) => ({ ...prev, [product.id]: key }))
              }
            />
          )
        }
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
            {shownTables.map((table, index) => (
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
          variantFamily={activeProduct.variantFamily}
          onSelectVariant={(key) =>
            setVariantChoice((prev) => ({ ...prev, [activeProduct.id]: key }))
          }
          isPreferredBrand={isPreferred}
          onToggleBrand={togglePreferred}
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
