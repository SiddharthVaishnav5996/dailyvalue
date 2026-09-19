"use client";

import { useRouter } from "next/navigation";
import { useSearch } from "@/lib/search/SearchContext";
import { AISearchBar, type AISearchBarProps } from "./AISearchBar";

/**
 * The landing-page search bar.
 *
 * Submitting carries the query into the URL as `?q=…` and opens the AI chat
 * result page, which reads it and runs the search.
 *
 * Putting the query in the URL rather than only in memory buys three things
 * for free: the result page survives a refresh, the address is shareable, and
 * the browser's back button behaves the way a shopper expects.
 */
export function AISearchBarNav(props: AISearchBarProps) {
  const router = useRouter();
  const { reset } = useSearch();

  return (
    <AISearchBar
      {...props}
      onSubmit={(value) => {
        const query = value.trim();
        if (!query) return;

        // A new search from the landing page starts a new conversation, so
        // clear any thread left over from last time.
        reset();

        // encodeURIComponent escapes spaces, ampersands and accents so the
        // whole sentence survives being put in a URL.
        router.push(`/results?q=${encodeURIComponent(query)}`);
      }}
    />
  );
}
