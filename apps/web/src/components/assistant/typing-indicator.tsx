export const TypingIndicator = () => (
  <div
    role="status"
    aria-label="Assistant is thinking"
    className="inline-flex items-center gap-1 rounded-(--radius-md) bg-(--surface-2) px-3 py-2 text-xs text-zinc-500"
  >
    Thinking on-device
    <span aria-hidden className="ml-1 inline-flex gap-0.5">
      <span className="h-1 w-1 animate-bounce rounded-full bg-zinc-500" />
      <span className="h-1 w-1 animate-bounce rounded-full bg-zinc-500 [animation-delay:120ms]" />
      <span className="h-1 w-1 animate-bounce rounded-full bg-zinc-500 [animation-delay:240ms]" />
    </span>
  </div>
);
