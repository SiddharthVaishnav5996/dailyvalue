import Link from "next/link";
import Image from "next/image";
import { Globe, ShoppingCart } from "lucide-react";
import { Text } from "@/components/Text/Text";
import styles from "./Header.module.css";

export interface HeaderProps {
  /** Basket quantity shown as a badge on the cart icon. Hidden when 0/undefined. */
  cartCount?: number;
  onLanguageClick?: () => void;
  onCartClick?: () => void;
  onLoginClick?: () => void;
}

export function Header({
  cartCount = 0,
  onLanguageClick,
  onCartClick,
  onLoginClick,
}: HeaderProps) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <Image
          src="/logo-icon.png"
          alt="DailyValue"
          width={51}
          height={48}
          className={styles.logoMark}
          priority
        />
        <Text as="span" variant="heading6" className={styles.wordmark}>
          <span className={styles.daily}>Daily</span>
          <span className={styles.value}>Value</span>
        </Text>
      </Link>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={onLanguageClick}
          aria-label="Change language or region"
        >
          <Globe size={24} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className={[styles.iconBtn, styles.cartBtn].join(" ")}
          onClick={onCartClick}
          aria-label={cartCount > 0 ? `Open cart, ${cartCount} items` : "Open cart"}
        >
          <ShoppingCart size={24} strokeWidth={1.75} />
          {cartCount > 0 && (
            <span className={styles.cartBadge} aria-hidden="true">
              {cartCount}
            </span>
          )}
        </button>
        <button type="button" className={styles.loginBtn} onClick={onLoginClick}>
          <Text as="span" variant="mediumRegular">
            LOGIN
          </Text>
        </button>
      </div>
    </header>
  );
}
