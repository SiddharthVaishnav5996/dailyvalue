"use client";

import Image from "next/image";
import { Text } from "@/components/Text/Text";
import { useAuth } from "@/components/Auth/AuthContext";
import styles from "./LoginButton.module.css";

/**
 * Header account control, driven by the shared auth context. Logged out: a LOGIN
 * button that opens the mock login dialog. Logged in: a round profile avatar —
 * clicking it logs back out.
 */
export function LoginButton() {
  const { isLoggedIn, promptLogin, logout } = useAuth();

  if (isLoggedIn) {
    return (
      <button
        type="button"
        className={styles.avatar}
        onClick={logout}
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
    <button type="button" className={styles.loginBtn} onClick={promptLogin}>
      <Text as="span" variant="mediumRegular">
        LOGIN
      </Text>
    </button>
  );
}
