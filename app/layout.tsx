import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/Auth/AuthContext";
import { WishlistProvider } from "@/components/Wishlist/WishlistContext";
import { CartProvider } from "@/components/Cart/CartContext";
import { SearchProvider } from "@/lib/search/SearchContext";
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
            <CartProvider>
              {/* Holds the current AI search result so /results and
                  /results/products share one answer instead of asking twice. */}
              <SearchProvider>{children}</SearchProvider>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
