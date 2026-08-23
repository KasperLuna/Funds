// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import SettingsPage from "@/app/dashboard/settings/page";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false }),
    signOut: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    // Stub Notification for jsdom
    vi.stubGlobal("Notification", { permission: "default" });
  });

  it("renders all sections", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText("Onboarding")).toBeInTheDocument();
    expect(screen.getByText("Sync")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
  });

  it("renders checklist items", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Create first account")).toBeInTheDocument();
    expect(screen.getByText("Log first transaction")).toBeInTheDocument();
    expect(screen.getByText("Connect bank")).toBeInTheDocument();
  });

  it("renders sync status", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Local mode")).toBeInTheDocument();
    expect(screen.getByText("Sign in to sync across devices")).toBeInTheDocument();
  });

  it("renders privacy toggle", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Privacy mode")).toBeInTheDocument();
    expect(screen.getByText("Reveal")).toBeInTheDocument();
  });
});
