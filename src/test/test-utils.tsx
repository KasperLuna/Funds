import { createElement, type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextType } from "@/lib/providers/AuthProvider";
import type { User } from "@/lib/types";
import { createMockUser } from "./factories";

// ── Default Auth Context ─────────────────────────────────────────────────────

const defaultAuthContext: AuthContextType = {
  user: createMockUser({ id: "test-user" }),
  isLoading: false,
  isAuthenticated: true,
  login: async () => {},
  loginWithOAuth: async () => {},
  logout: async () => {},
};

// ── Provider Options ─────────────────────────────────────────────────────────

export interface TestProviderOptions {
  /** Override the default QueryClient */
  queryClient?: QueryClient;
  /** Override auth context values */
  authContext?: Partial<AuthContextType>;
  /** Override the authenticated user */
  user?: User | null;
}

// ── Create Test QueryClient ──────────────────────────────────────────────────

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

// ── All Providers Wrapper ────────────────────────────────────────────────────

function createAllProviders(options: TestProviderOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient();

  const authValue: AuthContextType = {
    ...defaultAuthContext,
    ...options.authContext,
    ...(options.user !== undefined ? { user: options.user, isAuthenticated: !!options.user } : {}),
  };

  return function AllProviders({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(AuthContext.Provider, { value: authValue }, children),
    );
  };
}

// ── Custom Render ────────────────────────────────────────────────────────────

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  providerOptions?: TestProviderOptions;
}

/**
 * Custom render that wraps the component with QueryClientProvider and AuthProvider.
 * Creates a fresh QueryClient per call to avoid test pollution.
 */
function customRender(ui: ReactElement, options: CustomRenderOptions = {}) {
  const { providerOptions, ...renderOptions } = options;
  return render(ui, {
    wrapper: createAllProviders(providerOptions),
    ...renderOptions,
  });
}

// ── Re-exports ───────────────────────────────────────────────────────────────

export { customRender as render };
export { createAllProviders };
// Re-export everything from RTL so tests can import from one place
export * from "@testing-library/react";
// Override the default render
export { default as userEvent } from "@testing-library/user-event";
