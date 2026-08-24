import styles from "./DeliveryMap.module.css";

export interface DeliveryMapProps {
  /** Driver ETA shown in the floating tooltip. */
  etaMinutes: number;
  etaDistanceKm: number;
  className?: string;
}

/**
 * The delivery route map for Page 7 (Order Status). A self-contained, stylised
 * map illustration (no tiles) drawn in a 510×720 space that echoes the design's
 * neighbourhood layout — pickup near Walmart (bottom right) up to the Edgemont
 * drop-off pin (upper left).
 *
 * The driver marker is an SVG element moved with <animateMotion> along the exact
 * same path the route is drawn from, so it is *physically* constrained to the
 * route and can never drift ahead of or behind it. A short comet tail follows on
 * the same path (phase-lagged), and the whole marker layer fades around the loop
 * boundary so the restart isn't seen. Under `prefers-reduced-motion` the marker
 * layer is hidden, leaving a clean static route + pin.
 */

// Route geometry — the visible line, the driver and its tail all read from this.
const ROUTE_D =
  "M410 460 C 404 432 406 408 388 384 C 368 356 306 350 272 320 " +
  "C 244 296 236 266 210 248 C 186 232 162 216 140 198 C 124 186 110 192 96 206";

const CYCLE = "3.6s";
// Head + tail share these frames exactly: travel (0→72%), pause at the pin
// (72→90%), reset while the layer is faded.
const KEY_TIMES = "0;0.72;0.9;0.902;1";
const KEY_POINTS = "0;1;1;0;0";
const TAIL = [
  { begin: "0.09s", r: 5, opacity: 0.5 },
  { begin: "0.18s", r: 4, opacity: 0.34 },
  { begin: "0.27s", r: 3, opacity: 0.2 },
];

// Neighbourhood labels (from the design), positioned in the 510×720 space.
const AREAS: { x: number; y: number; lines: string[] }[] = [
  { x: 74, y: 44, lines: ["THE GRANGE"] },
  { x: 240, y: 20, lines: ["ORMSBY PLACE"] },
  { x: 62, y: 98, lines: ["THE HAMPTONS"] },
  { x: 158, y: 150, lines: ["WEDGEWOOD", "HEIGHTS"] },
  { x: 56, y: 232, lines: ["EDGEMONT"] },
  { x: 92, y: 402, lines: ["STILLWATER"] },
  { x: 452, y: 340, lines: ["TERWILLEGAR", "TOWNE"] },
  { x: 372, y: 502, lines: ["AMBLESIDE"] },
  { x: 150, y: 556, lines: ["RIVER VALLEY", "WINDERMERE"] },
  { x: 206, y: 592, lines: ["KESWICK"] },
  { x: 392, y: 600, lines: ["GLENRIDDING", "HEIGHTS"] },
  { x: 120, y: 628, lines: ["RIVER VALLEY", "KESWICK"] },
];

/** Small blue POI markers with a white "shop" glyph + label to the right. */
function ShopMarker({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-9" y="-9" width="18" height="18" rx="5" fill="#2f6fd8" />
      <path d="M-4 -2 H4 V4 H-4 Z" fill="#ffffff" />
      <path d="M-2.4 -2 a2.4 2.4 0 0 1 4.8 0" fill="none" stroke="#ffffff" strokeWidth="1.3" />
      <text className={styles.storeLabel} x="13" y="4">
        {label}
      </text>
    </g>
  );
}

/** Highway "216" shield. */
function Shield({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-13" y="-9" width="26" height="18" rx="3" fill="#ffffff" stroke="#cfcfcf" />
      <text className={styles.shieldLabel} x="0" y="4">
        216
      </text>
    </g>
  );
}

