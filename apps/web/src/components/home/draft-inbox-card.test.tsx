// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { DraftInboxCard, draftAge, formatDraftAmount } from "./draft-inbox-card";
import type { DraftItem } from "@/lib/voice/drafts";

vi.mock("@/lib/privacy/privacy-store", () => ({
  usePrivacyStore: (selector: (s: { masked: boolean }) => unknown) =>
    selector({ masked: false }),
}));

function makeDraft(overrides: Partial<DraftItem> = {}): DraftItem {
  return {
    id: "d1",
    accountId: "a1",
    preview: {
      rawText: "4.50 Oat latte",
      amount: 4.5,
      currency: "USD",
      account: "Apple Card",
      categories: [],
      description: "Oat latte",
      candidates: [],
      confidence: 0.9,
    },
    source: "webhook",
    createdAt: new Date(Date.now() - 30 * 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60_000).toISOString(),
    ...overrides,
  };
}

const ACCOUNTS = [{ id: "a1", name: "Apple Card" }];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("formatDraftAmount / draftAge", () => {
  it("formats signed major amounts", () => {
    expect(formatDraftAmount(makeDraft().preview)).toBe("-$4.50");
  });

  it("returns null without an amount", () => {
    const preview = { ...makeDraft().preview, amount: undefined };
    expect(formatDraftAmount(preview)).toBeNull();
  });

  it("ages minutes, hours, days", () => {
    const now = new Date("2026-09-19T12:00:00Z").getTime();
    expect(draftAge(new Date(now - 30_000).toISOString(), now)).toBe("just now");
    expect(draftAge(new Date(now - 30 * 60_000).toISOString(), now)).toBe("30m ago");
    expect(draftAge(new Date(now - 5 * 3_600_000).toISOString(), now)).toBe("5h ago");
    expect(draftAge(new Date(now - 2 * 86_400_000).toISOString(), now)).toBe("2d ago");
  });
});

describe("DraftInboxCard", () => {
  it("renders rows and routes open/discard", () => {
    const onOpen = vi.fn();
    const onDiscard = vi.fn();
    render(
      <DraftInboxCard
        drafts={[
          makeDraft(),
          makeDraft({
            id: "d2",
            accountId: null,
            preview: {
              rawText: "2.00 Donut",
              amount: 2,
              currency: "USD",
              categories: [],
              description: "Donut",
              candidates: [],
              confidence: 0.8,
            },
          }),
        ]}
        accounts={ACCOUNTS}
        onOpen={onOpen}
        onDiscard={onDiscard}
      />,
    );

    expect(screen.getByText("Inbox")).toBeInTheDocument();
    expect(screen.getByText("2 drafts to review")).toBeInTheDocument();
    expect(screen.getByText("-$4.50 Oat latte")).toBeInTheDocument();
    expect(screen.getByText("-$2.00 Donut")).toBeInTheDocument();
    expect(screen.getByText("Apple Card · 30m ago")).toBeInTheDocument();

    fireEvent.click(screen.getByText("-$4.50 Oat latte"));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0]?.[0]).toMatchObject({ id: "d1" });

    fireEvent.click(screen.getByLabelText("Discard draft Oat latte"));
    expect(onDiscard).toHaveBeenCalledWith("d1");
  });

  it("falls back to the parsed name for unbound drafts", () => {
    const onOpen = vi.fn();
    const onDiscard = vi.fn();
    render(
      <DraftInboxCard
        drafts={[makeDraft({ id: "d2", accountId: null })]}
        accounts={[]}
        onOpen={onOpen}
        onDiscard={onDiscard}
      />,
    );
    expect(screen.getByText("Apple Card · 30m ago")).toBeInTheDocument();
  });
});
