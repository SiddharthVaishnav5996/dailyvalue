/**
 * Category Selector — Component data (see components/CategorySelector).
 * Hover colors reuse the category tokens in styles/tokens.css.
 */
export interface CategoryEntry {
  id: string;
  label: string;
  /** CSS var name for this category's hover background. */
  hoverColorVar: string;
}

export const CATEGORIES: CategoryEntry[] = [
  { id: "dairy", label: "Dairy", hoverColorVar: "--color-category-dairy" },
  { id: "electronics", label: "Electronics", hoverColorVar: "--color-category-electronics" },
  { id: "fashion", label: "Fashion", hoverColorVar: "--color-category-fashion" },
  {
    id: "health-beauty",
    label: "Health and Beauty",
    hoverColorVar: "--color-category-health-beauty",
  },
  { id: "fresh-deals", label: "Fresh Deals", hoverColorVar: "--color-category-fresh-deals" },
  { id: "grocery", label: "Grocery", hoverColorVar: "--color-category-grocery" },
];
