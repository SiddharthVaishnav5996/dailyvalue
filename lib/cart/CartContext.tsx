"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product, Store } from "@/lib/types";
import { PRODUCT_BY_ID } from "@/lib/catalog/products";
import { STORE_BY_ID, STORE_IDS } from "@/data/stores";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  activeStoreId: string;
  activeStore: Store;
  itemCount: number;
  /** Basket subtotal at the active store. */
  subtotal: number;
  addItem: (product: Product, quantity?: number) => void;
  addMany: (products: Product[]) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  setActiveStore: (storeId: string) => void;
  isInCart: (productId: string) => boolean;
}

const ITEMS_KEY = "dailyvalue:cart";
const STORE_KEY = "dailyvalue:store";
const DEFAULT_STORE = STORE_IDS[0];

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string>(DEFAULT_STORE);
  const [hydrated, setHydrated] = useState(false);

  // Restore persisted cart on first mount (client only). Reading localStorage
  // during render / lazy init isn't SSR-safe (it would cause a hydration
  // mismatch), so we hydrate in an effect — the accepted pattern here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const rawItems = localStorage.getItem(ITEMS_KEY);
      if (rawItems) {
        const stored: { id: string; quantity: number }[] = JSON.parse(rawItems);
        const restored = stored
          .map(({ id, quantity }) => {
            const product = PRODUCT_BY_ID[id];
            return product ? { product, quantity } : null;
          })
          .filter((x): x is CartItem => x !== null);
        setItems(restored);
      }
      const storedStore = localStorage.getItem(STORE_KEY);
      if (storedStore && STORE_BY_ID[storedStore]) setActiveStoreId(storedStore);
    } catch {
      /* ignore malformed storage */
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist whenever the cart changes (after hydration, so we never clobber it).
  useEffect(() => {
    if (!hydrated) return;
    const slim = items.map((i) => ({ id: i.product.id, quantity: i.quantity }));
    localStorage.setItem(ITEMS_KEY, JSON.stringify(slim));
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORE_KEY, activeStoreId);
  }, [activeStoreId, hydrated]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  const addMany = useCallback((products: Product[]) => {
    setItems((prev) => {
      const next = [...prev];
      for (const product of products) {
        const existing = next.find((i) => i.product.id === product.id);
        if (!existing) next.push({ product, quantity: 1 });
      }
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.product.id !== productId)
        : prev.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i,
          ),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const setActiveStore = useCallback((storeId: string) => {
    if (STORE_BY_ID[storeId]) setActiveStoreId(storeId);
  }, []);

  const isInCart = useCallback(
    (productId: string) => items.some((i) => i.product.id === productId),
    [items],
  );

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const subtotal = useMemo(() => {
    const total = items.reduce(
      (sum, i) => sum + (i.product.prices[activeStoreId] ?? 0) * i.quantity,
      0,
    );
    return Math.round(total * 100) / 100;
  }, [items, activeStoreId]);

  const value: CartContextValue = {
    items,
    activeStoreId,
    activeStore: STORE_BY_ID[activeStoreId],
    itemCount,
    subtotal,
    addItem,
    addMany,
    removeItem,
    setQuantity,
    clear,
    setActiveStore,
    isInCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
