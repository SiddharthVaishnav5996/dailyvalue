"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AudioLines, CircleStop, Paperclip, Search } from "lucide-react";
import { QuickSearchResults } from "./QuickSearchResults";
import styles from "./AISearchBar.module.css";

export interface AISearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onAttachmentClick?: () => void;
  /** Fires once the user picks a file from the native file picker. */
  onFileSelect?: (file: File) => void;
  onVoiceClick?: () => void;
  onVoiceStop?: () => void;
  placeholder?: string;
  /**
   * Cycles these as the placeholder, one every `rotateMs`, each rising out of
   * the field as the next rises in. Takes precedence over `placeholder`.
   */
  placeholders?: string[];
  rotateMs?: number;
  /** Hides the attachment + voice controls (the header's quick search). */
  showActions?: boolean;
  /** "compact" is the shorter, narrower bar that fits inside the header. */
  size?: "default" | "compact";
  /**
   * Let the field hold more than one line: Shift+Enter starts a new line and
   * the bar grows to fit, up to six lines. Enter on its own still searches.
   *
   * On by default everywhere except the header's compact bar, which lives in a
   * 75px-tall strip and has nowhere to grow into.
   */
  multiline?: boolean;
  /**
   * Show the instant catalog results panel while typing.
   *
   * On for the header's compact bar, which is the quick-lookup entry point for
   * a shopper who already knows what they want and does not need the AI to
   * plan a shop. Off for the big bar, whose whole job is to ask the AI.
   */
  showQuickResults?: boolean;
  className?: string;
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * The AI search bar: search icon, free-text query, attachment + voice
 * actions. Placeholder hides on focus so an empty field shows just a
 * blinking caret (Figma "active state").
 *
 * The field is a <textarea>, not an <input>, because an <input> can only ever
 * hold one line - no amount of styling changes that. A shopper writing out a
 * whole thought ("my fridge is empty" / "I also need something for Sunday")
 * wants to break it up, so Shift+Enter starts a new line and the bar grows to
 * fit. Enter on its own searches.
 *
 * Growing is done in JavaScript rather than CSS: the field is reset to "auto"
 * so it can shrink when text is deleted, then set to its own scrollHeight -
 * the height its content actually needs. The stylesheet caps that at six
 * lines, after which the field scrolls instead of pushing the page around.
 *
 * The paperclip opens the OS file picker directly (a hidden file input).
 * The mic starts a running mm:ss timer with a stop icon beside it — there's
 * no real audio capture yet, just the recording affordance.
 */
