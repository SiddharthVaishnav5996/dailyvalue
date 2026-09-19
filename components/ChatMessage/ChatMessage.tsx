import type { ReactNode } from "react";
import { Text } from "@/components/Text/Text";
import styles from "./ChatMessage.module.css";

export type ChatMessageVariant = "bubble" | "wide";

export interface ChatMessageProps {
  /** Who sent it — determines alignment and bubble colors. */
  role: "user" | "ai";
  text: string;
  /**
   * "bubble" — both roles get a bubble that hugs its content (up to 624px).
   * "wide" — the results-page treatment: the user bubble fills the column
   * with its text set right, and the AI reply is plain text with no bubble.
   */
  variant?: ChatMessageVariant;
  /**
   * Rich content that belongs to this message, shown inside the same bubble
   * beneath the text - e.g. a RecipeCard on an AI reply.
   */
  attachment?: ReactNode;
  className?: string;
}

/**
 * A single chat message. User messages align right (primary bg, white text);
 * AI messages align left (black text). Width hugs content up to 624px — a
 * fixed box would break for short or long messages — unless `variant="wide"`.
 */
export function ChatMessage({
  role,
  text,
  variant = "bubble",
  attachment,
  className,
}: ChatMessageProps) {
  const isUser = role === "user";
  const isWide = variant === "wide";

  const bubbleClasses = [
    styles.bubble,
    isUser ? styles.bubbleUser : styles.bubbleAi,
    isWide && (isUser ? styles.wideUser : styles.wideAi),
  ];

  return (
    <div
      // Marks this as message content rather than empty page background —
      // see the results page's click-to-reset handling.
      data-chat-message=""
      className={[styles.row, isUser ? styles.rowUser : styles.rowAi, className]
        .filter(Boolean)
        .join(" ")}
    >
      {attachment ? (
        // With an attachment the bubble becomes a container, because a <p>
        // cannot legally hold the headings and lists a recipe needs. The
        // bubble's look - padding, colour, radius - moves to the wrapper, so
        // it is visually the same bubble, just taller.
        <div className={[...bubbleClasses, styles.bubbleWithAttachment].filter(Boolean).join(" ")}>
          <Text as="p" variant="mediumRegular" className={styles.bubbleText}>
            {text}
          </Text>
          {attachment}
        </div>
      ) : (
        <Text
          as="p"
          variant="mediumRegular"
          className={bubbleClasses.filter(Boolean).join(" ")}
        >
          {text}
        </Text>
      )}
    </div>
  );
}
