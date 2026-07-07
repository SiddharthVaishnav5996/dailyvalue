import type { Comparison, Product, StoreTotal } from "@/lib/types";
import { STORE_IDS } from "@/data/stores";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A basket line: a product (or null if unmatched) and how many to buy. */
export interface BasketLine {
  product: Product | null;
  quantity: number;
}

/**
 * Compare a basket across every store: sum each store's price for the matched
 * products and rank cheapest → most expensive. Pure + fuse-free so it can run
 * on the client (e.g. recomputing the cart total when the store changes).
 */
export function compare(
  items: BasketLine[],
  storeIds: string[] = STORE_IDS,
): Comparison {
  const totals: StoreTotal[] = storeIds.map((storeId) => {
    let total = 0;
    let itemCount = 0;
    for (const item of items) {
      const price = item.product?.prices[storeId];
      if (typeof price === "number") {
        total += price * item.quantity;
        itemCount++;
      }
    }
    return { storeId, total: round2(total), itemCount };
  });

  const sorted = [...totals].sort((a, b) => a.total - b.total);
  const cheapest = sorted[0];
  const dearest = sorted[sorted.length - 1];

  return {
    byStore: sorted,
    cheapestStoreId: cheapest?.storeId ?? storeIds[0],
    cheapestTotal: cheapest?.total ?? 0,
    mostExpensiveTotal: dearest?.total ?? 0,
    savings: round2((dearest?.total ?? 0) - (cheapest?.total ?? 0)),
  };
}
