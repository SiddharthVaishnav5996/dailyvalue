"use client";

import { useState } from "react";
import { AddButton } from "@/components/AddButton/AddButton";
import { Text } from "@/components/Text/Text";
import styles from "./styleguide.module.css";

export function AddButtonDemo() {
  const [qty, setQty] = useState(0);

  return (
    <div className={styles.demoGrid}>
      <div className={styles.demoCell}>
        <AddButton
          quantity={qty}
          onAdd={() => setQty(1)}
          onIncrement={() => setQty((q) => q + 1)}
          onDecrement={() => setQty((q) => Math.max(0, q - 1))}
        />
        <Text variant="smallRegular" className={styles.muted}>
          Interactive — click to add, then step
        </Text>
      </div>

      <div className={styles.demoCell}>
        <AddButton state="default" />
        <Text variant="smallRegular" className={styles.muted}>
          Default
        </Text>
      </div>

      <div className={styles.demoCell}>
        <AddButton state="active" />
        <Text variant="smallRegular" className={styles.muted}>
          Active (#2A264D)
        </Text>
      </div>

      <div className={styles.demoCell}>
        <AddButton state="hover" />
        <Text variant="smallRegular" className={styles.muted}>
          Hover
        </Text>
      </div>

      <div className={styles.demoCell}>
        <AddButton state="disabled" />
        <Text variant="smallRegular" className={styles.muted}>
          Disabled (#DADADA)
        </Text>
      </div>

      <div className={styles.demoCell}>
        <AddButton quantity={1} />
        <Text variant="smallRegular" className={styles.muted}>
          Grocery added (stepper)
        </Text>
      </div>

      <div className={styles.demoCell}>
        <AddButton quantity={1} disabled />
        <Text variant="smallRegular" className={styles.muted}>
          Stepper — disabled
        </Text>
      </div>

      <div className={styles.demoCell}>
        <AddButton showIcon={false} />
        <Text variant="smallRegular" className={styles.muted}>
          Show Add Button = false
        </Text>
      </div>
    </div>
  );
}
