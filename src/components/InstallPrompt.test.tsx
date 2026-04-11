import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InstallPrompt } from "./InstallPrompt";

const mockInstall = vi.fn();

vi.mock("@/lib/hooks/usePWAInstall", () => ({
  usePWAInstall: vi.fn(() => ({
    canInstall: false,
    install: mockInstall,
    isInstalled: false,
  })),
}));

import { usePWAInstall } from "@/lib/hooks/usePWAInstall";
const mockedUsePWAInstall = vi.mocked(usePWAInstall);

describe("InstallPrompt", () => {
  it("should render nothing when canInstall is false", () => {
    const { container } = render(<InstallPrompt />);
    expect(container.innerHTML).toBe("");
  });

  it("should render nothing when isInstalled is true", () => {
    mockedUsePWAInstall.mockReturnValue({
      canInstall: true,
      install: mockInstall,
      isInstalled: true,
    });

    const { container } = render(<InstallPrompt />);
    expect(container.innerHTML).toBe("");
  });

  it("should render the install banner when canInstall is true and not installed", () => {
    mockedUsePWAInstall.mockReturnValue({
      canInstall: true,
      install: mockInstall,
      isInstalled: false,
    });

    render(<InstallPrompt />);

    expect(screen.getByText(/install funds/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /install/i })).toBeInTheDocument();
  });

  it("should call install when the Install button is clicked", async () => {
    mockedUsePWAInstall.mockReturnValue({
      canInstall: true,
      install: mockInstall,
      isInstalled: false,
    });

    const user = userEvent.setup();
    render(<InstallPrompt />);

    await user.click(screen.getByRole("button", { name: /install/i }));
    expect(mockInstall).toHaveBeenCalledOnce();
  });
});
