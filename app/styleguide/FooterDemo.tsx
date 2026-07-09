"use client";

import { Footer } from "@/components/Footer/Footer";

export function FooterDemo() {
  return <Footer onSubscribe={(email) => console.log("subscribe:", email)} />;
}
