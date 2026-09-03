"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Bookmark, ShoppingCart } from "lucide-react";
import { Text } from "@/components/Text/Text";
import { AISearchBar } from "@/components/AISearchBar/AISearchBar";
import { useWishlist } from "@/components/Wishlist/WishlistContext";
import { WishlistPopup } from "@/components/Wishlist/WishlistPopup";
import { useCart } from "@/components/Cart/CartContext";
import { CartPopup } from "@/components/Cart/CartPopup";
import { LoginButton } from "@/components/Login/LoginButton";
import styles from "./Header.module.css";

/** Ignore scroll-down hiding until past this many px, so it doesn't flicker
 *  right at the top of the page. */
const HIDE_THRESHOLD_PX = 80;

/** Cycled one at a time in the header's quick search. */
const QUICK_SEARCH_PLACEHOLDERS = [
  'Search "egg"',
  'Search "banana"',
  'Search "iPhone"',
  'Search "Pickle"',
  'Search "milk"',
  'Search "bread"',
  'Search "coffee"',
];

export interface HeaderProps {
  /** Overrides opening the wishlist popup (the default). */
  onWishlistClick?: () => void;
  /** Overrides opening the cart popup (the default). */
  onCartClick?: () => void;
}

export function Header({ onWishlistClick, onCartClick }: HeaderProps) {
  // Shared app-wide counts — every page writes into the same providers, so these
  // badges stay in sync no matter which page added/saved an item.
  const { count: wishlistCount } = useWishlist();
  const { count: cartCount } = useCart();

  // The cart / wishlist popups live here, so every page that renders a Header
  // gets them without wiring anything up itself.
  const [openPanel, setOpenPanel] = useState<"cart" | "wishlist" | null>(null);
  const closePanel = () => setOpenPanel(null);

  // Auto-hide on scroll down, reveal on scroll up (any amount, immediately).
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  // Read inside the scroll handler without re-subscribing it on every open/close.
  const panelOpenRef = useRef(false);
  useEffect(() => {
    panelOpenRef.current = openPanel !== null;
  }, [openPanel]);

  useEffect(() => {
    lastScrollY.current = Math.max(0, window.scrollY);

    function handleScroll() {
      // Clamp — iOS/trackpad rubber-banding can briefly report a negative
      // scrollY past the top, which would otherwise read as a large false
      // "scroll down" delta on the bounce-back.
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - lastScrollY.current;
      // Ignore sub-pixel jitter so a stationary page can't flip state.
      if (Math.abs(delta) < 2) return;
      if (delta < 0) setHidden(false);
      // Never hide while a dropdown is open — the panel is anchored to the
      // header, so sliding it away would take the open panel with it.
      else if (currentY > HIDE_THRESHOLD_PX && !panelOpenRef.current) setHidden(true);
      lastScrollY.current = currentY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={[styles.header, hidden ? styles.headerHidden : ""]
          .filter(Boolean)
          .join(" ")}
      >
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

        {/* Quick product search — the AI bar without its attachment/voice
            actions, for shoppers who just want to look something up. */}
        <div className={styles.searchWrap}>
          <AISearchBar
            size="compact"
            showActions={false}
            placeholders={QUICK_SEARCH_PLACEHOLDERS}
          />
        </div>

        <div className={styles.actions}>
          {/* Each icon anchors its own dropdown — the panel positions itself
              against this wrapper, not the header. */}
          <div className={styles.actionAnchor}>
            <button
              type="button"
              className={[styles.iconBtn, styles.wishlistBtn].join(" ")}
              onClick={onWishlistClick ?? (() => setOpenPanel("wishlist"))}
              aria-label={
                wishlistCount > 0 ? `Open wishlist, ${wishlistCount} items` : "Open wishlist"
              }
              aria-expanded={openPanel === "wishlist"}
            >
              <Bookmark size={24} strokeWidth={1.75} />
              {wishlistCount > 0 && (
                <span className={styles.wishlistBadge} aria-hidden="true">
                  {wishlistCount}
                </span>
              )}
            </button>
            {openPanel === "wishlist" && <WishlistPopup onClose={closePanel} />}
          </div>

          <div className={styles.actionAnchor}>
            <button
              type="button"
              className={[styles.iconBtn, styles.cartBtn].join(" ")}
              onClick={onCartClick ?? (() => setOpenPanel("cart"))}
              aria-label={cartCount > 0 ? `Open cart, ${cartCount} items` : "Open cart"}
              aria-expanded={openPanel === "cart"}
            >
              <ShoppingCart size={24} strokeWidth={1.75} />
              {cartCount > 0 && (
                <span className={styles.cartBadge} aria-hidden="true">
                  {cartCount}
                </span>
              )}
            </button>
            {openPanel === "cart" && <CartPopup onClose={closePanel} />}
          </div>

          <LoginButton />
        </div>
      </header>
      {/* Fixed headers leave the document flow — this holds their height so
          page content doesn't start underneath them. */}
      <div className={styles.headerSpacer} aria-hidden="true" />
    </>
  );
}