export function DeliveryMap({ etaMinutes, etaDistanceKm, className }: DeliveryMapProps) {
  return (
    <figure
      className={[styles.map, className].filter(Boolean).join(" ")}
      role="img"
      aria-label={`Live delivery route — driver about ${etaMinutes} minutes (${etaDistanceKm} km) away, heading to the Edgemont drop-off.`}
    >
      <svg
        className={styles.canvas}
        viewBox="0 0 510 720"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <filter id="ttShadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* ---- Land ---- */}
        <rect x="0" y="0" width="510" height="720" fill="#e9ebea" />

        {/* ---- River-valley greens ---- */}
        <g fill="#cfe3c1">
          <path d="M300 -10 C 250 70 300 150 250 220 C 210 280 250 340 210 400 C 180 448 210 520 180 600 C 165 645 150 690 150 730 L 470 730 L 470 -10 Z" opacity="0.55" />
          <path d="M-10 300 C 60 300 120 350 150 430 C 172 490 130 560 110 640 C 100 685 96 720 96 730 L -10 730 Z" opacity="0.5" />
        </g>

        {/* ---- River ---- */}
        <path
          d="M486 -12 C 452 70 470 150 430 210 C 388 274 300 292 262 360 C 224 428 150 470 96 560 C 64 612 40 660 34 732"
          fill="none"
          stroke="#a9d3ef"
          strokeWidth="24"
          strokeLinecap="round"
        />
        <path
          d="M486 -12 C 452 70 470 150 430 210 C 388 274 300 292 262 360 C 224 428 150 470 96 560 C 64 612 40 660 34 732"
          fill="none"
          stroke="#c6e2f6"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <text
          className={styles.riverLabel}
          transform="translate(420 150) rotate(58)"
        >
          North Saskatchewan River
        </text>

        {/* ---- Roads (subtle) ---- */}
        <g fill="none" stroke="#ffffff" strokeLinecap="round">
          <path d="M-10 120 C 120 116 210 96 300 44 C 360 8 430 20 520 8" strokeWidth="8" />
          <path d="M60 -10 C 96 130 150 210 150 350 C 150 470 120 560 150 730" strokeWidth="6" />
          <path d="M-10 470 C 150 462 260 476 380 520 C 448 546 486 552 520 548" strokeWidth="7" />
          <path d="M486 40 C 470 180 486 300 466 400 C 452 470 486 560 486 730" strokeWidth="6" />
        </g>

        {/* ---- Alternate routes (light) ---- */}
        <g fill="none" stroke="#b9aef2" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
          <path d="M410 460 C 456 440 476 398 456 356 C 444 330 476 314 476 292" />
          <path d="M140 198 C 152 168 120 150 130 118 C 138 88 120 58 152 40 C 184 22 224 30 252 24" />
        </g>

        {/* ---- Main route: drawn once, in step with the driver's first lap
                (same clock + 0→72% window), then it stays. ---- */}
        <path
          id="routePath"
          className={styles.routeLine}
          d={ROUTE_D}
          pathLength={100}
          fill="none"
          stroke="#3a1fc0"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="100"
          strokeDashoffset="100"
        >
          <animate
            attributeName="stroke-dashoffset"
            dur={CYCLE}
            begin="0s"
            repeatCount="1"
            fill="freeze"
            calcMode="linear"
            keyTimes="0;0.72;1"
            values="100;0;0"
          />
        </path>

        {/* ---- Highway shields ---- */}
        <Shield x={205} y={250} />
        <Shield x={470} y={534} />

        {/* ---- POI + store markers ---- */}
        <ShopMarker x={175} y={96} label="7-Eleven" />
        <ShopMarker x={352} y={456} label="Staples" />
        <g transform="translate(430 300)">
          <rect x="-11" y="-10" width="22" height="20" rx="4" fill="#2e9e5b" />
          <text className={styles.jaLabel} x="0" y="4">JA</text>
          <text className={styles.storeLabel} x="16" y="4">Superstore</text>
        </g>
        <g transform="translate(230 336)">
          <rect x="-8" y="-8" width="16" height="16" rx="4" fill="#9aa0a6" />
          <text className={styles.poiLabel} x="0" y="26">Landmark Homes Show</text>
          <text className={styles.poiLabel} x="0" y="38">Home in Rivers Edge</text>
        </g>

        {/* ---- Neighbourhood labels ---- */}
        {AREAS.map((a) => (
          <text key={a.lines.join("")} className={styles.areaLabel} x={a.x} y={a.y}>
            {a.lines.map((line, i) => (
              <tspan key={line} x={a.x} dy={i === 0 ? 0 : 12}>
                {line}
              </tspan>
            ))}
          </text>
        ))}

        {/* ---- Pickup marker (Walmart) ---- */}
        <g transform="translate(410 460)">
          <circle r="8" fill="#ffffff" stroke="#3d3d3d" strokeWidth="2.5" />
          <circle r="2.6" fill="#3d3d3d" />
          <text className={styles.storeLabel} x="14" y="4">Walmart Super</text>
        </g>

        {/* ---- Destination pin (Edgemont) ---- */}
        <g transform="translate(96 206)">
          <ellipse cx="0" cy="2" rx="7" ry="2.4" fill="rgba(0,0,0,0.18)" />
          <path
            d="M0 0 C -6 -9 -13 -14 -13 -23 A 13 13 0 1 1 13 -23 C 13 -14 6 -9 0 0 Z"
            fill="#ea4335"
          />
          <circle cx="0" cy="-23" r="4.6" fill="#ffffff" />
        </g>

        {/* ---- Driver marker (physically follows the route) ---- */}
        <g className={styles.driver}>
          <animate
            attributeName="opacity"
            dur={CYCLE}
            repeatCount="indefinite"
            calcMode="linear"
            keyTimes="0;0.05;0.84;0.9;1"
            values="0;1;1;0;0"
          />

          {TAIL.map((t) => (
            <g key={t.begin}>
              <circle r={t.r} fill="#4a2ff0" opacity={t.opacity} />
              <animateMotion
                dur={CYCLE}
                begin={t.begin}
                repeatCount="indefinite"
                calcMode="linear"
                keyTimes={KEY_TIMES}
                keyPoints={KEY_POINTS}
              >
                <mpath href="#routePath" />
              </animateMotion>
            </g>
          ))}

          <g>
            <circle r="5" fill="none" stroke="#ffffff" strokeWidth="2">
              <animate attributeName="r" dur="1.7s" repeatCount="indefinite" values="4;14" calcMode="linear" />
              <animate attributeName="opacity" dur="1.7s" repeatCount="indefinite" values="0.7;0" calcMode="linear" />
            </circle>
            <circle r="7" fill="#ffffff" />
            <circle r="4.2" fill="#4a2ff0" />
            <animateMotion
              dur={CYCLE}
              repeatCount="indefinite"
              calcMode="linear"
              keyTimes={KEY_TIMES}
              keyPoints={KEY_POINTS}
            >
              <mpath href="#routePath" />
            </animateMotion>
          </g>
        </g>

        {/* ---- ETA tooltip — sits just up-right of the route bend, its tail
                touching the line near (240,282). ---- */}
        <g transform="translate(250 232)">
          <path d="M8 40 L26 40 L-6 52 Z" fill="#ffffff" />
          <rect x="0" y="0" width="118" height="42" rx="9" fill="#ffffff" filter="url(#ttShadow)" />
          <g transform="translate(13 13) scale(0.8)" fill="none" stroke="#202124" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 16h1.5c.5 0 .8-.3.8-.8v-2.4c0-.7-.5-1.3-1.2-1.5C13.6 10.6 11.5 10 11.5 10s-1-1.1-1.7-1.8c-.4-.3-.8-.5-1.3-.5H4.2c-.5 0-.9.3-1.1.7l-1.2 2.3c-.5.2-.9.8-.9 1.5v2.2c0 .5.3.8.8.8H3" />
            <circle cx="5.4" cy="16" r="1.6" />
            <circle cx="13" cy="16" r="1.6" />
          </g>
          <text className={styles.ttEta} x="38" y="19">{etaMinutes} min</text>
          <text className={styles.ttDist} x="38" y="34">{etaDistanceKm} km</text>
        </g>

        {/* ---- Watermark ---- */}
        <text className={styles.watermark} x="255" y="702">Google Maps</text>
      </svg>
    </figure>
  );
}
