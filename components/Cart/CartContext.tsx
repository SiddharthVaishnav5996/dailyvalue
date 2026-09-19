"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/** A line in the cart. Carries enough detail for any page to render it (e.g.
 *  the checkout list) without a cross-catalog product lookup. */
export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageSrc?: string;
  imageAlt?: string;
  storeName?: string;
  storeLogoSrc?: string;
  quantity: number;
}

/** Everything needed to add a line — quantity is managed by the cart. */
export type CartItemInput = Omit<CartItem, "quantity">;

interface CartContextValue {
  /** Lines currently in the cart (quantity > 0), in the order they were added. */
  items: CartItem[];
  /** Total quantity across all lines — drives the Header badge. */
  count: number;
  /** Sum of price × quantity. */
  subtotal: number;
  quantityOf: (id: string) => number;
  /** Is this id tracked at all (even at quantity 0)? Used to avoid re-seeding
   *  an item the user has removed. */
  isTracked: (id: string) => boolean;
  /** "ADD" — put one in the cart (stores its details; no-op if already in). */
  addItem: (item: CartItemInput) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  /** Take a line out of the cart (kept tracked at 0 — see note below). */
  remove: (id: string) => void;
  /** Seed a line at a set quantity only if it isn't tracked yet (recipe
   *  pre-load). Leaves the user's own changes — including removals — alone. */
  ensureItem: (item: CartItemInput, quantity: number) => void;
  /** Put a line in at an exact quantity, adding or replacing. Used to commit
   *  a confirmed selection in one go. */
  setItemQuantity: (item: CartItemInput, quantity: number) => void;
  /** Forget these lines completely — unlike remove, which keeps them at 0. */
  dropItems: (ids: string[]) => void;
  /** Empty the cart entirely — used once an order is placed. */
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * App-wide cart, keyed by product id → { details, quantity }. Shared by every
 * page — the landing storefront, the AI-result products page, and checkout —
 * so a basket built anywhere is the same basket everywhere. In-memory for now
 * (swap for a persisted/backed cart later).
 *
 * Removed lines are kept at quantity 0 (not deleted) so `ensureItem` won't
 * re-add something the user took out when a page re-seeds on revisit.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Record<string, CartItem>>({});

  const addItem = useCallback((item: CartItemInput) => {
    setEntries((prev) => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: { ...item, quantity: existing?.quantity ? existing.quantity : 1 },
      };
    });
  }, []);

  const increment = useCallback((id: string) => {
    setEntries((prev) =>
      prev[id]
        ? { ...prev, [id]: { ...prev[id], quantity: prev[id].quantity + 1 } }
        : prev,
    );
  }, []);

  const decrement = useCallback((id: string) => {
    setEntries((prev) =>
      prev[id]
        ? { ...prev, [id]: { ...prev[id], quantity: Math.max(0, prev[id].quantity - 1) } }
        : prev,
    );
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) =>
      prev[id] ? { ...prev, [id]: { ...prev[id], quantity: 0 } } : prev,
    );
  }, []);

  const ensureItem = useCallback((item: CartItemInput, quantity: number) => {
    setEntries((prev) =>
      prev[item.id] ? prev : { ...prev, [item.id]: { ...item, quantity } },
    );
  }, []);

  /**
   * Put a line in at an exact quantity, adding it or replacing what is there.
   *
   * This is what "confirm my selection" needs. addItem always lands on 1 and
   * increment only steps, so committing a basket of "2 of these, 1 of those"
   * would otherwise mean a loop of increments.
   */
  const setItemQuantity = useCallback((item: CartItemInput, quantity: number) => {
    setEntries((prev) => ({
      ...prev,
      [item.id]: { ...item, quantity: Math.max(0, Math.round(quantity)) },
    }));
  }, []);

  /**
   * Forget these lines completely.
   *
   * Different from `remove`, which keeps a line tracked at quantity 0 so a page
   * re-seeding cannot resurrect something the shopper deleted. Here the lines
   * belong to a search that is over, so there is nothing to protect and leaving
   * them tracked would only leak memory and confuse `isTracked`.
   */
  const dropItems = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setEntries((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
  }, []);

  const clear = useCallback(() => setEntries({}), []);

  const quantityOf = useCallback((id: string) => entries[id]?.quantity ?? 0, [entries]);
  const isTracked = useCallback((id: string) => id in entries, [entries]);

  const items = useMemo(
    () => Object.values(entries).filter((i) => i.quantity > 0),
    [entries],
  );

  const count = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100,
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      count,
      subtotal,
      quantityOf,
      isTracked,
      addItem,
      increment,
      decrement,
      remove,
      ensureItem,
      setItemQuantity,
      dropItems,
      clear,
    }),
    [items, count, subtotal, quantityOf, isTracked, addItem, increment, decrement, remove, ensureItem, setItemQuantity, dropItems, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
