"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header/Header";
import { Footer } from "@/components/Footer/Footer";
import { AddButton } from "@/components/AddButton/AddButton";
import { ResultTable } from "@/components/ResultTable/ResultTable";
import { ProductCard } from "@/components/ProductCard/ProductCard";
import { INGREDIENTS_TABLE, WINE_TABLE } from "@/data/chatResult";
import {
  INGREDIENT_PRODUCTS,
  WINE_PRODUCTS,
  ALL_SEARCH_PRODUCTS,
  type SearchProduct,
} from "@/data/searchResults";
import styles from "./page.module.css";

/** Where the cart and Order Now lead — the checkout page, designed later. */
const ORDER_ROUTE = "/results/order";

/**
 * Page 3 — AI Search Result. Reached from Confirm on the chat-result page
 * (/results): it repeats the recipe's ingredient + wine tables, then lists one
 * product card per unique item beneath them (ingredients first, the wine
 * pairings on their own new row).
 *
 * Every card opens already in the basket, so the page owns the per-product
 * quantity + wishlist state. The Header cart badge shows the total quantity of
 * the cards still on the page. Taking a card to 0 (back to "ADD") reddens the
 * table rows it fulfils — the item is no longer being bought but stays listed.
 * Deleting a table row (its trash icon) is stronger: once a product's last row
 * is gone, its card disappears and its quantity leaves the cart.
 */
export default function ProductResultsPage() {
  const router = useRouter();

  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      ALL_SEARCH_PRODUCTS.map((p) => [p.id, p.initialQuantity ?? 1]),
    ),
  );
  const [wishlisted, setWishlisted] = useState<Record<string, boolean>>({});
  const [ingredients, setIngredients] = useState(INGREDIENTS_TABLE.rows);
  const [wines, setWines] = useState(WINE_TABLE.rows);

  const setQty = (id: string, q: number) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, q) }));

  // Functional delta so rapid clicks compound correctly (no stale closure).
  const bumpQty = (id: string, delta: number) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));

  const toggleWishlist = (id: string) =>
    setWishlisted((prev) => ({ ...prev, [id]: !prev[id] }));

  // Row ids still present in the tables (a delete removes a row here). A product
  // card is shown only while at least one of the rows it fulfils survives, so
  // deleting a row's last owner also drops its card — and its quantity from the
  // cart total below. A multi-row product (e.g. the one sugar covering three
  // rows) stays until its final row is deleted.
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

  // Cart total counts only the cards still on the page.
  const cartCount = useMemo(
    () =>
      ALL_SEARCH_PRODUCTS.reduce(
        (sum, p) => (presentIds.has(p.id) ? sum + (quantities[p.id] ?? 0) : sum),
        0,
      ),
    [presentIds, quantities],
  );

  // Rows fulfilled by a still-present product that's been zeroed out → shown red.
  const removedRowIds = useMemo(() => {
    const ids: string[] = [];
    for (const p of ALL_SEARCH_PRODUCTS) {
      if (presentIds.has(p.id) && (quantities[p.id] ?? 0) === 0) {
        ids.push(...p.rowIds);
      }
    }
    return ids;
  }, [presentIds, quantities]);

  const goToOrder = () => router.push(ORDER_ROUTE);

  function renderCard(product: SearchProduct) {
    const { id } = product;
    const quantity = quantities[id] ?? 0;
    // Spread the product's display fields; ProductCard ignores the extra page
    // metadata (id/rowIds/initialQuantity). Controlled props come after so they win.
    return (
      <ProductCard
        key={id}
        {...product}
        layout="vertical"
        descriptionLines={2}
        quantity={quantity}
        onAdd={() => setQty(id, 1)}
        onIncrement={() => bumpQty(id, 1)}
        onDecrement={() => bumpQty(id, -1)}
        isWishlisted={!!wishlisted[id]}
        onToggleWishlist={() => toggleWishlist(id)}
      />
    );
  }

  return (
    <>
      <Header cartCount={cartCount} onCartClick={goToOrder} />

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
    </>
  );
}
