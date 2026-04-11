import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnsupportedBrowserWarning } from "./UnsupportedBrowserWarning";

describe("UnsupportedBrowserWarning", () => {
  const originalUserAgent = navigator.userAgent;

  function mockUserAgent(ua: string) {
    Object.defineProperty(navigator, "userAgent", {
      value: ua,
      writable: true,
      configurable: true,
    });
  }

  beforeEach(() => {
    // Restore original UA after each test
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    });
  });

  it("renders nothing for a supported browser", () => {
    mockUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    const { container } = render(<UnsupportedBrowserWarning />);
    expect(container.innerHTML).toBe("");
  });

  it("shows a warning for an old Chrome version", () => {
    mockUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.0.0 Safari/537.36",
    );
    render(<UnsupportedBrowserWarning />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/may not be fully supported/i)).toBeInTheDocument();
  });

  it("shows a warning for an old Firefox version", () => {
    mockUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0");
    render(<UnsupportedBrowserWarning />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows a warning for an old Safari version", () => {
    mockUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15",
    );
    render(<UnsupportedBrowserWarning />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("can be dismissed by clicking the dismiss button", async () => {
    mockUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.0.0 Safari/537.36",
    );
    const user = userEvent.setup();
    render(<UnsupportedBrowserWarning />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders nothing for unknown user agents", () => {
    mockUserAgent("SomeBot/1.0");
    const { container } = render(<UnsupportedBrowserWarning />);
    expect(container.innerHTML).toBe("");
  });
});
