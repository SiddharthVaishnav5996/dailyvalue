"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header/Header";
import { ChatPanel } from "@/components/ChatPanel/ChatPanel";
import {
  ResizableSplit,
  type ResizableSplitHandle,
} from "@/components/ResizableSplit/ResizableSplit";
import { ResultTable } from "@/components/ResultTable/ResultTable";
import { AddButton } from "@/components/AddButton/AddButton";
import { Text } from "@/components/Text/Text";
import { useSearch } from "@/lib/search/SearchContext";
import styles from "./page.module.css";

/**
 * Anything matching this is page content rather than empty background, so a
 * click on it must not snap the panes back to 50/50.
 */
const CONTENT_SELECTOR =
  'button, a, input, textarea, select, [role="separator"], [role="row"], [data-chat-message]';

function ResultsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const splitRef = useRef<ResizableSplitHandle>(null);

  const { result, messages, status, runSearch, editMessage } = useSearch();

  // The query the landing page put in the URL, e.g. /results?q=cheesecake
  const query = searchParams.get("q") ?? "";

  // Run the search once per distinct URL query.
  //
  // The ref is what makes "once" true. Without it, every re-render caused by
  // the answer arriving would fire another identical request, and the page
  // would loop forever.
  const searchedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!query) return;
    if (searchedFor.current === query) return;

    // The restored thread may already answer this exact URL - after a page
    // refresh, or on the way back from the products page. Re-running would
    // spend an API request and throw away any follow-ups already asked.
    const alreadyAnswered =
      result !== null && messages.some((m) => m.role === "user" && m.text === query);

    searchedFor.current = query;
    if (alreadyAnswered) return;

    // A `?q=` in the URL means "start here", so it begins a NEW conversation
    // rather than continuing whatever thread happens to be in this tab. Without
    // this, opening a shared link appended its query to a stale basket.
    void runSearch(query, { fresh: true });
  }, [query, runSearch, result, messages]);

  /** Clicking bare background returns a dragged-out split to its 50/50 rest. */
  function handleBackgroundClick(e: React.MouseEvent<HTMLElement>) {
    if ((e.target as HTMLElement).closest(CONTENT_SELECTOR)) return;
    splitRef.current?.reset();
  }

  const isLoading = status === "loading";
  const hasTables = (result?.tables?.length ?? 0) > 0;

  /** The right-hand pane: tables once we have them, a status block until then. */
  function renderTableSide() {
    if (hasTables) {
      return result!.tables.map((table) => (
        <ResultTable
          key={table.title}
          title={table.title}
          columns={table.columns}
          rows={table.rows}
          groupFirstColumn={table.groupFirstColumn}
        />
      ));
    }

    if (isLoading) {
      return (
        <div className={styles.stateBox}>
          <div className={styles.dots} aria-hidden="true">
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
          <Text as="p" variant="mediumBold" className={styles.stateTitle}>
            Building your list
          </Text>
          <Text as="p" variant="normalRegular" className={styles.stateText}>
            Reading your request, then checking what each store charges.
          </Text>
        </div>
      );
    }

    // Out of scope: the AI answered, correctly, with nothing to buy.
    if (result && !result.inScope) {
      return (
        <div className={styles.stateBox}>
          <Text as="p" variant="mediumBold" className={styles.stateTitle}>
            Nothing to add for that one
          </Text>
          <Text as="p" variant="normalRegular" className={styles.stateText}>
            DailyValue only helps with food, groceries and shopping. Ask what to
            cook, what to restock, or what to buy.
          </Text>
        </div>
      );
    }

    return (
      <div className={styles.stateBox}>
        <Text as="p" variant="mediumBold" className={styles.stateTitle}>
          Ask for anything you would buy
        </Text>
        <Text as="p" variant="normalRegular" className={styles.stateText}>
          A dish to cook, a fridge to restock, or something for the house. Type
          it in the box on the left.
        </Text>
      </div>
    );
  }

  return (
    <>
      <Header />

      <main className={styles.main} onClick={handleBackgroundClick}>
        <div className={styles.backBar}>
          <AddButton label="Back" showIcon={false} onAdd={() => router.push("/")} />
        </div>

        <ResizableSplit
          ref={splitRef}
          className={styles.split}
          left={
            <ChatPanel
              className={styles.chat}
              messages={messages}
              // A follow-up goes through the same pipeline as the first
              // question, with the thread attached, so "I don't like digestive
              // biscuits" rebuilds the whole table rather than starting over.
              onSendMessage={(text) => void runSearch(text)}
              // Rewriting a question throws away everything after it and asks
              // again - see editMessage in lib/search/SearchContext.tsx.
              onEditMessage={(id, text) => void editMessage(id, text)}
              pending={isLoading}
              variant="wide"
            />
          }
          right={
            <div className={styles.tableSide}>
              <div className={styles.tableScroll}>{renderTableSide()}</div>

              {/* Fades the last of the table into the page so it reads as
                  scrollable behind the pinned Confirm button. */}
              <div className={styles.fade} aria-hidden="true" />

              <div className={styles.confirmBar}>
                {/* Gated: logged out, this opens the login card first — the
                    user must sign in before moving on to the product results.
                    Hidden until there is something to confirm. */}
                {hasTables && (
                  <AddButton
                    label="Confirm"
                    showIcon={false}
                    requiresAuth
                    onAdd={() => router.push("/results/products")}
                  />
                )}
              </div>
            </div>
          }
        />
      </main>
    </>
  );
}

/**
 * useSearchParams reads the URL on the client, so Next needs a Suspense
 * boundary around anything that calls it. Without this the build fails with a
 * "missing suspense boundary" error.
 */
export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsPageInner />
    </Suspense>
  );
}
