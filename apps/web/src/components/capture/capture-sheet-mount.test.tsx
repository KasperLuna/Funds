// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SyncProvider } from "@/lib/sync/sync-context";
import { SyncQueryProvider } from "@/lib/sync/sync-query";
import { CaptureSheetProvider, useCaptureSheet } from "./capture-sheet-context";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

function withProviders(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <SyncProvider>
      <SyncQueryProvider>
        <QueryClientProvider client={client}>
          <CaptureSheetProvider>{ui}</CaptureSheetProvider>
        </QueryClientProvider>
      </SyncQueryProvider>
    </SyncProvider>
  );
}

const Toggle = () => {
  const { setOpen } = useCaptureSheet();
  return (
    <button type="button" onClick={() => setOpen(true)}>
      open
    </button>
  );
};

const Probe = () => {
  const { open } = useCaptureSheet();
  return <span data-testid="probe">{open ? "open" : "closed"}</span>;
};

describe("CaptureSheetProvider", () => {
  it("starts closed", () => {
    const { getByTestId } = render(
      withProviders(
        <>
          <Probe />
          <Toggle />
        </>,
      ),
    );
    expect(getByTestId("probe").textContent).toBe("closed");
  });

  it("toggles open via the hook", () => {
    const { getByTestId, getByText } = render(
      withProviders(
        <>
          <Probe />
          <Toggle />
        </>,
      ),
    );
    act(() => {
      getByText("open").click();
    });
    expect(getByTestId("probe").textContent).toBe("open");
  });
});
