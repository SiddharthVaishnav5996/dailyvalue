import { Text, type TextVariant } from "@/components/Text/Text";
import { Star } from "@/components/Star/Star";
import { StarRating } from "@/components/StarRating/StarRating";
import { CarouselDot } from "@/components/CarouselDot/CarouselDot";
import { StoreName } from "@/components/StoreName/StoreName";
import { CategorySelector } from "@/components/CategorySelector/CategorySelector";
import { STORE_NAMES } from "@/data/storeNames";
import { CATEGORIES } from "@/data/categories";
import { AISearchBar } from "@/components/AISearchBar/AISearchBar";
import { Header } from "@/components/Header/Header";
import { AddButtonDemo } from "./AddButtonDemo";
import { CarouselDotDemo } from "./CarouselDotDemo";
import { FooterDemo } from "./FooterDemo";
import { ProductCardDemo } from "./ProductCardDemo";
import { ChatPanelDemo } from "./ChatPanelDemo";
import styles from "./styleguide.module.css";

const SPECIMENS: { variant: TextVariant; label: string; spec: string }[] = [
  { variant: "heading1", label: "Heading 1", spec: "56 / 61.6 · Bold" },
  { variant: "heading2", label: "Heading 2", spec: "48 / 52.8 · Bold" },
  { variant: "heading3", label: "Heading 3", spec: "40 / 44 · Bold" },
  { variant: "heading4", label: "Heading 4", spec: "32 / 35.2 · Bold" },
  { variant: "heading5", label: "Heading 5", spec: "24 / 26.4 · Bold" },
  { variant: "heading6", label: "Heading 6", spec: "20 / 22 · Bold" },
  { variant: "largeBold", label: "Large Bold", spec: "20 / 28" },
  { variant: "largeRegular", label: "Large Regular", spec: "20 / 28" },
  { variant: "mediumBold", label: "Medium Bold", spec: "18 / 25.2" },
  { variant: "mediumRegular", label: "Medium Regular", spec: "18 / 25.2" },
  { variant: "normalBold", label: "Normal Bold", spec: "14 / 20" },
  { variant: "normalRegular", label: "Normal Regular", spec: "14 / 22.4" },
  { variant: "smallBold", label: "Small Bold", spec: "12 / 16" },
  { variant: "smallRegular", label: "Small Regular", spec: "12 / 14" },
  { variant: "xsmallBold", label: "X Small Bold", spec: "10 / 12" },
  { variant: "xsmallRegular", label: "X Small Regular", spec: "10 / 12" },
  { variant: "xxsmallBold", label: "XX Small Bold", spec: "8 / 10" },
  { variant: "xxsmallRegular", label: "XX Small Regular", spec: "8 / 10" },
];

const COLORS: { name: string; hex: string; rgb: string; cls: string }[] = [
  { name: "Primary", hex: "#413A78", rgb: "65 58 120", cls: "primary" },
  { name: "Primary hover (Add btn)", hex: "#2E2954", rgb: "46 41 84", cls: "primaryHover" },
  { name: "Footer", hex: "#544D85", rgb: "84 77 133", cls: "footerBg" },
  { name: "White / footer text", hex: "#FFFFFF", rgb: "255 255 255", cls: "white" },
  { name: "Green bright", hex: "#00D207", rgb: "0 210 7", cls: "greenBright" },
  { name: "Green soft", hex: "#DBFFDC", rgb: "219 255 220", cls: "greenSoft" },
  { name: "Dairy", hex: "#ADE7F5", rgb: "173 231 245", cls: "catDairy" },
  { name: "Electronics", hex: "#D7CECE", rgb: "215 206 206", cls: "catElectronics" },
  { name: "Fashion", hex: "#E2B93B", rgb: "226 185 59", cls: "catFashion" },
  { name: "Health & beauty", hex: "#EB9DF9", rgb: "235 157 249", cls: "catHealthBeauty" },
  { name: "Fresh Deals", hex: "#FEA1AA", rgb: "254 161 170", cls: "catFreshDeals" },
  { name: "Grocery", hex: "#9CF5C5", rgb: "156 245 197", cls: "catGrocery" },
];

