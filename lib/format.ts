/** Format a number as a CAD price, e.g. 4.5 → "$4.50". */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}
