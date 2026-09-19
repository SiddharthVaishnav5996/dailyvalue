"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/lib/ui/useScrollLock";
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
 * scroll while open. The content — and any focus/submit logic — lives in
 * `children`.
 */
export function Modal({ onClose, children, ariaLabel, maxWidth = 560 }: ModalProps) {
  useScrollLock();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
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
