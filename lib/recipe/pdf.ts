import { jsPDF } from "jspdf";
import type { AIRecipe } from "@/lib/types";

/*
 * Recipe -> PDF, entirely in the browser.
 * ---------------------------------------------------------------------------
 * No server is involved. The recipe is already on the page, so whatever device
 * is showing it builds the file and hands it to the browser. That keeps it
 * fast, free, and working even when the server is busy.
 *
 * This works everywhere, not just on phones. jsPDF delivers the finished file
 * through FileSaver, which picks the best route the browser offers:
 *
 *   1. A link with a `download` attribute - every current browser, desktop and
 *      mobile alike. The file lands in the usual downloads location.
 *   2. `msSaveOrOpenBlob` - legacy Edge and Internet Explorer.
 *   3. Opening the PDF in a new tab - very old Safari, which has no way to
 *      download. The reader can then save it from the viewer.
 *
 * This module is heavy (jsPDF is a few hundred kilobytes), so nothing imports
 * it up front. RecipeCard loads it with `await import(...)` the moment someone
 * presses Download, which keeps it out of the page's initial download entirely.
 *
 * Units are PDF points: 72 points = 1 inch. The page is US Letter, which is
 * what Canadian and American home printers are loaded with.
 */

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 56;
const TOP = 64;
/** Content stops here, leaving room for the footer. */
const BOTTOM_LIMIT = PAGE_HEIGHT - 72;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

// Colours from styles/tokens.css, so the PDF looks like the app.
const BRAND = "#413a78"; // --color-primary
const INK = "#1a1a1a";
const MUTED = "#6f6f6f"; // --color-disabled-text
const RULE = "#dadada"; // --color-disabled

/* ---------------------------------------------------------------------------
 * Text the PDF can actually draw
 *
 * A PDF made without embedding a font uses one of fourteen "standard" fonts
 * built into every PDF reader. They are free and tiny, but they only know
 * about 220 characters: English letters, accented letters like é, and a few
 * symbols such as ½ ° and ×. Anything else - ⅓, curly quotes on some readers,
 * emoji - prints as garbage or blank boxes.
 *
 * Embedding a full font would fix that and add hundreds of kilobytes to every
 * download. Converting the handful of characters recipes actually use is the
 * cheaper and more reliable answer.
 * ------------------------------------------------------------------------ */

const FRACTIONS: Record<string, string> = {
  "⅐": "1/7", "⅑": "1/9", "⅒": "1/10", "⅓": "1/3",
  "⅔": "2/3", "⅕": "1/5", "⅖": "2/5", "⅗": "3/5",
  "⅘": "4/5", "⅙": "1/6", "⅚": "5/6", "⅛": "1/8",
  "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
};

