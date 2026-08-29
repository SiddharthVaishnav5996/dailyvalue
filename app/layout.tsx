import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/Auth/AuthContext";
import { WishlistProvider } from "@/components/Wishlist/WishlistContext";
import { CartProvider } from "@/components/Cart/CartContext";
import "../styles/tokens.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DailyValue",
  description: "AI grocery shopping that compares every store.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>{children}</CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
