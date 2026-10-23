import Image from "next/image";
import { Header } from "@/components/Header/Header";
import { TrackOrderBanner } from "@/components/TrackOrderBanner/TrackOrderBanner";
import { Footer } from "@/components/Footer/Footer";
import { Hero } from "@/components/Hero/Hero";
import { CategoryMarquee } from "@/components/CategoryMarquee/CategoryMarquee";
import { ProductCardInteractive } from "@/components/ProductCard/ProductCardInteractive";
import { Carousel } from "@/components/Carousel/Carousel";
import { AddButton } from "@/components/AddButton/AddButton";
import { FeedbackButton } from "@/components/Feedback/FeedbackButton";
import { Text } from "@/components/Text/Text";
import {
  HERO_PRODUCTS,
  TOP_PICKS,
  BLACK_FRIDAY_PRODUCTS,
  CAROUSEL_SLIDES,
} from "@/data/landing";
import styles from "./page.module.css";

/** Apple Inc. logo, sized/colored by CSS (currentColor). */
function AppleLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 170 170"
      fill="currentColor"
      role="img"
      aria-label="Apple"
    >
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.93 0.21-9.84-1.96-14.75-6.52-3.13-2.73-7.04-7.41-11.73-14.04-5.03-7.08-9.17-15.29-12.41-24.65-3.47-10.11-5.21-19.9-5.21-29.38 0-10.86 2.35-20.22 7.04-28.07 3.69-6.3 8.61-11.28 14.76-14.93 6.15-3.65 12.79-5.51 19.95-5.63 3.91 0 9.05 1.21 15.43 3.59 6.36 2.39 10.45 3.6 12.24 3.6 1.34 0 5.88-1.42 13.57-4.24 7.28-2.62 13.42-3.7 18.45-3.27 13.65 1.1 23.9 6.48 30.71 16.18-12.21 7.4-18.24 17.75-18.12 31.05 0.11 10.35 3.86 18.97 11.23 25.82 3.34 3.17 7.07 5.62 11.22 7.36-0.9 2.61-1.85 5.11-2.86 7.51zM119.11 7.24c0 8.1-2.96 15.67-8.86 22.67-7.12 8.32-15.73 13.13-25.07 12.37-0.12-0.97-0.19-1.99-0.19-3.07 0-7.78 3.39-16.1 9.4-22.91 3-3.45 6.82-6.31 11.45-8.6 4.62-2.25 8.99-3.5 13.1-3.71 0.12 1.08 0.17 2.17 0.17 3.24z" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <Header />
      <TrackOrderBanner />

      <main className={styles.main}>
        {/* Hero — the page scrolls only after this section. */}
        <Hero />

        {/* Category selector — full-bleed, auto-scrolls right→left, pauses on hover. */}
        <CategoryMarquee className={styles.categories} />

        <div className={styles.content}>
          {/* Feature banner + first product cards. */}
          <section className={styles.heroSplit}>
            <div className={styles.featureBanner}>
              <Image
                src="/stores/Product card Images/Feature Image.png"
                alt="Person sleeping in a calm, comfortable bedroom"
                fill
                sizes="(max-width: 900px) 100vw, 601px"
                className={styles.featureImage}
              />
              <div className={styles.bannerOverlay}>
                <Text as="h2" variant="heading2" className={styles.bannerTitle}>
                  Premium Room Comfort
                </Text>
                <AddButton label="SHOP" showIcon={false} />
              </div>
            </div>

            <div className={styles.heroCards}>
              {HERO_PRODUCTS.map(({ id, ...product }) => (
                <ProductCardInteractive
                  key={id}
                  id={id}
                  layout="vertical"
                  // Every name here happens to run 4 lines, so the row lines up by
                  // coincidence. Reserving it makes that intentional and survives a
                  // copy change.
                  descriptionLines={4}
                  {...product}
                />
              ))}
            </div>
          </section>

          {/* Top picks for today. */}
          <section className={styles.section}>
            <Text as="h2" variant="heading4" className={styles.sectionTitle}>
              Top picks for today
            </Text>
            <div className={styles.productRow}>
              {TOP_PICKS.map(({ id, ...product }) => (
                <ProductCardInteractive
                  key={id}
                  id={id}
                  layout="vertical"
                  // Longest copy in this row runs 2 lines; reserving that on every
                  // card keeps the price and ADD button on one line across the row
                  // (one short name would otherwise lift its whole lower half 14px).
                  descriptionLines={2}
                  {...product}
                />
              ))}
            </div>
          </section>

          {/* Black Friday Sale — master frame. */}
          <section className={styles.bfMaster}>
            <div className={styles.bfContainer}>
              <div className={styles.bfCard}>
                <AppleLogo className={styles.appleLogo} />
                <Text as="h2" variant="heading2" className={styles.bfTitle}>
                  Black Friday Sale
                </Text>
                <Text as="p" variant="largeBold" className={styles.bfDates}>
                  1st November- 30th November
                </Text>
                <Text as="p" variant="heading4" className={styles.bfDiscount}>
                  Upto 70% OFF
                </Text>
                <AddButton label="SHOP" showIcon={false} className={styles.bfCta} />
              </div>

              <div className={styles.productRow}>
                {BLACK_FRIDAY_PRODUCTS.map(({ id, ...product }) => (
                  <ProductCardInteractive
                    key={id}
                    id={id}
                    layout="vertical"
                    // Longest copy here (the Pre-Owned iPhone 12) runs 3 lines;
                    // reserving that on every card keeps the whole row aligned.
                    descriptionLines={3}
                    {...product}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Promo carousel + feedback prompt. */}
          <section className={styles.carouselSection}>
            <Carousel slides={CAROUSEL_SLIDES} />
            <div className={styles.feedback}>
              <Text
                as="p"
                variant="mediumRegular"
                className={styles.feedbackText}
              >
                We will love to hear what you think !
              </Text>
              <FeedbackButton className={styles.feedbackCta} />
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
