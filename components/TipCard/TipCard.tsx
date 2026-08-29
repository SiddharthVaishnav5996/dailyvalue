"use client";

import { useId, useState } from "react";
import { Text } from "@/components/Text/Text";
import { formatPrice } from "@/lib/format";
import styles from "./TipCard.module.css";

export interface TipPreset {
  id: string;
  amount: number;
  /** Emoji shown above the amount, matching each chip's tone (peace, letter, heart). */
  emoji: string;
}

export interface TipCardProps {
  presets: TipPreset[];
  /** Id of the selected preset, "custom", or null when no tip is chosen. */
  selectedId: string | null;
  onSelectPreset: (id: string) => void;
  onSelectCustom: () => void;
  customValue: string;
  onCustomValueChange: (value: string) => void;
  className?: string;
}

/**
 * "Tip your delivery partner" — a row of preset amounts plus a Custom chip.
 * Picking a preset selects it immediately (its price feeds straight into the
 * page's tip total); picking Custom reveals an amount field instead. Only one
 * chip is selected at a time — matches the design's single-choice tip picker.
 *
 * The custom field commits on Enter (or blur): the field collapses and the chip
 * then reads as the amount entered, so the row stays compact. Clicking that chip
 * again reopens the field to edit it.
 */
export function TipCard({
  presets,
  selectedId,
  onSelectPreset,
  onSelectCustom,
  customValue,
  onCustomValueChange,
  className,
}: TipCardProps) {
  const customInputId = useId();
  const isCustom = selectedId === "custom";
  // Whether the custom field is open for editing. Committing (Enter/blur) closes
  // it so the chip can show the amount in place of the "Custom" label.
  const [editingCustom, setEditingCustom] = useState(false);

  const customAmount = parseFloat(customValue);
  const hasCustomAmount = Number.isFinite(customAmount) && customAmount > 0;
  // Once committed, the chip reads as the entered amount instead of "Custom".
  const showCustomAmount = isCustom && hasCustomAmount && !editingCustom;

  return (
    <section className={className}>
      <Text as="h2" variant="heading5">
        Tip your delivery partner
      </Text>
      <Text as="p" variant="normalRegular" className={styles.subtext}>
        Your kindness means a lot! 100% of your tip will go directly to your
        delivery partner.
      </Text>

      <div className={styles.chipRow}>
        {presets.map((preset) => {
          const active = selectedId === preset.id;
          return (
            <button
              type="button"
              key={preset.id}
              className={[styles.chip, active ? styles.chipActive : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectPreset(preset.id)}
              aria-pressed={active}
            >
              <span className={styles.chipEmoji} aria-hidden="true">
                {preset.emoji}
              </span>
              <Text as="span" variant="smallBold">
                {formatPrice(preset.amount)}
              </Text>
            </button>
          );
        })}

        <button
          type="button"
          className={[styles.chip, isCustom ? styles.chipActive : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => {
            onSelectCustom();
            // Reopens the field when the chip is already showing an amount.
            setEditingCustom(true);
          }}
          aria-pressed={isCustom}
          aria-label={
            showCustomAmount
              ? `Custom tip ${formatPrice(customAmount)}, edit`
              : "Custom tip"
          }
        >
          <span className={styles.chipEmoji} aria-hidden="true">
            🎉
          </span>
          <Text as="span" variant="smallBold">
            {showCustomAmount ? formatPrice(customAmount) : "Custom"}
          </Text>
        </button>
      </div>

      {isCustom && editingCustom && (
        <div className={styles.customRow}>
          <label htmlFor={customInputId} className={styles.customLabel}>
            <Text as="span" variant="smallBold">
              Tip amount
            </Text>
          </label>
          <input
            id={customInputId}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            className={styles.customInput}
            placeholder="0.00"
            value={customValue}
            onChange={(e) => onCustomValueChange(e.target.value)}
            // Enter commits the amount; blur does the same so clicking away
            // doesn't leave the field hanging open.
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setEditingCustom(false);
              }
            }}
            onBlur={() => setEditingCustom(false)}
            autoFocus
          />
        </div>
      )}
    </section>
  );
}
