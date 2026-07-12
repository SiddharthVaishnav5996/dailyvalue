import { Text } from "@/components/Text/Text";
import styles from "./ChatMessage.module.css";

export interface ChatMessageProps {
  /** Who sent it — determines alignment and bubble colors. */
  role: "user" | "ai";
  text: string;
  className?: string;
}

/**
 * A single chat bubble. User messages align right (primary bg, white text);
 * AI messages align left (white bg, black text). Width hugs content up to
 * 624px — a fixed box would break for short or long messages.
 */
export function ChatMessage({ role, text, className }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={[styles.row, isUser ? styles.rowUser : styles.rowAi, className]
        .filter(Boolean)
        .join(" ")}
    >
      <Text
        as="p"
        variant="mediumRegular"
        className={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi].join(" ")}
      >
        {text}
      </Text>
    </div>
  );
}
