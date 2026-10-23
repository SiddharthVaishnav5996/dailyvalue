"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";
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
  /**
   * An answer still being written: the bubble holds three moving dots instead
   * of text. Nothing else about the bubble changes, so the reply lands in the
   * same place the dots were.
   */
  thinking?: boolean;
  /** Offer an edit control on this message. Only meaningful for a user turn. */
  onEdit?: () => void;
  /** Swap the bubble for an editable field. The caller owns which one is open. */
  editing?: boolean;
  onEditSubmit?: (text: string) => void;
  onEditCancel?: () => void;
  className?: string;
}

/**
 * A single chat message. User messages align right (primary bg, white text);
 * AI messages align left (black text). Width hugs content up to 624px — a
 * fixed box would break for short or long messages — unless `variant="wide"`.
 *
 * A user message can be edited in place, the way Claude's own chat does it:
 * the bubble becomes a text field, and sending replaces the question. What
 * happens to the rest of the conversation is the caller's business — see
 * editMessage in lib/search/SearchContext.tsx.
 */
export function ChatMessage({
  role,
  text,
  variant = "bubble",
  attachment,
  thinking = false,
  onEdit,
  editing = false,
  onEditSubmit,
  onEditCancel,
  className,
}: ChatMessageProps) {
  const isUser = role === "user";
  const isWide = variant === "wide";

  const bubbleClasses = [
    styles.bubble,
    isUser ? styles.bubbleUser : styles.bubbleAi,
    isWide && (isUser ? styles.wideUser : styles.wideAi),
  ];

  const [draft, setDraft] = useState(text);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  // Open the editor with the cursor in it, at the end of what is already
  // there, and sized to the text rather than to a default two rows.
  //
  // useLayoutEffect rather than useEffect so the field is the right height in
  // the first painted frame - otherwise the bubble visibly jumps as it opens.
  useLayoutEffect(() => {
    if (!editing) return;
    const field = fieldRef.current;
    if (!field) return;

    setDraft(text);
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }, [editing, text]);

  function grow() {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onEditCancel?.();
      return;
    }
    if (e.key !== "Enter") return;
    // Mid-word in an input method editor, Enter accepts the suggestion.
    if (e.nativeEvent.isComposing) return;
    if (e.shiftKey) return; // a deliberate line break
    e.preventDefault();
    onEditSubmit?.(draft);
  }

  const stack = (
    <div className={[styles.stack, isUser ? styles.stackUser : styles.stackAi].join(" ")}>
      {editing ? (
        <div className={[...bubbleClasses, styles.editor].filter(Boolean).join(" ")}>
          <textarea
            ref={fieldRef}
            rows={1}
            className={styles.editField}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              grow();
            }}
            onKeyDown={handleKeyDown}
            aria-label="Edit your message"
          />
          <div className={styles.editActions}>
            <button type="button" className={styles.editAction} onClick={onEditCancel}>
              <Text as="span" variant="smallBold">
                Cancel
              </Text>
            </button>
            <button
              type="button"
              className={[styles.editAction, styles.editActionPrimary].join(" ")}
              onClick={() => onEditSubmit?.(draft)}
              disabled={!draft.trim()}
            >
              <Text as="span" variant="smallBold">
                Send
              </Text>
            </button>
          </div>
        </div>
      ) : thinking ? (
        <div
          className={[...bubbleClasses, styles.thinking].filter(Boolean).join(" ")}
          role="status"
        >
          <span className={styles.thinkingDots} aria-hidden="true">
            <span className={styles.thinkingDot} />
            <span className={styles.thinkingDot} />
            <span className={styles.thinkingDot} />
          </span>
          <span className={styles.srOnly}>Working on your answer</span>
        </div>
      ) : attachment ? (
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

      {onEdit && !editing && (
        <button type="button" className={styles.edit} onClick={onEdit}>
          <Pencil size={13} aria-hidden="true" />
          <Text as="span" variant="smallBold">
            Edit
          </Text>
        </button>
      )}
    </div>
  );

  return (
    <div
      // Marks this as message content rather than empty page background —
      // see the results page's click-to-reset handling.
      data-chat-message=""
      className={[styles.row, isUser ? styles.rowUser : styles.rowAi, className]
        .filter(Boolean)
        .join(" ")}
    >
      {stack}
    </div>
  );
}
