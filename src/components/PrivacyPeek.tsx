"use client";
import { useState, useRef, useCallback } from "react";

interface PrivacyPeekProps {
  /** The real value to show on peek */
  revealedContent: React.ReactNode;
  /** The masked content shown by default */
  maskedContent: React.ReactNode;
  /** Whether privacy mode is active — if false, always shows revealed */
  isPrivate: boolean;
  /** Optional className for the wrapper */
  className?: string;
}

const LONG_PRESS_MS = 400;

/**
 * Wraps content that should be peekable via long press when privacy mode is on.
 * On desktop: mousedown hold. On mobile: touchstart hold.
 */
export function PrivacyPeek({
  revealedContent,
  maskedContent,
  isPrivate,
  className,
}: PrivacyPeekProps) {
  const [peeking, setPeeking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPeek = useCallback(() => {
    if (!isPrivate) return;
    timerRef.current = setTimeout(() => setPeeking(true), LONG_PRESS_MS);
  }, [isPrivate]);

  const stopPeek = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPeeking(false);
  }, []);

  if (!isPrivate) return <>{revealedContent}</>;

  return (
    <span
      className={className}
      onMouseDown={startPeek}
      onMouseUp={stopPeek}
      onMouseLeave={stopPeek}
      onTouchStart={startPeek}
      onTouchEnd={stopPeek}
      onTouchCancel={stopPeek}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      {peeking ? revealedContent : maskedContent}
    </span>
  );
}
