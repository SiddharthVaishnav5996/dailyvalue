"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChatMessage,
  type ChatMessageVariant,
} from "@/components/ChatMessage/ChatMessage";
import { AISearchBar } from "@/components/AISearchBar/AISearchBar";
import styles from "./ChatPanel.module.css";

export interface ChatPanelMessage {
  id: string;
  role: "user" | "ai";
  text: string;
}

export interface ChatPanelProps {
  messages: ChatPanelMessage[];
  onSendMessage: (text: string) => void;
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
  placeholder = "Ask a follow-up…",
  variant = "bubble",
  className,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view as the thread grows.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleSubmit(text: string) {
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setDraft("");
  }

  return (
    <div className={[styles.panel, className].filter(Boolean).join(" ")}>
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
            />
          ))}
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
