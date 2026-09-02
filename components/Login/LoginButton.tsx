"use client";

import { useState } from "react";
import Image from "next/image";
import { Text } from "@/components/Text/Text";
import { useAuth } from "@/components/Auth/AuthContext";
import { AccountMenu } from "./AccountMenu";
import styles from "./LoginButton.module.css";

/**
 * Header account control, driven by the shared auth context. Logged out: a LOGIN
 * button that opens the mock login dialog. Logged in: a round profile avatar
 * that opens the account menu (which is where Log Out now lives).
 */
export function LoginButton() {
  const { user, isLoggedIn, promptLogin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLoggedIn) {
    return (
      <div className={styles.anchor}>
        <button
          type="button"
          className={styles.avatar}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Account menu"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
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
        {menuOpen && (
          <AccountMenu
            phone={user?.phone}
            onClose={() => setMenuOpen(false)}
            onLogout={logout}
          />
        )}
      </div>
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
