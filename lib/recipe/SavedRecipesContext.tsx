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
import type { AIRecipe } from "@/lib/types";

/*
 * Recipes the shopper kept.
 * ---------------------------------------------------------------------------
 * Downloading a PDF is for taking a recipe somewhere else - a printer, a
 * phone in a kitchen. Saving is for keeping it HERE, so it can be found again
 * from the account menu without asking the AI a second time.
 *
 * Two different jobs, so two different buttons.
 *
 * WHERE IT LIVES, AND WHY
 *
 * localStorage, in the browser. The same reasoning as the brand favourites in
 * lib/brand/BrandPreferenceContext.tsx: a search result should die with the
 * tab (sessionStorage), but something the shopper deliberately kept should
 * outlive it. There is no account server in this project, so "saved" means
 * saved on this device - and the saved-recipes page says so rather than
 * pretending otherwise.
 */

const STORAGE_KEY = "dailyvalue:recipes:v1";

export interface SavedRecipe {
  /** Slug of the title. Saving the same dish twice replaces it. */
  id: string;
  recipe: AIRecipe;
  /** ISO timestamp, so the list can be shown newest first. */
  savedAt: string;
}

interface SavedRecipesValue {
  /** Newest first. */
  saved: SavedRecipe[];
  isSaved: (recipe: AIRecipe) => boolean;
  /** Save, or un-save if it is already there. Returns the state it ended in. */
  toggleSaved: (recipe: AIRecipe) => boolean;
  remove: (id: string) => void;
}

const SavedRecipesContext = createContext<SavedRecipesValue | null>(null);

/**
 * "Fried Rice for 6" -> "fried-rice-for-6".
 *
 * Deliberately a copy of the slug in lib/recipe/pdf.ts rather than an import.
 * That module pulls in jsPDF, a few hundred kilobytes that the chat page is
 * careful to load only when someone presses Download - importing it here would
 * quietly undo that, because this context loads with the app.
 */
function recipeId(recipe: AIRecipe): string {
  return (
    recipe.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "recipe"
  );
}

export function SavedRecipesProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<SavedRecipe[]>([]);

  // Restore once, after hydration - reading storage during the first render
  // would make the browser's HTML differ from the server's. See the note in
  // lib/search/SearchContext.tsx.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaved(
        parsed.filter(
          (entry): entry is SavedRecipe =>
            Boolean(entry) &&
            typeof entry.id === "string" &&
            Boolean(entry.recipe) &&
            Array.isArray(entry.recipe?.steps),
        ),
      );
    } catch {
      // Private browsing, cleared storage, or malformed JSON.
    }
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Storage full or blocked. Saving just will not outlive the tab.
    }
  }, [saved]);

  const isSaved = useCallback(
    (recipe: AIRecipe) => saved.some((entry) => entry.id === recipeId(recipe)),
    [saved],
  );

  const toggleSaved = useCallback((recipe: AIRecipe) => {
    const id = recipeId(recipe);
    let nowSaved = false;

    setSaved((current) => {
      const existing = current.findIndex((entry) => entry.id === id);
      if (existing !== -1) {
        nowSaved = false;
        return current.filter((entry) => entry.id !== id);
      }
      nowSaved = true;
      // Newest first, so the account page opens on what was just kept.
      return [{ id, recipe, savedAt: new Date().toISOString() }, ...current];
    });

    return nowSaved;
  }, []);

  const remove = useCallback((id: string) => {
    setSaved((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const value = useMemo<SavedRecipesValue>(
    () => ({ saved, isSaved, toggleSaved, remove }),
    [saved, isSaved, toggleSaved, remove],
  );

  return (
    <SavedRecipesContext.Provider value={value}>{children}</SavedRecipesContext.Provider>
  );
}

/** Read the shopper's saved recipes. Throws if used outside the provider. */
export function useSavedRecipes(): SavedRecipesValue {
  const ctx = useContext(SavedRecipesContext);
  if (!ctx) {
    throw new Error("useSavedRecipes must be used inside a SavedRecipesProvider");
  }
  return ctx;
}
