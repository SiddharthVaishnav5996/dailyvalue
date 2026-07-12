"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/components/ChatMessage/ChatMessage";
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
  className?: string;
}

/**
 * A running conversation: the message thread scrolls independently above a
 * search bar pinned to the bottom, so the user can keep chatting without it
 * scrolling away — the same pattern Claude's own chat UI uses.
 */
export function ChatPanel({
  messages,
  onSendMessage,
  placeholder = "Ask a follow-up…",
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
        <div className={styles.list}>
          {messages.map((m) => (
            <ChatMessage key={m.id} role={m.role} text={m.text} />
          ))}
        </div>
      </div>
      <div className={styles.inputBar}>
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
