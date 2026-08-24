"use client";

import { useId, useState } from "react";
import { Text } from "@/components/Text/Text";
import { AddButton } from "@/components/AddButton/AddButton";
import { FOOTER_COLUMNS } from "@/data/footer";
import styles from "./Footer.module.css";

export interface FooterProps {
  onSubscribe?: (email: string) => void;
}

export function Footer({ onSubscribe }: FooterProps) {
  const [email, setEmail] = useState("");
  const emailInputId = useId();

  function submitEmail() {
    onSubscribe?.(email.trim());
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitEmail();
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title} className={styles.column}>
            <Text as="h3" variant="mediumBold" className={styles.heading}>
              {column.title}
            </Text>
            <ul className={styles.linkList}>
              {column.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className={styles.link}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className={styles.updatesBox}>
          <Text as="h3" variant="mediumBold" className={styles.heading}>
            Want Updates ?
          </Text>
          <Text as="p" variant="mediumRegular" className={styles.updatesCopy}>
            Send me up-to-date information on weekly flyer feature, discounted
            items, new product…
          </Text>

          <form onSubmit={handleFormSubmit}>
            <label htmlFor={emailInputId}>
              <Text as="span" variant="mediumBold" className={styles.heading}>
                Email Address
              </Text>
            </label>
            <div className={styles.emailRow}>
              <input
                id={emailInputId}
                type="email"
                className={styles.emailInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                autoComplete="email"
                // Native type="email" validity alone accepts domains with no
                // TLD (e.g. "name@gm"); this pattern requires a full
                // local@domain.tld shape before :valid (and the Subscribe
                // button's active color) engages.
                pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
                required
              />
              <AddButton
                label="Subscribe"
                showIcon={false}
                className={styles.subscribeBtn}
                onAdd={submitEmail}
              />
            </div>
          </form>
        </div>
      </div>
    </footer>
  );
}
