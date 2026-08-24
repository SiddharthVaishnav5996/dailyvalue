"use client";

import { useEffect, useRef, type FormEvent } from "react";
import { AddButton } from "@/components/AddButton/AddButton";
import { Modal } from "@/components/Modal/Modal";
import { Text } from "@/components/Text/Text";
import styles from "./LoginModal.module.css";

export interface LoginModalProps {
  onClose: () => void;
  /** Called on submit — this is a mock, so any input "logs in". */
  onLogin: () => void;
}

/**
 * Mock login dialog. No backend: submitting (with anything, or nothing) signs
 * the user in. Fields reuse the AI search bar's shadow/hover/focus look.
 */
export function LoginModal({ onClose, onLogin }: LoginModalProps) {
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    onLogin();
  }

  return (
    <Modal onClose={onClose} ariaLabel="Log in" maxWidth={420}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <Text as="h2" variant="heading5" className={styles.title}>
          Log in
        </Text>

        <label className={styles.field}>
          <Text as="span" variant="largeRegular" className={styles.label}>
            Email Address
          </Text>
          <input
            ref={firstFieldRef}
            type="email"
            name="email"
            autoComplete="email"
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <Text as="span" variant="largeRegular" className={styles.label}>
            Password
          </Text>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            className={styles.input}
          />
        </label>

        <div className={styles.actions}>
          <AddButton label="LOGIN" showIcon={false} onAdd={handleSubmit} />
        </div>
      </form>
    </Modal>
  );
}
