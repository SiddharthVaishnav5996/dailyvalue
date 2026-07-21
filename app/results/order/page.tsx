"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/Header/Header";
import { Footer } from "@/components/Footer/Footer";
import { AddButton } from "@/components/AddButton/AddButton";
import { Text } from "@/components/Text/Text";
import styles from "./page.module.css";

/**
 * Placeholder for the checkout / order page — reached from "Order Now" and the
 * cart on the AI Search Result page. The real design comes later; this stub
 * just keeps that navigation from 404-ing.
 */
export default function OrderPage() {
  const router = useRouter();

  return (
    <>
      <Header />

      <main className={styles.main}>
        <Text as="h1" variant="heading4" className={styles.title}>
          Your order
        </Text>
        <Text as="p" variant="mediumRegular" className={styles.copy}>
          Checkout is coming soon — this page will be designed next.
        </Text>
        <AddButton
          label="Go Back"
          showIcon={false}
          onAdd={() => router.push("/results/products")}
        />
      </main>

      <Footer />
    </>
  );
}