export function AISearchBar({
  value,
  onChange,
  onSubmit,
  onAttachmentClick,
  onFileSelect,
  onVoiceClick,
  onVoiceStop,
  placeholder = "Help me prepare a Blueberry Cheesecake",
  placeholders,
  rotateMs = 2000,
  showActions = true,
  size = "default",
  multiline = size !== "compact",
  showQuickResults = size === "compact",
  className,
}: AISearchBarProps) {
  const [internalValue, setInternalValue] = useState("");
  const inputValue = value ?? internalValue;
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Whether the instant-results panel is showing. The panel itself decides it
  // has nothing to say for a one-character query, so this only tracks intent:
  // typing or focusing opens it, Escape / a click outside / searching closes it.
  const [quickOpen, setQuickOpen] = useState(false);
  const quickVisible = showQuickResults && quickOpen && inputValue.trim().length >= 2;

  const rotating = (placeholders?.length ?? 0) > 1;
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (!rotating) return;
    const id = setInterval(
      () => setPlaceholderIndex((i) => (i + 1) % placeholders!.length),
      rotateMs,
    );
    return () => clearInterval(id);
  }, [rotating, placeholders, rotateMs]);

  useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  // Resize the field to fit its contents.
  //
  // useLayoutEffect, not useEffect: it runs after React has written to the DOM
  // but BEFORE the browser paints, so the taller bar is the first thing drawn.
  // With a plain useEffect the old height would be painted first and the bar
  // would visibly jump on every new line.
  //
  // It runs on the value rather than on keystrokes so that a cleared field -
  // which happens after a search is submitted - shrinks back down too.
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field || !multiline) return;
    field.style.height = "auto";
    // An empty field stays at its single `rows={1}` line, hidden. Measuring
    // scrollHeight here would fold in the *placeholder*: a long placeholder in a
    // narrow field wraps to many lines, which used to blow the bar up to the
    // 6-line cap and reveal a scrollbar.
    if (!inputValue) {
      field.style.overflowY = "hidden";
      return;
    }
    // With real text, grow to fit — and only let it scroll (showing its
    // scrollbar) once the text tops the CSS max-height cap.
    const maxHeight = parseFloat(getComputedStyle(field).maxHeight);
    field.style.overflowY =
      Number.isFinite(maxHeight) && field.scrollHeight > maxHeight ? "auto" : "hidden";
    field.style.height = `${field.scrollHeight}px`;
  }, [inputValue, multiline]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    if (onChange) onChange(next);
    else setInternalValue(next);
    if (showQuickResults) setQuickOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQuickOpen(false);
    onSubmit?.(inputValue.trim());
  }

  /**
   * Enter searches; Shift+Enter starts a new line.
   *
   * A <textarea> does not submit its form on Enter the way an <input> does, so
   * the search has to be triggered here.
   */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Escape dismisses the results without clearing what was typed.
    if (e.key === "Escape" && quickVisible) {
      e.preventDefault();
      setQuickOpen(false);
      return;
    }

    if (e.key !== "Enter") return;

    // Typing Japanese, Chinese or Korean goes through an input method editor,
    // where Enter accepts the suggested word rather than finishing the
    // sentence. Searching on that Enter would send a half-typed query.
    if (e.nativeEvent.isComposing) return;

    if (e.shiftKey && multiline) return; // let the browser insert the newline

    e.preventDefault();
    onSubmit?.(inputValue.trim());
  }

  function startRecording() {
    setElapsedSeconds(0);
    setIsRecording(true);
    onVoiceClick?.();
  }

  function stopRecording() {
    setIsRecording(false);
    setElapsedSeconds(0);
    onVoiceStop?.();
  }

  function handleAttachmentClick() {
    onAttachmentClick?.();
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelect?.(file);
    // Reset so picking the same file again still fires a change event.
    e.target.value = "";
  }

  return (
    <>
      {/* Transparent full-screen catcher, so a click anywhere else dismisses
          the results - the same approach the cart and wishlist panels use. It
          is a SIBLING of the bar, not a child: the bar lifts above it while
          open (.barQuickOpen) so the field stays typable underneath. */}
      {quickVisible && (
        <div
          className={styles.quickCatcher}
          onClick={() => setQuickOpen(false)}
          role="presentation"
        />
      )}

      <form
        className={[
          styles.bar,
          size === "compact" ? styles.barCompact : "",
          quickVisible ? styles.barQuickOpen : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        onSubmit={handleSubmit}
        role="search"
      >
        <Search className={styles.icon} aria-hidden="true" size={size === "compact" ? 18 : 20} />
        <label htmlFor={inputId} className={styles.srOnly}>
          Ask DailyValue
        </label>

        {/* The rotating placeholder can't be the native `placeholder` attribute —
            that's a plain string and isn't animatable. It's an overlay instead,
            shown only while the field is empty, and never clickable so taps still
            land on the input underneath. */}
        <div className={styles.field}>
          <textarea
            id={inputId}
            ref={fieldRef}
            // One line to start with. Anything taller is measured and applied
            // above; without this a textarea opens two rows deep.
            rows={1}
            className={styles.input}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => showQuickResults && setQuickOpen(true)}
            placeholder={rotating ? "" : placeholder}
            autoComplete="off"
            // Phone keyboards show a "search" key instead of a newline key.
            enterKeyHint="search"
          />
          {rotating && !inputValue && (
            <div className={styles.rotator} aria-hidden="true">
              <span
                key={placeholderIndex}
                className={styles.rotatorItem}
                style={{ animationDuration: `${rotateMs}ms` }}
              >
                {placeholders![placeholderIndex]}
              </span>
            </div>
          )}
        </div>

        {showActions && (
        <div className={styles.actions}>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className={styles.hiddenFileInput}
            tabIndex={-1}
            aria-hidden="true"
          />
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleAttachmentClick}
            aria-label="Attach a file"
          >
            <Paperclip className={styles.icon} aria-hidden="true" size={20} />
          </button>
          {isRecording ? (
            <div className={styles.recording}>
              <span className={styles.timer}>{formatElapsed(elapsedSeconds)}</span>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={stopRecording}
                aria-label="Stop recording"
              >
                <CircleStop className={styles.icon} aria-hidden="true" size={20} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={startRecording}
              aria-label="Search by voice"
            >
              <AudioLines className={styles.icon} aria-hidden="true" size={20} />
            </button>
          )}
        </div>
        )}

        {quickVisible && <QuickSearchResults query={inputValue} />}
      </form>
    </>
  );
}
