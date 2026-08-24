"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/** A saved item. Carries enough detail for any page to render it (e.g. the
 *  wishlist popup) without a cross-catalog product lookup — same shape as a
 *  cart line, minus the quantity a wishlist doesn't track. */
export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  imageSrc?: string;
  imageAlt?: string;
  storeName?: string;
  storeLogoSrc?: string;
}

interface WishlistContextValue {
  /** Saved items, in the order they were added. */
  items: WishlistItem[];
  /** Number of saved items — drives the Header badge. */
  count: number;
  isWishlisted: (id: string) => boolean;
  /** Save it, or un-save it if it's already saved. */
  toggleWishlist: (item: WishlistItem) => void;
  /** Take it out of the wishlist. */
  remove: (id: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

/**
 * App-wide wishlist, keyed by product id → its details. Shared by every
 * ProductCard heart, so the Header badge — and the wishlist popup — stay
 * accurate no matter which page saved the item. In-memory for now (swap for a
 * persisted/backed store later), matching CartProvider.
 */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Record<string, WishlistItem>>({});

  const toggleWishlist = useCallback((item: WishlistItem) => {
    setEntries((prev) => {
      if (prev[item.id]) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return { ...prev, [item.id]: item };
    });
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const isWishlisted = useCallback((id: string) => id in entries, [entries]);

  const items = useMemo(() => Object.values(entries), [entries]);
  const count = items.length;

  const value = useMemo(
    () => ({ items, count, isWishlisted, toggleWishlist, remove }),
    [items, count, isWishlisted, toggleWishlist, remove],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
