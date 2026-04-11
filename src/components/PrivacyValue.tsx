"use client";

import { useCallback, useRef, useState } from "react";
import { useUIStore } from "@/lib/stores/useUIStore";

const PRIVACY_MASK = "●●●●";
const PEEK_DELAY_MS = 500;

interface PrivacyValueProps {
  readonly value: string;
  readonly className?: string;
  readonly "data-testid"?: string;
}

/**
 * Renders a masked value when privacy mode is on.
 * Long-press (500ms) temporarily reveals the real value until release.
 */
export function PrivacyValue({ value, className, "data-testid": testId }: PrivacyValueProps) {
  const privacyMode = useUIStore((s) => s.privacyMode);
  const [peeking, setPeeking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPeek = useCallback(() => {
    if (!privacyMode) return;
    timerRef.current = setTimeout(() => setPeeking(true), PEEK_DELAY_MS);
  }, [privacyMode]);

  const endPeek = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPeeking(false);
  }, []);

  if (!privacyMode) {
    return (
      <span className={className} data-testid={testId}>
        {value}
      </span>
    );
  }

  return (
    <span
      className={className}
      data-testid={testId}
      onMouseDown={startPeek}
      onMouseUp={endPeek}
      onMouseLeave={endPeek}
      onTouchStart={startPeek}
      onTouchEnd={endPeek}
      onTouchCancel={endPeek}
      role="button"
      tabIndex={0}
      aria-label="Long press to reveal value"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") startPeek();
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") endPeek();
      }}
    >
      {peeking ? value : PRIVACY_MASK}
    </span>
  );
}

/**
 * Inline privacy mask for compound text (e.g. "$150.00 / $500.00").
 * Does not support peek — use for secondary/label values.
 */
export function PrivacyMask({
  value,
  mask = PRIVACY_MASK,
  className,
}: Readonly<{ value: string; mask?: string; className?: string }>) {
  const privacyMode = useUIStore((s) => s.privacyMode);
  return <span className={className}>{privacyMode ? mask : value}</span>;
}
