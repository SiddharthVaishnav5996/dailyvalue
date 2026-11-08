import type { ResolvedProduct } from "@/lib/types";

/*
 * Swapping a card over to another variant.
 * ---------------------------------------------------------------------------
 * The whole switch happens in the browser, with no request and no waiting,
 * because every member of the family was already resolved by the server - see
 * resolveFamily in lib/catalog/resolve.ts. The shopper presses "Skim" and a
 * complete card is already sitting there: its own title, its own packshot,
 * its own price at all seven shops.
 *
 * This file is deliberately tiny and imports nothing but a type. It is used by
 * a client component, and lib/catalog/resolve.ts - where this logic would
 * otherwise naturally live - pulls in Fuse.js and the whole 2,200-product
 * catalog. Importing that into the browser to rearrange an object already in
 * memory would be a megabyte spent on nothing.
 */

/**
 * The product a card should show, given the variant the shopper chose.
 *
 * IDENTITY STAYS WITH THE SLOT, NOT THE VARIANT. The returned product keeps
 * the original card's `id`, `rowIds` and `quantity`, and takes everything the
 * shopper can see - title, photograph, brand, offers - from the chosen member.
 *
 * That split is the point. `id` is what the page's basket is keyed by, what
 * the wishlist remembers, and what ties the card to the table rows it answers.
 * Letting it change with the variant would empty the basket and orphan the
 * rows every time somebody switched from 2% to skim. The shopper asked for one
 * thing in one place on the list; which kind of it they want is a different
 * question from which line of the list it is.
 *
 * The cost of that choice, stated plainly: the cart records the slot's id with
 * the chosen variant's NAME and PRICE. Two different searches that both land
 * on the milk slot share an id, so a basket cannot hold skim and whole milk as
 * two separate lines. For a shopping list - one entry per thing to buy - that
 * is the behaviour you want anyway.
 *
 * Returns the product untouched when there is nothing to do, so this is safe
 * to call on everything.
 */
export function applyVariant(
  product: ResolvedProduct,
  key: string | undefined,
): ResolvedProduct {
  const family = product.variantFamily;
  if (!family || !key || key === family.selected) return product;

  const option = family.members.find((m) => m.key === key);
  // A key that names nothing - stale state after a new search - leaves the
  // card alone rather than blanking it.
  if (!option) return product;

  return {
    ...option.product,
    id: product.id,
    rowIds: product.rowIds,
    quantity: product.quantity,
    // The family travels with the card and remembers the new answer, so the
    // chooser stays open-able and shows the right tick.
    variantFamily: { ...family, selected: key },
  };
}
