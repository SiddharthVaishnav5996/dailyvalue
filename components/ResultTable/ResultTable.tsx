"use client";

import { useId } from "react";
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
  onDeleteRow?: (id: string) => void;
  className?: string;
}

/** Column 5 is reserved for the delete button, so 4 columns carry content. */
const CONTENT_COLUMNS = 4;

/** Pads to exactly 4 cells so every row lines up on the same 5-track grid. */
function toCells(cells: string[]): string[] {
  return Array.from({ length: CONTENT_COLUMNS }, (_, i) => cells[i] ?? "");
}

/**
 * A result table: centered heading frame, a sub-heading row, then one grid
 * row per item. Every row is its own 5-column grid — 4 content columns plus
 * the delete action — so the ingredients table (3 labels) and the wine table
 * (4 labels) share one column rhythm.
 */
export function ResultTable({
  title,
  columns,
  rows,
  groupFirstColumn = false,
  onDeleteRow,
  className,
}: ResultTableProps) {
  const titleId = useId();

  return (
    <section
      className={[styles.table, className].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
    >
      <Text as="h2" id={titleId} variant="largeBold" className={styles.title}>
        {title}
      </Text>

      <div className={styles.rows} role="table" aria-labelledby={titleId}>
        <div className={styles.grid} role="row">
          {toCells(columns).map((label, i) => (
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
          const cells = toCells(row.cells);
          const previous = rows[rowIndex - 1];
          const continuesGroup =
            groupFirstColumn &&
            previous !== undefined &&
            toCells(previous.cells)[0] === cells[0];
          const describes =
            cells[groupFirstColumn ? 1 : 0] || cells.find(Boolean) || "row";

          return (
            <div key={row.id} className={styles.grid} role="row">
              {cells.map((value, i) => (
                <Text
                  key={i}
                  as="span"
                  variant={
                    i === 0 && groupFirstColumn ? "mediumBold" : "mediumRegular"
                  }
                  className={styles.cell}
                  role="cell"
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
