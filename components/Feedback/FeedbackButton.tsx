"use client";

import { useState } from "react";
import { AddButton } from "@/components/AddButton/AddButton";
import { FeedbackModal } from "./FeedbackModal";

export interface FeedbackButtonProps {
  className?: string;
}

/**
 * The "Feedback" CTA. Clicking it opens the feedback dialog; the dialog closes
 * on submit, Escape, or a click outside it.
 */
export function FeedbackButton({ className }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AddButton
        label="Feedback"
        showIcon={false}
        className={className}
        onAdd={() => setOpen(true)}
      />
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}
