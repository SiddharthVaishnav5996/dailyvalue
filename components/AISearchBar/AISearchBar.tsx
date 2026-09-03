"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AudioLines, CircleStop, Paperclip, Search } from "lucide-react";
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
  className,
}: AISearchBarProps) {
  const [internalValue, setInternalValue] = useState("");
  const inputValue = value ?? internalValue;
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    if (onChange) onChange(next);
    else setInternalValue(next);
  }

  function handleSubmit(e: React.FormEvent) {
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
    <form
      className={[styles.bar, size === "compact" ? styles.barCompact : "", className]
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
        <input
          id={inputId}
          type="text"
          className={styles.input}
          value={inputValue}
          onChange={handleChange}
          placeholder={rotating ? "" : placeholder}
          autoComplete="off"
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
    </form>
  );
}
