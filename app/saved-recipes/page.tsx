"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/Header/Header";
import { Footer } from "@/components/Footer/Footer";
import { Text } from "@/components/Text/Text";
import { AddButton } from "@/components/AddButton/AddButton";
import { RecipeCard } from "@/components/RecipeCard/RecipeCard";
import { useSavedRecipes } from "@/lib/recipe/SavedRecipesContext";
import styles from "./page.module.css";

/**
 * Saved Recipes — reached from the account menu.
 *
 * Every recipe the shopper kept, newest first, each one the SAME RecipeCard
 * the chat shows. Reusing it rather than writing a second, flatter version
 * means there is one place a recipe is laid out, and the Save button on each
 * card already reads "Saved" here — so pressing it is how a recipe is removed.
 * One control, one meaning, in both places it appears.
 */
export default function SavedRecipesPage() {
  const router = useRouter();
  const { saved } = useSavedRecipes();

  return (
    <>
      <Header />

      <main className={styles.main}>
        <div className={styles.content}>
          <header className={styles.head}>
            <Text as="h1" variant="heading4">
              Saved Recipes
            </Text>
            <Text as="p" variant="normalRegular" className={styles.subhead}>
              {saved.length === 0
                ? "Recipes you keep from the chat will appear here."
                : `${saved.length} ${saved.length === 1 ? "recipe" : "recipes"}, kept on this device.`}
            </Text>
          </header>

          {saved.length === 0 ? (
            <div className={styles.empty}>
              <Text as="p" variant="mediumBold">
                Nothing saved yet
              </Text>
              <Text as="p" variant="normalRegular" className={styles.emptyText}>
                Ask for a dish in the search bar, then press Save on the recipe.
              </Text>
              <AddButton label="Find a recipe" showIcon={false} onAdd={() => router.push("/")} />
            </div>
          ) : (
            <ul className={styles.list}>
              {saved.map((entry) => (
                <li key={entry.id} className={styles.card}>
                  <RecipeCard recipe={entry.recipe} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
