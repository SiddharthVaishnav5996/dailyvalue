"use client";

import { useId, type CSSProperties } from "react";
import { Trash2 } from "lucide-react";
import { Text } from "@/components/Text/Text";
import styles from "./ResultTable.module.css";

export interface ResultTableRow {
  id: string;
  /** Cell text left→right, filling columns 1–4. */
  cells: string[];
}

export interface ResultTableProps {
  /** Main heading frame, e.g. "🫐 Blueberry Cheesecake – Ingredients". */
  title: string;
  /** Sub-heading labels left→right. Up to 4 — column 5 is the delete action. */
  columns: string[];
  rows: ResultTableRow[];
  /**
   * Treats column 1 as a grouping label (the ingredients table's "Category"):
   * bold, and printed once at the top of each run of matching rows. Every row
   * still carries its own value, so removing the first row of a group promotes
   * the label to the next one instead of losing it.
   */
  groupFirstColumn?: boolean;
  /**
   * Rows whose id is listed here render their text in red — the cue that the
   * matching product was removed from the basket, so the item is no longer
   * being bought. Only the text recolors; the row and its delete icon are
   * unchanged.
   */
  mutedRowIds?: readonly string[];
  onDeleteRow?: (id: string) => void;
  className?: string;
}

/** Pads (or trims) a row to `count` cells so every row lines up on the grid. */
function toCells(cells: string[], count: number): string[] {
  return Array.from({ length: count }, (_, i) => cells[i] ?? "");
}

/**
 * Below the phone breakpoint each row reflows into a card (see the CSS). These
 * per-cell classes tell that layout what each column becomes:
 *   - group: the category tag at the top of a group's first card,
 *   - title: the item / wine name headline,
 *   - field: a "label: value" line (the label comes from `data-label`).
 * On desktop the classes are inert — the grid ignores them.
 */
function cardCellClass(index: number, groupFirstColumn: boolean): string {
  if (groupFirstColumn) {
    if (index === 0) return styles.cellGroup;
    if (index === 1) return styles.cellTitle;
    return styles.cellField;
  }
  return index === 0 ? styles.cellTitle : styles.cellField;
}

/**
 * A result table: centered heading frame, a sub-heading row, then one grid
 * row per item. Every row is its own 5-column grid — 4 content columns plus
 * the delete action — so the ingredients table (3 labels) and the wine table
 * (4 labels) share one column rhythm.
 *
 * Below the phone breakpoint the same rows reflow into stacked cards so a
 * 5-column table never has to cram onto a narrow screen.
 */
export function ResultTable({
  title,
  columns,
  rows,
  groupFirstColumn = false,
  mutedRowIds,
  onDeleteRow,
  className,
}: ResultTableProps) {
  const titleId = useId();
  // The grid carries one 1fr track per real column plus the delete track, so a
  // 3-column table (ingredients) doesn't leave a blank 4th column padding out
  // to a 5-track grid — which put a wide void between Quantity and delete.
  const contentColumns = columns.length;

  // The column that names the thing on each row, for the delete button's
  // label. Not simply the first: a grocery table leads with Category, and
  // naming the buttons after it gave two buttons both called "Remove Dairy".
  const nameColumn = columns.findIndex((c) =>
    /^(item|product|ingredient|name|wine)\b/i.test(c.trim()),
  );

  return (
    <section
      className={[styles.table, className].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
      style={{ "--content-cols": contentColumns } as CSSProperties}
    >
      <Text as="h2" id={titleId} variant="largeBold" className={styles.title}>
        {title}
      </Text>

      <div className={styles.rows} role="table" aria-labelledby={titleId}>
        <div className={[styles.grid, styles.headerRow].join(" ")} role="row">
          {toCells(columns, contentColumns).map((label, i) => (
            <Text
              key={i}
              as="span"
              variant="normalBold"
              className={styles.cell}
              role="columnheader"
            >
              {label}
            </Text>
          ))}
          {/* Column 5 — no label above the delete buttons. */}
          <span role="columnheader" aria-label="Actions" />
        </div>

        {rows.map((row, rowIndex) => {
          const cells = toCells(row.cells, contentColumns);
          const previous = rows[rowIndex - 1];
          const continuesGroup =
            groupFirstColumn &&
            previous !== undefined &&
            toCells(previous.cells, contentColumns)[0] === cells[0];
          const describes =
            (nameColumn >= 0 && cells[nameColumn]) ||
            cells[groupFirstColumn ? 1 : 0] ||
            cells.find(Boolean) ||
            "row";
          const removed = mutedRowIds?.includes(row.id) ?? false;

          return (
            <div
              key={row.id}
              className={[styles.grid, removed ? styles.rowRemoved : ""]
                .filter(Boolean)
                .join(" ")}
              role="row"
            >
              {cells.map((value, i) => (
                <Text
                  key={i}
                  as="span"
                  variant={
                    i === 0 && groupFirstColumn ? "mediumBold" : "mediumRegular"
                  }
                  className={[styles.cell, cardCellClass(i, groupFirstColumn)].join(
                    " ",
                  )}
                  role="cell"
                  // Field label for the card layout: "Quantity 200g" etc.
                  data-label={columns[i] ?? ""}
                >
                  {i === 0 && continuesGroup ? "" : value}
                </Text>
              ))}
              <span role="cell" className={styles.actionCell}>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => onDeleteRow?.(row.id)}
                  aria-label={`Remove ${describes}`}
                >
                  <Trash2 size={20} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