/** Rewrite text into characters the built-in PDF fonts can draw. */
export function pdfSafe(text: string): string {
  return text
    .replace(/[⅐-⅞]/g, (c) => FRACTIONS[c] ?? "")
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/…/g, "...")
    .replace(/℃/g, "C")
    .replace(/℉/g, "F")
    .replace(/[ -​  ]/g, " ")
    // Whatever is left outside basic Latin and Latin-1 cannot be drawn.
    .replace(/[^\x20-\x7E -ÿ]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** "Creamy Alfredo Pasta" -> "creamy-alfredo-pasta-recipe.pdf" */
export function recipeFileName(recipe: AIRecipe): string {
  const slug = pdfSafe(recipe.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${slug || "dailyvalue"}-recipe.pdf`;
}

/** "Serves 9  ·  Prep 15 min  ·  Cook 25 min" */
export function recipeMeta(recipe: AIRecipe): string {
  const parts = [`Serves ${recipe.servings}`];
  if (recipe.prepTime) parts.push(`Prep ${recipe.prepTime}`);
  if (recipe.cookTime) parts.push(`Cook ${recipe.cookTime}`);
  return parts.join("  ·  ");
}

/* ---------------------------------------------------------------------------
 * Layout
 * ------------------------------------------------------------------------ */

export interface RecipePdfOptions {
  /** Printed in the footer. Pass a fixed date to make output reproducible. */
  generatedAt?: Date;
}

/**
 * Lay the recipe out as a PDF document and return it, without saving.
 *
 * Kept separate from downloading so it can be tested: a script can build the
 * document and inspect it, while only the browser ever triggers a save.
 */
export function buildRecipePdf(recipe: AIRecipe, options: RecipePdfOptions = {}): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  doc.setProperties({
    title: pdfSafe(recipe.title),
    subject: "Recipe",
    creator: "DailyValue",
  });

  let y = TOP;

  /** Start a new page if the next `height` points would run into the footer. */
  const ensureRoom = (height: number) => {
    if (y + height > BOTTOM_LIMIT) {
      doc.addPage();
      y = TOP;
    }
  };

  /** Wrap text to a width, after making it printable. */
  const wrap = (text: string, width: number): string[] =>
    doc.splitTextToSize(pdfSafe(text), width) as string[];

  const heading = (label: string) => {
    // Keep a heading with at least two lines of what follows it, so a section
    // title never sits alone at the bottom of a page.
    ensureRoom(18 + 36);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(BRAND);
    doc.text(label, MARGIN_X, y);
    y += 18;
  };

  const bulletList = (entries: string[], style: "normal" | "italic") => {
    doc.setFontSize(11);
    for (const entry of entries) {
      const lines = wrap(entry, CONTENT_WIDTH - 14);
      ensureRoom(lines.length * 15.5);
      doc.setFillColor(BRAND);
      doc.circle(MARGIN_X + 3, y - 3.6, 1.7, "F");
      doc.setFont("helvetica", style);
      doc.setTextColor(INK);
      for (const line of lines) {
        doc.text(line, MARGIN_X + 14, y);
        y += 15.5;
      }
      y += 2;
    }
  };

  // --- Eyebrow + title -----------------------------------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(BRAND);
  doc.text("DAILYVALUE RECIPE", MARGIN_X, y, { charSpace: 1.2 });
  y += 22;

  doc.setFontSize(24);
  doc.setTextColor(INK);
  for (const line of wrap(recipe.title, CONTENT_WIDTH)) {
    doc.text(line, MARGIN_X, y);
    y += 29;
  }

  // --- Serves / prep / cook ------------------------------------------------
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(MUTED);
  doc.text(pdfSafe(recipeMeta(recipe)), MARGIN_X, y);
  y += 16;

  doc.setDrawColor(RULE);
  doc.setLineWidth(0.75);
  doc.line(MARGIN_X, y, MARGIN_X + CONTENT_WIDTH, y);
  y += 14;

  // --- Ingredients ---------------------------------------------------------
  if (recipe.ingredients.length > 0) {
    heading("Ingredients");
    bulletList(recipe.ingredients, "normal");
  }

  // --- Method --------------------------------------------------------------
  heading("Method");
  doc.setFontSize(11);
  recipe.steps.forEach((step, index) => {
    const lines = wrap(step, CONTENT_WIDTH - 26);
    // Keep each step on one page where it fits.
    ensureRoom(lines.length * 15.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND);
    doc.text(String(index + 1), MARGIN_X, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(INK);
    for (const line of lines) {
      doc.text(line, MARGIN_X + 26, y);
      y += 15.5;
    }
    y += 6;
  });

  // --- Tips ----------------------------------------------------------------
  if (recipe.tips.length > 0) {
    heading("Tips");
    bulletList(recipe.tips, "italic");
  }

  // --- Footer on every page, written last so the page count is known -------
  const date = new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(options.generatedAt ?? new Date());

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(`DailyValue  ·  ${date}`, MARGIN_X, PAGE_HEIGHT - 36);
    doc.text(`Page ${page} of ${pages}`, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 36, {
      align: "right",
    });
  }

  return doc;
}

/**
 * Build the recipe PDF and hand it to the browser as a download.
 *
 * The same call covers every device. On a desktop the file goes to the usual
 * downloads folder; on Android it lands in Downloads; on iPhone Safari it
 * appears in the downloads list, from where it can be saved to Files. See the
 * note at the top of this file for how jsPDF chooses the delivery route.
 */
export function downloadRecipePdf(recipe: AIRecipe): void {
  buildRecipePdf(recipe).save(recipeFileName(recipe));
}
