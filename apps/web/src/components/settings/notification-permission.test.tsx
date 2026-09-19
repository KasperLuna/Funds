// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NotificationPermission } from "./notification-permission";

vi.mock("@/lib/sync/sync-context", () => ({
  useSync: () => ({ db: {}, userId: "u1" }),
}));

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

import { toast } from "sonner";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "Notification",
    class {
      static permission = "granted";
      static requestPermission = vi.fn();
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NotificationPermission test push", () => {
  it("sends a test push and toasts the result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ delivered: 1, total: 1 }),
      }),
    );

    render(<NotificationPermission />);
    fireEvent.click(screen.getByText("Test"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/push/test", { method: "POST" });
    });
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith("Test sent — check your notifications");
    });
  });

  it("nudges re-enrollment when the server holds no subscriptions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ delivered: 0, total: 0 }),
      }),
    );

    render(<NotificationPermission />);
    fireEvent.click(screen.getByText("Test"));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        "No subscriptions on the server — toggle off and on again",
      );
    });
  });

  it("names missing server keys instead of blaming subscriptions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ delivered: 0, total: 0, vapidConfigured: false }),
      }),
    );

    render(<NotificationPermission />);
    fireEvent.click(screen.getByText("Test"));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        "Push keys missing on the server — generate VAPID keys",
      );
    });
  });
});
