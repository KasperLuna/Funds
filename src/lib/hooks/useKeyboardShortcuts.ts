import { useEffect, useCallback, useRef } from "react";

export interface KeyboardShortcut {
  /** Key to listen for (e.g., "k", "n", "Escape") */
  key: string;
  /** Require Ctrl (Windows/Linux) or Cmd (Mac) modifier */
  ctrlOrCmd?: boolean;
  /** Callback when shortcut is triggered */
  handler: () => void;
  /** Whether the shortcut is currently enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook that registers global keyboard shortcuts.
 *
 * Shortcuts are ignored when the user is typing in an input, textarea,
 * or contenteditable element (unless the shortcut uses ctrlOrCmd).
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const isTyping =
      target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

    for (const shortcut of shortcutsRef.current) {
      if (shortcut.enabled === false) continue;

      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      if (!keyMatch) continue;

      if (shortcut.ctrlOrCmd) {
        const modifierPressed = event.metaKey || event.ctrlKey;
        if (!modifierPressed) continue;

        event.preventDefault();
        shortcut.handler();
        return;
      }

      // For non-modifier shortcuts, skip if user is typing
      if (isTyping) continue;

      event.preventDefault();
      shortcut.handler();
      return;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
