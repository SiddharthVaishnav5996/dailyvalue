import { Header } from "@/components/Header/Header";
import { Text } from "@/components/Text/Text";
import styles from "./page.module.css";

/**
 * Page 7 — Order Status. Placeholder stub for now: reached from the confirmation
 * page (Page 6) via the "Go to Order Status" CTA or the idle auto-redirect. The
 * real content (tracking timeline, items, ETA) comes next.
 */
export default function OrderStatusPage() {
  return (
    <>
      <Header />

      <main className={styles.main}>
        <div className={styles.content}>
          <Text as="h1" variant="heading3" className={styles.heading}>
            Order Status
          </Text>
          <Text as="p" variant="largeRegular" className={styles.subtext}>
            Your order is on its way — arriving in the next 5 hours.
          </Text>
        </div>
      </main>
    </>
  );
}
