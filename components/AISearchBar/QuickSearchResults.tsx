"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Text } from "@/components/Text/Text";
import { AddButton } from "@/components/AddButton/AddButton";
import { useCart } from "@/components/Cart/CartContext";
import { formatPrice } from "@/lib/format";
import type { ResolvedProduct } from "@/lib/types";
import styles from "./QuickSearchResults.module.css";

/** Wait this long after the last keystroke before asking the server. */
const DEBOUNCE_MS = 180;
/** Matches MIN_QUERY_LENGTH on the server - no point asking before then. */
const MIN_CHARS = 2;
/** Stores shown per product, and rows shown overall. */
const MAX_OFFERS_PER_PRODUCT = 4;
const MAX_ROWS = 8;

/**
 * One buyable line: a product AT one store. The same milk appears once per
 * shop, which is the entire point of the panel - the shopper is choosing where
 * to buy it, not just what.
 */
interface Row {
  /** Doubles as the cart line id - see the note in `cartLineId`. */
  id: string;
  name: string;
  storeName: string;
  price: number;
  imageSrc?: string;
  imageAlt: string;
  emoji: string;
}

/**
 * Product + store, because they are bought separately.
 *
 * Keying the cart line on the product alone would make "milk at Walmart" and
 * "milk at Metro" the same line, so adding one would light up the ADD button
 * on every other shop's row at once.
 */
function cartLineId(productId: string, storeId: string): string {
  return `${productId}__${storeId}`;
}

function toRows(products: ResolvedProduct[]): Row[] {
  const rows: Row[] = [];
  for (const product of products) {
    // Offers arrive already ranked best-first by the resolver.
    for (const offer of product.offers.slice(0, MAX_OFFERS_PER_PRODUCT)) {
      if (rows.length >= MAX_ROWS) return rows;
      rows.push({
        id: cartLineId(product.id, offer.id),
        name: product.description,
        storeName: offer.storeName,
        price: offer.price,
        // The shop's own packshot when it has one - a Great Value tub and a
        // Compliments tub are not the same photograph.
        imageSrc: offer.imageSrc ?? product.imageSrc,
        imageAlt: product.imageAlt ?? product.description,
        emoji: product.emoji,
      });
    }
  }
  return rows;
}

export interface QuickSearchResultsProps {
  /** The live contents of the search field. */
  query: string;
}

/**
 * The header search bar's instant results panel.
 *
 * The bar above it asks an AI to plan a whole shop; this answers the shopper
 * who already knows what they want. Type "milk" and the catalog hands back
 * that product priced at every store, each row addable straight to the basket
 * without ever leaving the page.
 *
 * Rows are not themselves clickable. The ADD control turns into a quantity
 * stepper once a line is in the basket, and a row that is also a button would
 * fight that stepper for the same click.
 */
export function QuickSearchResults({ query }: QuickSearchResultsProps) {
  const { quantityOf, addItem, increment, decrement } = useCart();
  /**
   * The rows, tagged with the query they answer.
   *
   * Storing the query alongside them means "are we still waiting?" is derived
   * rather than tracked: a separate loading flag would have to be set the
   * instant the query changed, i.e. synchronously inside the effect, which
   * cascades renders. It also lets the previous query's rows stay on screen
   * while the next ones are fetched, so the panel does not blink empty on
   * every keystroke.
   */
  const [results, setResults] = useState<{ query: string; rows: Row[] } | null>(null);

  const trimmed = query.trim();
  const rows = results?.rows ?? [];
  const settled = results?.query === trimmed;

  useEffect(() => {
    if (trimmed.length < MIN_CHARS) return;

    // One request per pause in typing, and the previous one is abandoned the
    // moment a new keystroke arrives - otherwise a slow answer for "mil" can
    // land after the fast one for "milk" and overwrite it.
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/quick-search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as { products?: ResolvedProduct[] };
        setResults({ query: trimmed, rows: toRows(data.products ?? []) });
      } catch {
        // An abort is the expected path on every keystroke, not a failure.
        if (!controller.signal.aborted) setResults({ query: trimmed, rows: [] });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  if (trimmed.length < MIN_CHARS) return null;

  return (
    <div className={styles.panel} role="region" aria-label="Product results">
      {rows.length > 0 ? (
        <ul className={styles.list}>
          {rows.map((row) => {
            const quantity = quantityOf(row.id);
            return (
              <li key={row.id} className={styles.row}>
                <span className={styles.thumb} aria-hidden="true">
                  {row.imageSrc ? (
                    <Image
                      src={row.imageSrc}
                      alt=""
                      width={40}
                      height={40}
                      className={styles.thumbImg}
                    />
                  ) : (
                    <span className={styles.emoji}>{row.emoji}</span>
                  )}
                </span>

                {/* One wrapper so these can stack on a phone; on wider screens
                    it is display:contents and they stay separate columns. */}
                <span className={styles.info}>
                  <Text as="span" variant="normalRegular" className={styles.name}>
                    {row.name}
                  </Text>
                  <Text as="span" variant="normalRegular" className={styles.store}>
                    {row.storeName}
                  </Text>
                </span>

                <Text as="span" variant="normalBold" className={styles.price}>
                  {formatPrice(row.price)}
                </Text>

                <span className={styles.addCell}>
                  <AddButton
                    iconOnly
                    // The same milk is listed once per shop, so the shop is
                    // part of what tells these buttons apart.
                    itemName={`${row.name} from ${row.storeName}`}
                    quantity={quantity}
                    onAdd={() =>
                      addItem({
                        id: row.id,
                        name: row.name,
                        price: row.price,
                        imageSrc: row.imageSrc,
                        imageAlt: row.imageAlt,
                        storeName: row.storeName,
                      })
                    }
                    onIncrement={() => increment(row.id)}
                    onDecrement={() => decrement(row.id)}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <Text as="p" variant="normalRegular" className={styles.status}>
          {settled ? `No products match “${trimmed}”.` : "Searching…"}
        </Text>
      )}
    </div>
  );
}
