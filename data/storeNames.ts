/**
 * Store Names — Component data (see components/StoreName).
 * Real thumbnails are added later via `logoSrc` (drop the file in /public and
 * point to it here); until then each store falls back to an initials avatar.
 *
 * Starting with just Home Depot while we validate the component — add the
 * rest of the stores here as their thumbnails come in.
 */
export interface StoreNameEntry {
  id: string;
  name: string;
  distanceKm: number;
  /** Public path to the store's thumbnail, once provided. */
  logoSrc?: string;
}

export const STORE_NAMES: StoreNameEntry[] = [
  { id: "home-depot", name: "Home Depot", distanceKm: 1.0, logoSrc: "/stores/home-depot.png" },
];
