// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NotificationPermission } from "./notification-permission";

vi.mock("@/lib/sync/sync-context", () => ({
  useSync: () => ({ db: {}, userId: "u1" }),
}));

vi.mock("@/lib/push/notifications", () => ({
  currentDeviceEndpoint: vi.fn(),
  deleteDeviceSubscription: vi.fn(),
  fetchDeviceLive: vi.fn(),
  registerDeviceSubscription: vi.fn(),
  unsubscribeFromPush: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

import { toast } from "sonner";
import {
  currentDeviceEndpoint,
  fetchDeviceLive,
  registerDeviceSubscription,
} from "@/lib/push/notifications";

const EP = "https://push.example/device-1";

function mockFetch(testBody: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown) => {
      if (String(url).startsWith("/api/push/config")) {
        return { ok: true, json: async () => ({ vapidPublicKey: "test-key" }) };
      }
      return { ok: true, json: async () => testBody };
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentDeviceEndpoint).mockResolvedValue(EP);
  vi.mocked(fetchDeviceLive).mockResolvedValue(true);
  vi.mocked(registerDeviceSubscription).mockResolvedValue(EP);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function grant(permission: "granted" | "denied" | "default" = "granted") {
  vi.stubGlobal(
    "Notification",
    class {
      static permission = permission;
      static requestPermission = vi.fn(async () => permission);
    },
  );
}

describe("NotificationPermission device states", () => {
  it("live device shows Test + Disable; test success toasts", async () => {
    grant();
    mockFetch({ delivered: 1, total: 1, vapidConfigured: true });

    render(<NotificationPermission />);
    await waitFor(() => expect(screen.getByText("Test")).toBeInTheDocument());
    expect(screen.getByText(/On for this device/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Test"));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith("Test sent — check your notifications");
    });
  });

  it("stale registration offers Sync now and verifies", async () => {
    grant();
    vi.mocked(fetchDeviceLive)
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    mockFetch({ delivered: 0, total: 0, vapidConfigured: true });

    render(<NotificationPermission />);
    await waitFor(() => expect(screen.getByText("Sync now")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Sync now"));

    await waitFor(() => {
      expect(registerDeviceSubscription).toHaveBeenCalledWith("test-key");
      expect(toast).toHaveBeenCalledWith("This device is registered again");
    });
  });

  it("no browser subscription offers Register", async () => {
    grant();
    vi.mocked(currentDeviceEndpoint).mockResolvedValue(null);
    mockFetch({ delivered: 0, total: 0, vapidConfigured: true });

    render(<NotificationPermission />);
    await waitFor(() => expect(screen.getByText("Register")).toBeInTheDocument());
    expect(screen.queryByText("Test")).not.toBeInTheDocument();
  });

  it("denied permission explains the iOS Settings path with no actions", async () => {
    grant("denied");
    mockFetch({ delivered: 0, total: 0, vapidConfigured: true });

    render(<NotificationPermission />);
    await waitFor(() =>
      expect(screen.getByText(/iOS Settings/)).toBeInTheDocument(),
    );
    expect(screen.queryByText("Enable")).not.toBeInTheDocument();
    expect(screen.queryByText("Test")).not.toBeInTheDocument();
  });

  it("unset permission offers Enable", async () => {
    grant("default");
    mockFetch({ delivered: 0, total: 0, vapidConfigured: true });

    render(<NotificationPermission />);
    await waitFor(() => expect(screen.getByText("Enable")).toBeInTheDocument());
  });

  it("names missing server keys instead of blaming subscriptions", async () => {
    grant();
    mockFetch({ delivered: 0, total: 0, vapidConfigured: false });

    render(<NotificationPermission />);
    await waitFor(() => expect(screen.getByText("Test")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Test"));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        "Push keys missing on the server — generate VAPID keys",
      );
    });
  });
});
