"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/lib/ui/useScrollLock";
import { useDialogFocus } from "@/lib/ui/useDialogFocus";
import styles from "./Modal.module.css";

export interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  /** Accessible name for the dialog. */
  ariaLabel: string;
  /** Card max-width in px. */
  maxWidth?: number;
}

/**
 * Reusable dialog shell: a portal over a blurred, dimmed backdrop with a
 * centered card. Closes on a backdrop click or the Escape key, and locks page
 * scroll while open. Keyboard focus moves into the card on open, stays inside
 * it, and returns to whatever opened it on close - see lib/ui/useDialogFocus.
 * The content — and any submit logic — lives in `children`.
 */
export function Modal({ onClose, children, ariaLabel, maxWidth = 560 }: ModalProps) {
  useScrollLock();

  const cardRef = useRef<HTMLDivElement>(null);
  useDialogFocus(cardRef);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // A control inside that claims Escape for itself (a dropdown closing)
      // marks the key handled; only an unclaimed Escape closes the dialog.
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={styles.backdrop}
      // Applied inline: Next's CSS pipeline (Lightning CSS) strips the
      // `backdrop-filter` declaration from CSS modules, but inline styles survive.
      style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={cardRef}
        className={styles.card}
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
