import type { ReactNode } from "react";

export interface Country {
  /** ISO code — also the option key. US and CA share a dial code, so the code
   *  alone can't identify a country; this can. */
  iso: "CA" | "US" | "IN";
  name: string;
  /** Dial prefix shown in the field, e.g. "+1". */
  dial: string;
  /** National number length, used to decide when the number is complete. */
  digits: number;
  flag: ReactNode;
}

/* Flags are inline SVG rather than emoji: Windows has no colour glyphs for
   regional-indicator pairs, so 🇨🇦 renders as a bare "CA" there. */

function CanadaFlag() {
  return (
    <svg viewBox="0 0 24 16" aria-hidden="true" focusable="false">
      <rect width="24" height="16" fill="#fff" />
      <rect width="6" height="16" fill="#d52b1e" />
      <rect x="18" width="6" height="16" fill="#d52b1e" />
      <path
        d="M12 3.4l.85 1.85 1.95-.5-.65 1.95 1.65 1.15-1.8.85.4 1.9-1.9-.4-.1 2.1h-.8l-.1-2.1-1.9.4.4-1.9-1.8-.85L9.85 6.7 9.2 4.75l1.95.5z"
        fill="#d52b1e"
      />
    </svg>
  );
}

function USFlag() {
  return (
    <svg viewBox="0 0 24 16" aria-hidden="true" focusable="false">
      <rect width="24" height="16" fill="#fff" />
      {/* 13 stripes, 7 of them red */}
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 16) / 13} width="24" height={16 / 13} fill="#b22234" />
      ))}
      <rect width="10.5" height={(16 / 13) * 7} fill="#3c3b6e" />
      {/* Suggestion of stars — individual points are illegible at this size */}
      {[1.6, 4.2, 6.8].map((y) =>
        [1.6, 4, 6.4, 8.8].map((x) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="0.5" fill="#fff" />
        )),
      )}
    </svg>
  );
}

function IndiaFlag() {
  return (
    <svg viewBox="0 0 24 16" aria-hidden="true" focusable="false">
      <rect width="24" height="16" fill="#fff" />
      <rect width="24" height="5.33" fill="#f93" />
      <rect y="10.67" width="24" height="5.33" fill="#138808" />
      <circle cx="12" cy="8" r="2" fill="none" stroke="#008" strokeWidth="0.55" />
      <circle cx="12" cy="8" r="0.5" fill="#008" />
    </svg>
  );
}

/** Canada first — it's the default, since the stores are Canadian. */
export const COUNTRIES: Country[] = [
  { iso: "CA", name: "Canada", dial: "+1", digits: 10, flag: <CanadaFlag /> },
  { iso: "US", name: "United States", dial: "+1", digits: 10, flag: <USFlag /> },
  { iso: "IN", name: "India", dial: "+91", digits: 10, flag: <IndiaFlag /> },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];
