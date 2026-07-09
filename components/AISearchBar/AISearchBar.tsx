"use client";

import { useId, useState } from "react";
import { AudioLines, Paperclip, Search } from "lucide-react";
import styles from "./AISearchBar.module.css";

export interface AISearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onAttachmentClick?: () => void;
  onVoiceClick?: () => void;
  placeholder?: string;
  className?: string;
}

/**
 * The AI search bar: search icon, free-text query, attachment + voice
 * actions. Placeholder hides on focus so an empty field shows just a
 * blinking caret (Figma "active state").
 */
export function AISearchBar({
  value,
  onChange,
  onSubmit,
  onAttachmentClick,
  onVoiceClick,
  placeholder = "Help me prepare a Blueberry Cheesecake",
  className,
}: AISearchBarProps) {
  const [internalValue, setInternalValue] = useState("");
  const inputValue = value ?? internalValue;
  const inputId = useId();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    if (onChange) onChange(next);
    else setInternalValue(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit?.(inputValue.trim());
  }

  return (
    <form
      className={[styles.bar, className].filter(Boolean).join(" ")}
      onSubmit={handleSubmit}
      role="search"
    >
      <Search className={styles.icon} aria-hidden="true" size={20} />
      <label htmlFor={inputId} className={styles.srOnly}>
        Ask DailyValue
      </label>
      <input
        id={inputId}
        type="text"
        className={styles.input}
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
      />
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={onAttachmentClick}
          aria-label="Attach a file"
        >
          <Paperclip className={styles.icon} aria-hidden="true" size={20} />
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={onVoiceClick}
          aria-label="Search by voice"
        >
          <AudioLines className={styles.icon} aria-hidden="true" size={20} />
        </button>
      </div>
    </form>
  );
}
