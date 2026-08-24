"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCheck } from "lucide-react";
import { AddButton } from "@/components/AddButton/AddButton";
import { Modal } from "@/components/Modal/Modal";
import { Text } from "@/components/Text/Text";
import styles from "./FeedbackModal.module.css";

export interface FeedbackModalProps {
  onClose: () => void;
}

/** After submit: turn the check green (ms), then auto-close if the user hasn't
 *  already dismissed it (ms). They can click outside / press Escape to leave
 *  sooner; otherwise it closes on its own after 4s. */
const GREEN_DELAY = 800;
const CLOSE_DELAY = 4000;

/**
 * Feedback dialog. The fields reuse the AI search bar's look — a soft shadow
 * that deepens on hover/focus, a primary-coloured placeholder that hides on
 * focus — just without its icons.
 *
 * On submit it swaps to a thank-you confirmation: the double-check turns green
 * 800ms in; the user can then click outside / press Escape to return to the
 * page, or it auto-closes after 4s.
 */
export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [checkGreen, setCheckGreen] = useState(false);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  // Timed confirmation sequence once submitted.
  useEffect(() => {
    if (!submitted) return;
    const toGreen = setTimeout(() => setCheckGreen(true), GREEN_DELAY);
    const toClose = setTimeout(() => onClose(), CLOSE_DELAY);
    return () => {
      clearTimeout(toGreen);
      clearTimeout(toClose);
    };
  }, [submitted, onClose]);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    // No backend yet — show the confirmation. Wire to an API/route handler later.
    setSubmitted(true);
  }

  return (
    <Modal onClose={onClose} ariaLabel="Send feedback" maxWidth={640}>
      {submitted ? (
        <div className={styles.thanks} role="status" aria-live="polite">
          <div className={styles.thanksHeader}>
            <CheckCheck
              size={36}
              strokeWidth={2.75}
              aria-hidden="true"
              className={[styles.checkIcon, checkGreen ? styles.checkIconGreen : ""]
                .filter(Boolean)
                .join(" ")}
            />
            <Text as="h2" variant="heading5" className={styles.thanksTitle}>
              Thank you for your feedback !
            </Text>
          </div>
          <Text as="p" variant="largeRegular" className={styles.thanksBody}>
            We will get back to you in 3-4 business days.
          </Text>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <Text as="span" variant="largeRegular" className={styles.label}>
              NAME
            </Text>
            <input
              ref={firstFieldRef}
              type="text"
              name="name"
              autoComplete="name"
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <Text as="span" variant="largeRegular" className={styles.label}>
              Email Address
            </Text>
            <input
              type="email"
              name="email"
              autoComplete="email"
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <Text as="span" variant="largeRegular" className={styles.label}>
              Description
            </Text>
            <textarea
              name="description"
              placeholder="Describe in detail"
              className={styles.textarea}
            />
          </label>

          <div className={styles.actions}>
            <AddButton label="SUBMIT" showIcon={false} onAdd={handleSubmit} />
          </div>
        </form>
      )}
    </Modal>
  );
}
