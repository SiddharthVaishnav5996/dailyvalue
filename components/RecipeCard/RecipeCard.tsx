"use client";

import { useId, useState } from "react";
import { Bookmark, BookmarkCheck, Share2 } from "lucide-react";
import { Text } from "@/components/Text/Text";
import { AddButton } from "@/components/AddButton/AddButton";
import { useSavedRecipes } from "@/lib/recipe/SavedRecipesContext";
import { shareRecipe } from "@/lib/recipe/share";
import type { AIRecipe } from "@/lib/types";
import styles from "./RecipeCard.module.css";

export interface RecipeCardProps {
  recipe: AIRecipe;
  className?: string;
}

/** "Serves 9 · Prep 15 min · Cook 25 min" */
function metaLine(recipe: AIRecipe): string {
  const parts = [`Serves ${recipe.servings}`];
  if (recipe.prepTime) parts.push(`Prep ${recipe.prepTime}`);
  if (recipe.cookTime) parts.push(`Cook ${recipe.cookTime}`);
  return parts.join(" · ");
}

/**
 * A written recipe, shown inside the AI's reply bubble in the chat.
 *
 * It deliberately has no background of its own: it sits in the bubble that
 * ChatMessage already paints, so it reads as part of the AI's answer rather
 * than a separate panel. Sections are divided with hairlines instead.
 *
 * Three things can be done with it, and they are different jobs rather than
 * three ways to do one:
 *
 *   Download PDF  a file, for a printer or a phone in a kitchen. The PDF code
 *                 is heavy, so it is only fetched the first time someone taps
 *                 the button - see lib/recipe/pdf.ts.
 *   Save          keep it in the app. It then appears under Saved Recipes in
 *                 the account menu, with no second trip to the AI.
 *   Share         hand it to another person right now, through the system
 *                 share sheet or the clipboard - see lib/recipe/share.ts.
 */
export function RecipeCard({ recipe, className }: RecipeCardProps) {
  const titleId = useId();
  const [status, setStatus] = useState<"idle" | "working" | "failed">("idle");

  const { isSaved, toggleSaved } = useSavedRecipes();
  const saved = isSaved(recipe);

  /**
   * What the Share button last did, so it can say so.
   *
   * "copied" is not a failure - it is what happens on a desktop browser with
   * no share sheet - so it gets its own value rather than being folded in with
   * the error. Same reasoning as `status` above: name the states, do not try
   * to infer them from a pair of booleans.
   */
  const [shareResult, setShareResult] = useState<"idle" | "copied" | "failed">("idle");

  async function handleDownload() {
    setStatus("working");
    try {
      // Loaded on demand, so the chat page never pays for it up front.
      const { downloadRecipePdf } = await import("@/lib/recipe/pdf");
      downloadRecipePdf(recipe);
      setStatus("idle");
    } catch (err) {
      // Most likely the PDF code could not be fetched - for example the phone
      // went offline between loading the page and tapping the button.
      console.error("[RecipeCard] PDF download failed:", err);
      setStatus("failed");
    }
  }

  async function handleShare() {
    const outcome = await shareRecipe(recipe);
    // The share sheet is its own confirmation, so only the clipboard path and
    // an outright failure need a word from us.
    setShareResult(outcome === "shared" ? "idle" : outcome);
  }

  return (
    <section
      className={[styles.recipe, className].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
    >
      <header className={styles.head}>
        <Text as="h3" variant="mediumBold" id={titleId}>
          {recipe.title}
        </Text>
        <Text as="p" variant="normalRegular" className={styles.meta}>
          {metaLine(recipe)}
        </Text>
      </header>

      {recipe.ingredients.length > 0 && (
        <div className={styles.block}>
          <Text as="h4" variant="smallBold" className={styles.label}>
            Ingredients
          </Text>
          <ul className={styles.ingredients}>
            {recipe.ingredients.map((ingredient, i) => (
              <li key={i}>
                <Text as="span" variant="normalRegular">
                  {ingredient}
                </Text>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.block}>
        <Text as="h4" variant="smallBold" className={styles.label}>
          Method
        </Text>
        <ol className={styles.steps}>
          {recipe.steps.map((step, i) => (
            <li key={i} className={styles.step}>
              {/* Decorative: the list already tells assistive tech the order. */}
              <span className={styles.stepNumber} aria-hidden="true">
                {i + 1}
              </span>
              <Text as="span" variant="normalRegular">
                {step}
              </Text>
            </li>
          ))}
        </ol>
      </div>

      {recipe.tips.length > 0 && (
        <div className={styles.block}>
          <Text as="h4" variant="smallBold" className={styles.label}>
            Tips
          </Text>
          <ul className={styles.tips}>
            {recipe.tips.map((tip, i) => (
              <li key={i}>
                <Text as="span" variant="normalRegular">
                  {tip}
                </Text>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.actions}>
        <AddButton
          label={status === "working" ? "Preparing PDF…" : "Download PDF"}
          showIcon={false}
          disabled={status === "working"}
          onAdd={handleDownload}
        />

        <button
          type="button"
          className={[styles.action, saved ? styles.actionOn : ""].filter(Boolean).join(" ")}
          onClick={() => toggleSaved(recipe)}
          // aria-pressed is what tells a screen reader this is a toggle that is
          // currently on, rather than a button that does something new.
          aria-pressed={saved}
        >
          {saved ? (
            <BookmarkCheck size={16} aria-hidden="true" />
          ) : (
            <Bookmark size={16} aria-hidden="true" />
          )}
          <Text as="span" variant="xsmallBold">
            {saved ? "Saved" : "Save"}
          </Text>
        </button>

        <button type="button" className={styles.action} onClick={handleShare}>
          <Share2 size={16} aria-hidden="true" />
          <Text as="span" variant="xsmallBold">
            {shareResult === "copied" ? "Copied" : "Share"}
          </Text>
        </button>

        {status === "failed" && (
          <Text as="p" variant="smallRegular" role="status" className={styles.error}>
            The PDF could not be created. Check your connection and try again.
          </Text>
        )}
        {shareResult === "copied" && (
          <Text as="p" variant="smallRegular" role="status" className={styles.note}>
            Recipe copied — paste it wherever you like.
          </Text>
        )}
        {shareResult === "failed" && (
          <Text as="p" variant="smallRegular" role="status" className={styles.error}>
            This browser would not let us share or copy. Download the PDF instead.
          </Text>
        )}
      </div>
    </section>
  );
}
