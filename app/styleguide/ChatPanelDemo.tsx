"use client";

import { useState } from "react";
import { ChatPanel, type ChatPanelMessage } from "@/components/ChatPanel/ChatPanel";
import styles from "./styleguide.module.css";

const INITIAL_MESSAGES: ChatPanelMessage[] = [
  { id: "1", role: "user", text: "I want to make Blueberry Cheesecake" },
  {
    id: "2",
    role: "ai",
    text: "Great choice! Here's a classic blueberry cheesecake recipe — cream cheese, graham crackers, butter, sugar, eggs, sour cream and fresh blueberries. I've matched every ingredient to a product below.",
  },
];

let nextId = 3;

export function ChatPanelDemo() {
  const [messages, setMessages] = useState<ChatPanelMessage[]>(INITIAL_MESSAGES);

  function handleSend(text: string) {
    setMessages((prev) => [...prev, { id: String(nextId++), role: "user", text }]);
    // Demo-only canned reply so the "keep chatting" flow is visible end to
    // end here — a real page would call an AI endpoint instead.
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(nextId++),
          role: "ai",
          text: "Got it — noted. (Demo reply, not a live AI call.)",
        },
      ]);
    }, 500);
  }

  return (
    <div className={styles.chatPanelDemo}>
      <ChatPanel messages={messages} onSendMessage={handleSend} />
    </div>
  );
}