export default function StyleguidePage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
      <header className={styles.header}>
        <Text variant="heading3" as="h1">
          Design system
        </Text>
        <Text variant="normalRegular" className={styles.muted}>
          Tokens mapped from Figma · Inter
        </Text>
      </header>

      <section className={styles.section}>
        <Text variant="heading4" as="h2" className={styles.sectionTitle}>
          Header
        </Text>
        <Text variant="smallRegular" className={styles.muted}>
          75px tall, full-bleed, 200px horizontal padding — rendered above
          (outside this contained column)
        </Text>
      </section>

      <section className={styles.section}>
        <Text variant="heading4" as="h2" className={styles.sectionTitle}>
          Typography
        </Text>
        <div className={styles.list}>
          {SPECIMENS.map(({ variant, label, spec }) => (
            <div key={variant} className={styles.row}>
              <div className={styles.meta}>
                <Text variant="smallBold" as="span">
                  {label}
                </Text>
                <Text variant="smallRegular" as="span" className={styles.muted}>
                  {spec}
                </Text>
              </div>
              <Text variant={variant}>Cook anything, compare every store</Text>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <Text variant="heading4" as="h2" className={styles.sectionTitle}>
          Colors
        </Text>
        <div className={styles.swatches}>
          {COLORS.map(({ name, hex, rgb, cls }) => (
            <div key={name} className={styles.swatch}>
              <div className={`${styles.chip} ${styles[cls]}`} />
              <div className={styles.swatchMeta}>
                <Text variant="smallBold" as="span">
                  {name}
                </Text>
                <Text variant="xsmallRegular" as="span" className={styles.muted}>
                  {hex} · {rgb}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <Text variant="heading4" as="h2" className={styles.sectionTitle}>
          Add Button
        </Text>
        <AddButtonDemo />
      </section>

      <section className={styles.section}>
        <Text variant="heading4" as="h2" className={styles.sectionTitle}>
          Star Rating
        </Text>

        <div className={styles.demoGrid}>
          <div className={styles.demoCell}>
            <Star variant="full" size={40} />
            <Text variant="smallRegular" className={styles.muted}>
              Full Star
            </Text>
          </div>
          <div className={styles.demoCell}>
            <Star variant="half" size={40} />
            <Text variant="smallRegular" className={styles.muted}>
              Half Star
            </Text>
          </div>
          <div className={styles.demoCell}>
            <Star variant="none" size={40} />
            <Text variant="smallRegular" className={styles.muted}>
              No Star
            </Text>
          </div>
        </div>

        <div className={styles.ratingRows}>
          {[1, 2, 3.5, 4.5, 5].map((r) => (
            <div key={r} className={styles.ratingRow}>
              <StarRating rating={r} size={28} />
              <Text variant="smallRegular" className={styles.muted}>
                rating = {r}
              </Text>
            </div>
          ))}
          <div className={styles.ratingRow}>
            <StarRating rating={4.5} />
            <Text variant="smallRegular" className={styles.muted}>
              actual size (10px) · rating = 4.5
            </Text>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <Text variant="heading4" as="h2" className={styles.sectionTitle}>
          Carousel swipe
        </Text>
        <div className={styles.demoGrid}>
          <div className={styles.demoCell}>
            <CarouselDot selected />
            <Text variant="smallRegular" className={styles.muted}>
              Selected (26 × 15)
            </Text>
          </div>
          <div className={styles.demoCell}>
            <CarouselDot />
            <Text variant="smallRegular" className={styles.muted}>
              Non-selected (15.28 × 15.28)
            </Text>
          </div>
        </div>
        <div className={styles.ratingRow} style={{ marginTop: 24 }}>
          <CarouselDotDemo />
          <Text variant="smallRegular" className={styles.muted}>
            Click a dot — selected pill moves
          </Text>
        </div>
      </section>

      <section className={styles.section}>
        <Text variant="heading4" as="h2" className={styles.sectionTitle}>
          Store Names
        </Text>
        <Text variant="smallRegular" className={styles.muted}>
          184 × 28 each · thumbnails pending, showing initials fallback
        </Text>
        <div className={styles.storeList}>
          {STORE_NAMES.map((store) => (
            <StoreName
              key={store.id}
              name={store.name}
              distanceKm={store.distanceKm}
              logoSrc={store.logoSrc}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <Text variant="heading4" as="h2" className={styles.sectionTitle}>
          Category Selector
        </Text>
        <Text variant="smallRegular" className={styles.muted}>
          Transparent by default · fills with its category color on hover
        </Text>
        <div className={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <CategorySelector
              key={cat.id}
              label={cat.label}
              hoverColorVar={cat.hoverColorVar}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <Text variant="heading4" as="h2" className={styles.sectionTitle}>
          AI Search Bar
        </Text>
        <Text variant="smallRegular" className={styles.muted}>
          737 × 60 max · click to focus — placeholder hides, cursor blinks
        </Text>
        <div className={styles.searchBarDemo}>
          <AISearchBar />
        </div>
      </section>

      <section className={styles.section}>
        <Text variant="heading4" as="h2" className={styles.sectionTitle}>
          Product Card
        </Text>
        <Text variant="smallRegular" className={styles.muted}>
          Two layouts, each with the discount pill on and off. Heights are
          intentionally equal within a layout — hiding the pill leaves its slot
          reserved so cards stay aligned in a row.
        </Text>
        <ProductCardDemo />
      </section>

      <section className={styles.section}>
        <Text variant="heading4" as="h2" className={styles.sectionTitle}>
          Chat Panel
        </Text>
        <Text variant="smallRegular" className={styles.muted}>
          User messages right (primary bg, white text) · AI messages left
          (white bg, black text, bordered) · bubble width hugs content up to
          624px · search bar pinned to the bottom, thread scrolls above it —
          try sending a message
        </Text>
        <ChatPanelDemo />
      </section>

      <section className={styles.section}>
        <Text variant="heading4" as="h2" className={styles.sectionTitle}>
          Footer
        </Text>
        <Text variant="smallRegular" className={styles.muted}>
          1157 max width · full-bleed background, rendered below (outside this
          contained column)
        </Text>
      </section>
      </main>
      <FooterDemo />
    </>
  );
}
