"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header/Header";
import { ChatPanel, type ChatPanelMessage } from "@/components/ChatPanel/ChatPanel";
import {
  ResizableSplit,
  type ResizableSplitHandle,
} from "@/components/ResizableSplit/ResizableSplit";
import { ResultTable } from "@/components/ResultTable/ResultTable";
import { AddButton } from "@/components/AddButton/AddButton";
import {
  RESULT_CONVERSATION,
  INGREDIENTS_TABLE,
  WINE_TABLE,
} from "@/data/chatResult";
import styles from "./page.module.css";

/**
 * Anything matching this is page content rather than empty background, so a
 * click on it must not snap the panes back to 50/50.
 */
const CONTENT_SELECTOR =
  'button, a, input, textarea, select, [role="separator"], [role="row"], [data-chat-message]';

export default function ResultsPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatPanelMessage[]>(RESULT_CONVERSATION);
  const [ingredients, setIngredients] = useState(INGREDIENTS_TABLE.rows);
  const [wines, setWines] = useState(WINE_TABLE.rows);
  const nextId = useRef(RESULT_CONVERSATION.length + 1);
  const splitRef = useRef<ResizableSplitHandle>(null);

  function handleSendMessage(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: String(nextId.current++), role: "user", text },
    ]);
    // The reply and the regenerated tables come from POST /api/recipe — not
    // wired up yet, so the thread just records what was asked.
  }

  /** Clicking bare background returns a dragged-out split to its 50/50 rest. */
  function handleBackgroundClick(e: React.MouseEvent<HTMLElement>) {
    if ((e.target as HTMLElement).closest(CONTENT_SELECTOR)) return;
    splitRef.current?.reset();
  }

  return (
    <>
      <Header />

      <main className={styles.main} onClick={handleBackgroundClick}>
        <div className={styles.backBar}>
          <AddButton label="Back" showIcon={false} onAdd={() => router.back()} />
        </div>

        <ResizableSplit
          ref={splitRef}
          className={styles.split}
          left={
            <ChatPanel
              className={styles.chat}
              messages={messages}
              onSendMessage={handleSendMessage}
              variant="wide"
            />
          }
          right={
            <div className={styles.tableSide}>
              <div className={styles.tableScroll}>
                <ResultTable
                  {...INGREDIENTS_TABLE}
                  rows={ingredients}
                  onDeleteRow={(id) =>
                    setIngredients((rows) => rows.filter((r) => r.id !== id))
                  }
                />
                <ResultTable
                  {...WINE_TABLE}
                  rows={wines}
                  onDeleteRow={(id) =>
                    setWines((rows) => rows.filter((r) => r.id !== id))
                  }
                />
              </div>

              {/* Fades the last of the table into the page so it reads as
                  scrollable behind the pinned Confirm button. */}
              <div className={styles.fade} aria-hidden="true" />

              <div className={styles.confirmBar}>
                <AddButton
                  label="Confirm"
                  showIcon={false}
                  onAdd={() => router.push("/results/products")}
                />
              </div>
            </div>
          }
        />
      </main>
    </>
  );
}
