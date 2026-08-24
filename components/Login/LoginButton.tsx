"use client";

import { useState } from "react";
import Image from "next/image";
import { Text } from "@/components/Text/Text";
import { LoginModal } from "./LoginModal";
import styles from "./LoginButton.module.css";

/**
 * Header account control. Logged out: a LOGIN button that opens the mock login
 * dialog. Logged in: a round profile avatar — clicking it logs back out (mock;
 * no backend/session yet).
 */
export function LoginButton() {
  const [modalOpen, setModalOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  if (loggedIn) {
    return (
      <button
        type="button"
        className={styles.avatar}
        onClick={() => setLoggedIn(false)}
        aria-label="Log out"
        title="Log out"
      >
        <Image
          src="/stores/Store Logos/profile picture.png"
          alt="Your profile"
          width={40}
          height={40}
          priority
          className={styles.avatarImg}
        />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className={styles.loginBtn}
        onClick={() => setModalOpen(true)}
      >
        <Text as="span" variant="mediumRegular">
          LOGIN
        </Text>
      </button>
      {modalOpen && (
        <LoginModal
          onClose={() => setModalOpen(false)}
          onLogin={() => {
            setLoggedIn(true);
            setModalOpen(false);
          }}
        />
      )}
    </>
  );
}
