"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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

/*
 * Saved hearts, kept between visits — same reasoning as the cart, which this
 * file mirrors. A wishlist that empties on refresh is worse than no wishlist:
 * the shopper did deliberate work and watched it vanish.
 */
const STORAGE_KEY = "dailyvalue:wishlist:v1";

/** Is this parsed blob shaped like a wishlist item? */
function isWishlistItem(v: unknown): v is WishlistItem {
  const i = v as Partial<WishlistItem> | null;
  return (
    Boolean(i) &&
    typeof i!.id === "string" &&
    typeof i!.name === "string" &&
    typeof i!.price === "number"
  );
}

/**
 * App-wide wishlist, keyed by product id → its details. Shared by every
 * ProductCard heart, so the Header badge — and the wishlist popup — stay
 * accurate no matter which page saved the item. Persisted to localStorage so
 * it survives a refresh, matching CartProvider.
 */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Record<string, WishlistItem>>({});

  // Restore after the first render, then save on change. The hydration
  // reasoning and the state-not-ref flag are explained in CartContext.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const clean: Record<string, WishlistItem> = {};
          for (const [id, item] of Object.entries(parsed)) {
            if (isWishlistItem(item)) clean[id] = item;
          }
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setEntries(clean);
        }
      }
    } catch {
      // Private browsing, cleared storage, or malformed JSON. Start empty.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage full or blocked.
    }
  }, [entries, hydrated]);

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
