import { Text, type TextVariant } from "@/components/Text/Text";
import styles from "./StoreName.module.css";

function initials(name: string): string {
  const words = name.replace(/'/g, "").split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "").toUpperCase();
}

export interface StoreNameProps {
  name: string;
  distanceKm: number;
  /** Store thumbnail (28x28). Falls back to an initials avatar when omitted. */
  logoSrc?: string;
  selected?: boolean;
  onSelect?: () => void;
  /** Overrides the store name's text style — defaults to the 184x28 spec's xxsmallBold. */
  nameVariant?: TextVariant;
  className?: string;
}

/**
 * A single row from the "Store Names" component: thumbnail + store name +
 * distance. Used to let a shopper swap the partner store on a product card.
 */
export function StoreName({
  name,
  distanceKm,
  logoSrc,
  selected = false,
  onSelect,
  nameVariant = "xxsmallBold",
  className,
}: StoreNameProps) {
  const content = (
    <>
      <span className={styles.thumb} aria-hidden="true">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- store logos are arbitrary external/uploaded assets, not build-time known
          <img src={logoSrc} alt="" className={styles.thumbImg} />
        ) : (
          <span className={styles.thumbFallback}>{initials(name)}</span>
        )}
      </span>
      <span className={styles.meta}>
        <Text as="span" variant={nameVariant} className={styles.name}>
          {name}
        </Text>
        <Text as="span" variant="xxsmallRegular" className={styles.distance}>
          {distanceKm.toFixed(1)} km away
        </Text>
      </span>
    </>
  );

  const rowClass = [styles.row, selected ? styles.selected : "", className]
    .filter(Boolean)
    .join(" ");

  if (onSelect) {
    return (
      <button type="button" className={rowClass} onClick={onSelect} aria-pressed={selected}>
        {content}
      </button>
    );
  }

  return <div className={rowClass}>{content}</div>;
}
