import type { ElementType, HTMLAttributes, ReactNode } from "react";
import styles from "./Text.module.css";

/** Every text style from the Figma type scale (see styles/tokens.css). */
export type TextVariant =
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "heading5"
  | "heading6"
  | "largeBold"
  | "largeRegular"
  | "mediumBold"
  | "mediumRegular"
  | "normalBold"
  | "normalRegular"
  | "smallBold"
  | "smallRegular"
  | "xsmallBold"
  | "xsmallRegular"
  | "xxsmallBold"
  | "xxsmallRegular";

/** Sensible default HTML element per variant (override with `as`). */
const DEFAULT_TAG: Record<TextVariant, ElementType> = {
  heading1: "h1",
  heading2: "h2",
  heading3: "h3",
  heading4: "h4",
  heading5: "h5",
  heading6: "h6",
  largeBold: "p",
  largeRegular: "p",
  mediumBold: "p",
  mediumRegular: "p",
  normalBold: "p",
  normalRegular: "p",
  smallBold: "span",
  smallRegular: "span",
  xsmallBold: "span",
  xsmallRegular: "span",
  xxsmallBold: "span",
  xxsmallRegular: "span",
};

interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  /** Override the rendered element, e.g. `as="span"` or `as="label"`. */
  as?: ElementType;
  children?: ReactNode;
}

/**
 * Renders text in one of the design system's text styles.
 *
 *   <Text variant="heading1">Cook anything</Text>
 *   <Text variant="normalRegular" as="span">$4.99</Text>
 */
export function Text({
  variant = "normalRegular",
  as,
  className,
  children,
  ...rest
}: TextProps) {
  const Tag = as ?? DEFAULT_TAG[variant];
  const classes = [styles[variant], className].filter(Boolean).join(" ");
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
