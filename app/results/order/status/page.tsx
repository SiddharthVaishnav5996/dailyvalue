import { Header } from "@/components/Header/Header";
import { Footer } from "@/components/Footer/Footer";
import { Text } from "@/components/Text/Text";
import { DeliveryMap } from "@/components/DeliveryMap/DeliveryMap";
import { ContinueShoppingCta } from "@/components/ContinueShoppingCta/ContinueShoppingCta";
import { ORDER_TRACKING } from "@/data/orderStatus";
import styles from "./page.module.css";

/**
 * Page 7 — Order Status. Reached from the confirmation page (Page 6) via the
 * "Go to Order Status" CTA or the idle auto-redirect.
 *
 * Two columns below the header: the left is the tracking timeline (a summary
 * card + a step per stage, each with a green shield tick; the not-yet-reached
 * step is muted), the right is the animated delivery map with the driver ETA and
 * a "Have a query?" contact line under it. Static demo data (see
 * data/orderStatus.ts). No page background — cards float on white.
 */

/** Green shield tick (or muted grey when the step isn't reached yet). */
function StatusBadge({ complete }: { complete: boolean }) {
  return (
    <svg
      className={styles.badge}
      viewBox="0 0 24 24"
      data-complete={complete}
      aria-hidden="true"
    >
      <path
        className={styles.badgeShield}
        d="M6 3.5 H18 Q20.5 3.5 20.5 6 V11 Q20.5 16.5 12 20.5 Q3.5 16.5 3.5 11 V6 Q3.5 3.5 6 3.5 Z"
      />
      <path className={styles.badgeCheck} d="M8 11.4 l2.7 2.7 l5.1 -5.4" />
    </svg>
  );
}

export default function OrderStatusPage() {
  const { headline, orderId, trackingNumber, steps, eta, contactEmail, contactPhone } =
    ORDER_TRACKING;

  return (
    <>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.layout}>
            {/* ---- Left: tracking timeline ---- */}
            <section className={styles.timeline} aria-label="Order tracking">
              <div className={styles.metaCard}>
                <Text as="h1" variant="heading6" className={styles.headline}>
                  {headline}
                </Text>
                <Text as="p" variant="mediumRegular" className={styles.metaLine}>
                  Track Order {orderId}
                </Text>
                <Text as="p" variant="mediumRegular" className={styles.metaLine}>
                  Tracking Number {trackingNumber}
                </Text>
              </div>

              <ol className={styles.steps}>
                {steps.map((step) => (
                  <li key={step.title} className={styles.step}>
                    <StatusBadge complete={step.complete} />
                    <div className={styles.stepBody} data-complete={step.complete}>
                      <Text as="h2" variant="heading6" className={styles.stepTitle}>
                        {step.title}
                      </Text>
                      {step.lines.map((line) => (
                        <Text
                          as="p"
                          key={line}
                          variant="mediumRegular"
                          className={styles.stepLine}
                        >
                          {line}
                        </Text>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* ---- Right: live map (stretches to the timeline), contact below ---- */}
            <DeliveryMap
              className={styles.mapCell}
              etaMinutes={eta.minutes}
              etaDistanceKm={eta.distanceKm}
            />

            <div className={styles.contact}>
              <Text as="h2" variant="mediumRegular" className={styles.contactTitle}>
                Have a query ?
              </Text>
              <Text as="p" variant="smallRegular" className={styles.contactLine}>
                You can write us at {contactEmail} OR call us on {contactPhone}
              </Text>
            </div>
          </div>

          <div className={styles.ctaRow}>
            <ContinueShoppingCta />
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
