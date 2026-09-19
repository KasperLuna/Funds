// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { VoiceKeySection } from "./voice-key-section";

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    voiceKey: {
      status: { query: vi.fn() },
      generate: { mutate: vi.fn() },
      revoke: { mutate: vi.fn() },
    },
  },
}));

import { trpc } from "@/lib/trpc/client";

const statusQuery = trpc.voiceKey.status.query as unknown as ReturnType<typeof vi.fn>;
const generateMutate = trpc.voiceKey.generate.mutate as unknown as ReturnType<typeof vi.fn>;
const revokeMutate = trpc.voiceKey.revoke.mutate as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("VoiceKeySection", () => {
  it("shows the generated key once after Generate", async () => {
    statusQuery.mockResolvedValue({ configured: false });
    generateMutate.mockResolvedValue({ apiKey: "a".repeat(48) });

    render(<VoiceKeySection />);
    await waitFor(() => expect(screen.getByText("Generate")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Generate"));
    await waitFor(() => expect(screen.getByText("a".repeat(48))).toBeInTheDocument());
    expect(screen.getByText(/shown once/)).toBeInTheDocument();
  });

  it("offers Replace/Revoke when a key is already configured", async () => {
    statusQuery.mockResolvedValue({ configured: true });
    revokeMutate.mockResolvedValue({ ok: true });

    render(<VoiceKeySection />);
    await waitFor(() => expect(screen.getByText("Replace")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Revoke"));
    await waitFor(() => expect(screen.getByText("Generate")).toBeInTheDocument());
  });
});
