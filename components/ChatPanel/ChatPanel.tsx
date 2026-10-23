"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChatMessage,
  type ChatMessageVariant,
} from "@/components/ChatMessage/ChatMessage";
import { AISearchBar } from "@/components/AISearchBar/AISearchBar";
import { RecipeCard } from "@/components/RecipeCard/RecipeCard";
import type { AIRecipe } from "@/lib/types";
import styles from "./ChatPanel.module.css";

export interface ChatPanelMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  /**
   * A written recipe that belongs to this AI reply, shown inside its bubble.
   * Plain data rather than a React element, because messages are saved to
   * sessionStorage and must survive being turned into JSON and back.
   */
  recipe?: AIRecipe;
}

export interface ChatPanelProps {
  messages: ChatPanelMessage[];
  onSendMessage: (text: string) => void;
  /**
   * Rewrite an earlier question of the shopper's.
   *
   * Omit it and no edit controls appear at all, which is what the styleguide
   * demo wants - it has no conversation behind it to rewind.
   */
  onEditMessage?: (id: string, text: string) => void;
  /**
   * An answer is on its way. Shows three moving dots where the reply will be,
   * so the thread is never silent between asking and answering.
   */
  pending?: boolean;
  placeholder?: string;
  /** Message treatment — see ChatMessage. Defaults to "bubble". */
  variant?: ChatMessageVariant;
  className?: string;
}

/**
 * A running conversation: the message thread scrolls independently above a
 * search bar pinned to the bottom, so the user can keep chatting without it
 * scrolling away — the same pattern Claude's own chat UI uses.
 *
 * The panel carries no padding of its own; the 40px gap between the thread
 * and the search bar is the only spacing it owns.
 */
export function ChatPanel({
  messages,
  onSendMessage,
  onEditMessage,
  pending = false,
  placeholder = "Ask a follow-up…",
  variant = "bubble",
  className,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  /** Which message is open in the editor. One at a time, by design. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view as the thread grows - and as the dots
  // appear, so the shopper sees that something is happening rather than having
  // to scroll down to find out.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  function handleSubmit(text: string) {
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setDraft("");
  }

  return (
    <div
      className={[
        styles.panel,
        variant === "wide" ? styles.panelWide : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.thread} ref={threadRef}>
        <div
          className={[styles.list, variant === "wide" ? styles.listWide : ""]
            .filter(Boolean)
            .join(" ")}
        >
          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              role={m.role}
              text={m.text}
              variant={variant}
              attachment={m.recipe ? <RecipeCard recipe={m.recipe} /> : undefined}
              // Only the shopper's own turns are editable, and not while an
              // answer is already being written - rewinding the thread
              // mid-request would leave a reply arriving into a conversation
              // that no longer expects it.
              onEdit={
                onEditMessage && m.role === "user" && !pending
                  ? () => setEditingId(m.id)
                  : undefined
              }
              editing={editingId === m.id}
              onEditSubmit={(text) => {
                setEditingId(null);
                onEditMessage?.(m.id, text);
              }}
              onEditCancel={() => setEditingId(null)}
            />
          ))}

          {pending && <ChatMessage role="ai" text="" variant={variant} thinking />}
        </div>
      </div>
      <div
        className={[
          styles.inputBar,
          variant === "wide" ? styles.inputBarWide : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <AISearchBar
          value={draft}
          onChange={setDraft}
          onSubmit={handleSubmit}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
