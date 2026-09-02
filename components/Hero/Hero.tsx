"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { AlarmClock, Sparkles, Award, ShieldCheck } from "lucide-react";
import { Text } from "@/components/Text/Text";
import { AISearchBarNav } from "@/components/AISearchBar/AISearchBarNav";
import styles from "./Hero.module.css";

/**
 * Landing hero. The two primary elements — the "What are you looking for?"
 * heading and the AI search bar — stay sharp and centered up front; that search
 * is the product's main feature. The grocery bag sits in a lightly-blurred
 * backdrop, while the Delivery / AI tabs and the quality badge float sharply on
 * top and drift with the cursor (pointer parallax + a subtle 3D tilt), each at a
 * different depth.
 */
export function Hero() {
  const heroRef = useRef<HTMLElement>(null);

  // Pointer parallax: write the cursor's offset-from-centre (-1..1) as CSS vars
  // the floating cards read; each multiplies by its own depth. Mouse only, and
  // disabled when the viewer prefers reduced motion.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let mx = 0;
    let my = 0;
    const apply = () => {
      raf = 0;
      el.style.setProperty("--mx", mx.toFixed(3));
      el.style.setProperty("--my", my.toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      mx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      my = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      mx = 0;
      my = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className={styles.hero} ref={heroRef}>
      {/* Lightly-blurred backdrop — the ground + grocery bag. */}
      <div className={styles.backdrop} aria-hidden="true">
        <div className={styles.bag}>
          <Image
            src="/stores/Hero Section/grocery bag.png"
            alt=""
            fill
            sizes="(max-width: 760px) 70vw, 460px"
            className={styles.bagImg}
            priority
          />
        </div>
      </div>

      {/* Soft spotlight so the sharp foreground reads over the scene. */}
      <div className={styles.scrim} aria-hidden="true" />

      {/* Sharp floating cards — drift with the cursor at their own depths. */}
      <div className={styles.layer} aria-hidden="true">
        <div className={[styles.tab, styles.tabDelivery].join(" ")}>
          <span className={[styles.tabIcon, styles.iconDelivery].join(" ")}>
            <AlarmClock strokeWidth={2} />
          </span>
          <span className={styles.tabBody}>
            <span className={styles.tabTitle}>Delivery</span>
            <span className={styles.tabSub}>30 Minutes</span>
          </span>
        </div>

        <div className={[styles.tab, styles.tabAI].join(" ")}>
          <span className={[styles.tabIcon, styles.iconAI].join(" ")}>
            <Sparkles strokeWidth={2} />
          </span>
          <span className={styles.tabBody}>
            <span className={styles.tabTitle}>AI Assistant</span>
            <span className={styles.tabSub}>Just ask, we shop</span>
          </span>
        </div>

        <div className={[styles.badge, styles.badgeTrusted].join(" ")}>
          <span className={[styles.badgeIcon, styles.iconTrusted].join(" ")}>
            <ShieldCheck strokeWidth={2} />
          </span>
          <span className={styles.badgeBody}>
            <span className={styles.badgeTitle}>Trusted Brands</span>
            <span className={styles.badgeSub}>Shop with satisfaction</span>
          </span>
        </div>

        <div className={[styles.badge, styles.badgeQuality].join(" ")}>
          <span className={[styles.badgeIcon, styles.iconQuality].join(" ")}>
            <Award strokeWidth={2} />
          </span>
          <span className={styles.badgeBody}>
            <span className={styles.badgeTitle}>100% Fresh Food</span>
            <span className={styles.badgeSub}>Quality Certified</span>
          </span>
        </div>
      </div>

      {/* Foreground — the two elements we never compromise. */}
      <div className={styles.foreground}>
        <Text as="h1" variant="heading4" className={styles.heroHeading}>
          What are you looking for ?
        </Text>
        <div className={styles.searchWrap}>
          <AISearchBarNav />
        </div>
      </div>
    </section>
  );
}
