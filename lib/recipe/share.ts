import type { AIRecipe } from "@/lib/types";

/*
 * Sending a recipe to someone else.
 * ---------------------------------------------------------------------------
 * Three ways to get a recipe out of the app, and they are genuinely different
 * jobs rather than three buttons doing the same thing:
 *
 *   Download  a PDF file, for a printer or a phone in a kitchen
 *   Save      keep it in the app, findable again from the account menu
 *   Share     hand it to another person, now
 *
 * WHY PLAIN TEXT AND NOT A LINK
 *
 * A link would be the obvious thing to share. It would also be broken: this
 * app has no server-side store of recipes, so a link to one would resolve to
 * nothing on the other person's phone. Text always arrives, in any app, on any
 * device, and it is readable the moment it lands.
 */

/** The recipe as something you would happily paste into a message. */
export function recipeAsText(recipe: AIRecipe): string {
  const lines: string[] = [recipe.title];

  const meta = [`Serves ${recipe.servings}`];
  if (recipe.prepTime) meta.push(`Prep ${recipe.prepTime}`);
  if (recipe.cookTime) meta.push(`Cook ${recipe.cookTime}`);
  lines.push(meta.join(" · "), "");

  if (recipe.ingredients.length > 0) {
    lines.push("INGREDIENTS");
    for (const ingredient of recipe.ingredients) lines.push(`• ${ingredient}`);
    lines.push("");
  }

  lines.push("METHOD");
  recipe.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));

  if (recipe.tips.length > 0) {
    lines.push("", "TIPS");
    for (const tip of recipe.tips) lines.push(`• ${tip}`);
  }

  lines.push("", "Shared from DailyValue");
  return lines.join("\n");
}

/** How the recipe actually left the device, so the button can say so. */
export type ShareOutcome = "shared" | "copied" | "failed";

/**
 * Hand the recipe to whatever the device offers.
 *
 * On a phone, and on Safari and Edge on the desktop, `navigator.share` opens
 * the system share sheet - messages, mail, notes, whatever is installed. Most
 * desktop browsers do not have it, so the text goes to the clipboard instead
 * and the caller tells the shopper it was copied.
 *
 * Both paths need a real user gesture behind them, which is why this is called
 * straight from the button's click handler and never from an effect.
 */
export async function shareRecipe(recipe: AIRecipe): Promise<ShareOutcome> {
  const text = recipeAsText(recipe);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: recipe.title, text });
      return "shared";
    } catch (err) {
      // Dismissing the share sheet rejects with AbortError. That is the
      // shopper changing their mind, not a failure, so say nothing and do
      // not fall through to copying something they decided against.
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
      // Anything else - a browser that lists share but refuses this payload -
      // falls through to the clipboard below.
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    // The modern clipboard API is permission-gated and gets refused more often
    // than you would expect - an embedded webview, an insecure origin, a
    // policy. Fall through to the old way, which asks no permission.
  }

  return copyTheOldWay(text) ? "copied" : "failed";
}

/**
 * Copy by selecting hidden text and running the browser's own copy command.
 *
 * `document.execCommand("copy")` is deprecated and still works everywhere,
 * which is exactly why it is here rather than instead of the modern API: it is
 * the fallback, not the plan. It needs no permission because, as far as the
 * browser is concerned, the shopper selected some text and pressed copy.
 *
 * The textarea is positioned off-screen rather than hidden with
 * `display: none`, because a truly hidden element cannot be selected and the
 * copy would quietly do nothing.
 */
function copyTheOldWay(text: string): boolean {
  if (typeof document === "undefined") return false;

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.top = "-9999px";
  field.style.opacity = "0";
  document.body.appendChild(field);

  try {
    field.select();
    field.setSelectionRange(0, text.length); // iOS needs this as well as select()
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
