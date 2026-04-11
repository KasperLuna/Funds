import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

let mockPathname = "/dashboard";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { ScreenReaderAnnouncer } from "./ScreenReaderAnnouncer";

describe("ScreenReaderAnnouncer", () => {
  it("renders a visually hidden live region", () => {
    render(createElement(ScreenReaderAnnouncer));

    const output = screen.getByRole("status");
    expect(output).toBeInTheDocument();
    expect(output).toHaveClass("sr-only");
    expect(output).toHaveAttribute("aria-live", "polite");
    expect(output).toHaveAttribute("aria-atomic", "true");
  });

  it("announces the current page on mount", () => {
    mockPathname = "/dashboard";
    render(createElement(ScreenReaderAnnouncer));

    expect(screen.getByRole("status")).toHaveTextContent("Navigated to Dashboard");
  });

  it("announces Banks page", () => {
    mockPathname = "/dashboard/banks";
    render(createElement(ScreenReaderAnnouncer));

    expect(screen.getByRole("status")).toHaveTextContent("Navigated to Banks");
  });

  it("announces Crypto page", () => {
    mockPathname = "/dashboard/crypto";
    render(createElement(ScreenReaderAnnouncer));

    expect(screen.getByRole("status")).toHaveTextContent("Navigated to Crypto");
  });

  it("falls back to 'Page' for unknown routes", () => {
    mockPathname = "/unknown";
    render(createElement(ScreenReaderAnnouncer));

    expect(screen.getByRole("status")).toHaveTextContent("Navigated to Page");
  });
});
