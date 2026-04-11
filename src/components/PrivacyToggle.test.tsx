import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivacyToggle } from "./PrivacyToggle";

const mockTogglePrivacyMode = vi.fn();
let mockPrivacyMode = false;

vi.mock("@/lib/stores/useUIStore", () => ({
  useUIStore: () => ({
    privacyMode: mockPrivacyMode,
    togglePrivacyMode: mockTogglePrivacyMode,
  }),
}));

describe("PrivacyToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrivacyMode = false;
  });

  it("renders with Eye icon when privacy mode is off", () => {
    render(<PrivacyToggle />);
    const button = screen.getByRole("button", { name: "Hide amounts" });
    expect(button).toBeInTheDocument();
  });

  it("renders with EyeOff icon when privacy mode is on", () => {
    mockPrivacyMode = true;
    render(<PrivacyToggle />);
    const button = screen.getByRole("button", { name: "Show amounts" });
    expect(button).toBeInTheDocument();
  });

  it("calls togglePrivacyMode on click", async () => {
    const user = userEvent.setup();
    render(<PrivacyToggle />);

    await user.click(screen.getByRole("button", { name: "Hide amounts" }));
    expect(mockTogglePrivacyMode).toHaveBeenCalledOnce();
  });

  it("has correct aria-label based on privacy state", () => {
    const { unmount } = render(<PrivacyToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Hide amounts");
    unmount();

    mockPrivacyMode = true;
    render(<PrivacyToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Show amounts");
  });
});
