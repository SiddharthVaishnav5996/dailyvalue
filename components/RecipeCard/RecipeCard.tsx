"use client";

import { useId, useState } from "react";
import { Text } from "@/components/Text/Text";
import { AddButton } from "@/components/AddButton/AddButton";
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
 * Download PDF builds the file on the device. The PDF code is heavy, so it is
 * only fetched the first time someone taps the button (see lib/recipe/pdf.ts).
 */
export function RecipeCard({ recipe, className }: RecipeCardProps) {
  const titleId = useId();
  const [status, setStatus] = useState<"idle" | "working" | "failed">("idle");

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
        {status === "failed" && (
          <Text as="p" variant="smallRegular" role="status" className={styles.error}>
            The PDF could not be created. Check your connection and try again.
          </Text>
        )}
      </div>
    </section>
  );
}
