"use client";

import { useRouter } from "next/navigation";
import { AISearchBar, type AISearchBarProps } from "./AISearchBar";

/**
 * The landing-page search bar: submitting a query opens the AI chat result
 * page. The query itself isn't carried across yet — /results renders fixed
 * demo content until it's wired to POST /api/recipe.
 */
export function AISearchBarNav(props: AISearchBarProps) {
  const router = useRouter();

  return (
    <AISearchBar
      {...props}
      onSubmit={(value) => {
        if (!value.trim()) return;
        router.push("/results");
      }}
    />
  );
}
