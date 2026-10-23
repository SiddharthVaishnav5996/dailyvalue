"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/*
 * The brands a shopper keeps coming back to.
 * ---------------------------------------------------------------------------
 * People do not only choose a shop. They choose a brand, and they will pay
 * more for it: someone who likes Great Value white bread wants Great Value
 * white bread, and a cheaper loaf under a different name is not the same
 * answer to the question they asked.
 *
 * So the app remembers. Mark a brand as a favourite once and every later
 * search opens on that brand wherever it is available, instead of opening on
 * whatever happened to be cheapest.
 *
 * THREE DECISIONS WORTH EXPLAINING
 *
 * 1. This lives in the BROWSER, not on the server. Nothing about a shopper's
 *    taste is ever sent anywhere. The server ranks offers by price and rating,
 *    exactly as before, and the browser re-picks the opening one if it knows
 *    better. A preference is a private thing, and this is the cheapest way to
 *    keep it that way.
 *
 * 2. localStorage, not sessionStorage. A search result should die with the
 *    tab - see lib/search/SearchContext.tsx, which uses sessionStorage for
 *    exactly that reason. A favourite brand should not. It is the one piece of
 *    this app worth keeping until the shopper says otherwise.
 *
 * 3. Stored by NAME, not by id. Brands arrive from three places - this
 *    project's own list, the catalog, and whatever the model decides to call
 *    something - and only the printed name is common to all three.
 */

const STORAGE_KEY = "dailyvalue:brands:v1";

interface BrandPreferenceValue {
  /** Every brand marked as a favourite, in the order they were added. */
  preferred: string[];
  isPreferred: (brand: string | undefined) => boolean;
  togglePreferred: (brand: string) => void;
  /**
   * Pick the offer this shopper should see first.
   *
   * Falls back to whatever the server ranked first, so a shopper with no
   * favourites sees exactly what they saw before this existed.
   */
  preferredFirst: <T extends { brand?: string }>(offers: T[]) => T | undefined;
}

const BrandPreferenceContext = createContext<BrandPreferenceValue | null>(null);

/** Compare brand names the way people write them: "Presidents" === "President's". */
const flatten = (brand: string) => brand.toLowerCase().replace(/[^a-z0-9]/g, "");

export function BrandPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [preferred, setPreferred] = useState<string[]>([]);

  // Restore once, after hydration.
  //
  // Reading storage during the first render would make the browser produce
  // different HTML from the server, which React reports as a hydration
  // mismatch. An effect runs after hydration has finished, which is the one
  // safe moment. Same reasoning as SearchContext - see the note there.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPreferred(parsed.filter((b): b is string => typeof b === "string"));
      }
    } catch {
      // Private browsing, cleared storage, or malformed JSON. Not worth a crash.
    }
  }, []);

  // Mirror every change back.
  useEffect(() => {
    if (!restored.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferred));
    } catch {
      // Storage full or blocked. Preferences just will not outlive the tab.
    }
  }, [preferred]);

  const isPreferred = useCallback(
    (brand: string | undefined) =>
      Boolean(brand) && preferred.some((p) => flatten(p) === flatten(brand!)),
    [preferred],
  );

  const togglePreferred = useCallback((brand: string) => {
    const name = brand.trim();
    if (!name) return;
    setPreferred((current) =>
      current.some((p) => flatten(p) === flatten(name))
        ? current.filter((p) => flatten(p) !== flatten(name))
        : [...current, name],
    );
  }, []);

  const preferredFirst = useCallback(
    <T extends { brand?: string }>(offers: T[]): T | undefined =>
      offers.find((o) => isPreferred(o.brand)) ?? offers[0],
    [isPreferred],
  );

  const value = useMemo<BrandPreferenceValue>(
    () => ({ preferred, isPreferred, togglePreferred, preferredFirst }),
    [preferred, isPreferred, togglePreferred, preferredFirst],
  );

  return (
    <BrandPreferenceContext.Provider value={value}>{children}</BrandPreferenceContext.Provider>
  );
}

/** Read the shopper's brand favourites. Throws if used outside the provider. */
export function useBrandPreferences(): BrandPreferenceValue {
  const ctx = useContext(BrandPreferenceContext);
  if (!ctx) {
    throw new Error("useBrandPreferences must be used inside a BrandPreferenceProvider");
  }
  return ctx;
}
