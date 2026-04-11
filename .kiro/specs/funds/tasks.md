# Implementation Plan: Funds - Personal Finance Tracker

## Overview

This implementation plan breaks down the Funds personal finance tracker into actionable coding tasks. The project uses `create-t3-app` for scaffolding (Next.js, TypeScript, Tailwind CSS), with PocketBase as the backend (auth, database, real-time), React Query for server state, React Hook Form + Zod for forms, Zustand for UI state, and shadcn/ui for components. tRPC and NextAuth are excluded — PocketBase handles all API calls directly from the client and provides its own auth system. All package management uses pnpm.

## Tasks

- [x] 1. Bootstrap T3 project and configure core infrastructure
  - [x] 1.1 Initialize project with `pnpm create t3-app@latest` and configure TypeScript strict mode
    - Bootstrap with Next.js, TypeScript, Tailwind CSS (skip tRPC, Prisma, NextAuth options)
    - Configure path aliases (`@/` for `src/`)
    - Set up `pnpm-workspace.yaml` and commit `pnpm-lock.yaml`
    - _Requirements: 26.1, 26.2, 27.1_

  - [x] 1.2 Set up shadcn/ui component library and Tailwind theme
    - Install and initialize shadcn/ui via CLI
    - Add core primitives: Button, Dialog, Form, Input, Select, Tabs, Card
    - Configure dark theme and color tokens
    - _Requirements: 29.1, 29.2, 29.4, 29.5_

  - [x] 1.3 Configure development tooling and repository hygiene
    - Set up ESLint, Prettier, and Git hooks (husky)
    - Create root `.gitignore` and directory-specific `.gitignore` files
    - Create `.env.example` with placeholder values, ensure `.env.local` is gitignored
    - _Requirements: 27.1 through 27.9_

  - [x] 1.4 Set up PocketBase client and schema management
    - Install PocketBase SDK, create client instance in `src/lib/pocketbase/pocketbase.ts`
    - Create `src/lib/pocketbase/schema.ts` with all collection definitions (banks, categories, transactions, planned_transactions, tokens, push_subscriptions)
    - Create `src/lib/pocketbase/schema-validator.ts` with `validateAndCreateCollections()` and `validateSchema()` functions
    - Document RLS rules for each collection (user = @request.auth.id)
    - _Requirements: 21.1, 21.2, 21.3, 21.4_

  - [x] 1.5 Configure React Query with default options and query key factory
    - Install `@tanstack/react-query`, create `QueryClient` with stale times (5 min banks/transactions, 2 min categories)
    - Create `src/lib/providers/QueryProvider.tsx`
    - Create query key factory in `src/lib/hooks/queryKeys.ts`
    - Configure retry logic with exponential backoff, `refetchOnWindowFocus: false`, `refetchOnReconnect: true`
    - _Requirements: 14.1, 14.2, 14.6_

  - [x] 1.6 Set up Zustand stores for UI state
    - Create `useAuthStore` for token and session management only (not server data)
    - Create `useUIStore` for privacy mode, theme, sidebar state, modal visibility
    - Configure localStorage persistence for both stores
    - _Requirements: 12.3, 12.6, 9.4_

  - [x] 1.7 Configure Vitest testing framework with React Testing Library
    - Install and configure Vitest with jsdom environment
    - Set up `vitest.config.ts` with path aliases and coverage (v8 provider)
    - Create `src/test/setup.ts` with cleanup, `matchMedia` mock, `IntersectionObserver` mock
    - Add test scripts to `package.json`: `test`, `test:watch`, `test:ui`, `test:coverage`
    - _Requirements: 25.8, 28.9, 28.11_

  - [x] 1.8 Create TypeScript interfaces and types
    - Define all core interfaces in `src/lib/types.ts`: User, Bank, Category, Transaction, Transfer, PlannedTransaction, Token, PushSubscription, Currency, RecurrenceRule
    - Define form data types, filter types, and expanded types (ExpandedTransaction)
    - _Requirements: 24.7_

  - [ ]\* 1.9 Write unit tests for utility scaffolding
    - Test PocketBase client initialization
    - Test query key factory structure
    - Test Zustand store initial state
    - _Requirements: 25.3_

- [x] 2. Checkpoint - Verify project bootstrapping
  - Ensure the T3 app builds and runs, all tooling is configured, PocketBase schema is defined, and test framework works. Ask the user if questions arise.

- [x] 3. Implement authentication and user management
  - [x] 3.1 Create AuthContext and AuthProvider
    - Implement `src/lib/providers/AuthProvider.tsx` with user state, session restoration on mount
    - Implement `login(email, password)`, `loginWithOAuth(provider)`, `logout()` methods
    - Handle token refresh via PocketBase `authRefresh()`
    - _Requirements: 1.1, 1.2, 1.6, 1.7_

  - [x] 3.2 Create `useAuth` hook
    - Expose `user`, `isLoading`, `isAuthenticated`, `login`, `loginWithOAuth`, `logout`
    - _Requirements: 1.1, 1.6_

  - [x] 3.3 Build login page with email/password and Google OAuth
    - Create login form using React Hook Form + Zod validation
    - Implement email/password login flow
    - Implement Google OAuth login button and callback handling
    - Handle authentication errors with user-friendly messages
    - Redirect to `/dashboard` on success
    - _Requirements: 1.2, 1.3, 1.4, 13.1 through 13.8_

  - [x] 3.4 Implement logout and protected routes
    - Implement logout: clear token from Zustand + localStorage, clear PocketBase authStore, redirect to login
    - Create `ProtectedRoute` component that redirects unauthenticated users to login
    - _Requirements: 1.5, 17.4, 17.5_

  - [ ]\* 3.5 Write property test for authentication token persistence
    - **Property 23: Authentication Token Persistence**
    - **Validates: Requirement 1.6**

  - [ ]\* 3.6 Write integration tests for authentication flow
    - Test email/password login, OAuth login, logout, session restoration, token refresh
    - _Requirements: 28.1_

- [x] 4. Implement core data layer - Banks
  - [x] 4.1 Create bank management React Query hooks
    - Implement `useBanks()` hook with user-scoped filtering and 5-min stale time
    - Implement `useCreateBank()` mutation with optimistic update
    - Implement `useUpdateBank()` mutation with optimistic update
    - Implement `useDeleteBank()` mutation with cascade awareness
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 12.1, 12.8, 12.9_

  - [x] 4.2 Build BankForm component
    - Create form with name, primaryColor, secondaryColor fields using React Hook Form + Zod
    - Handle create and edit modes via `initialData` prop
    - Disable submit button during submission, reset form on success
    - _Requirements: 2.1, 2.2, 13.1 through 13.7_

  - [ ]\* 4.3 Write property test for bank balance calculation
    - **Property 3: Bank Balance Calculation**
    - **Validates: Requirement 2.6**

  - [ ]\* 4.4 Write property test for bank deletion cascade
    - **Property 25: Bank Deletion Cascade**
    - **Validates: Requirement 2.5**

- [x] 5. Implement core data layer - Transactions
  - [x] 5.1 Create Zod validation schemas for transactions
    - Define `transactionSchema` with description (min 1), type (enum), amount (positive), bank (min 1), categories (min 1), date
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 13.1, 13.2_

  - [x] 5.2 Create transaction management React Query hooks
    - Implement `useTransactions(bankId?, filters?)` with user-scoped filtering, date range, category, search text support
    - Implement `useCreateTransaction()` with optimistic update and rollback
    - Implement `useUpdateTransaction()` with optimistic update
    - Implement `useDeleteTransaction()` with cache invalidation
    - _Requirements: 3.1, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 14.3, 14.4, 14.5_

  - [x] 5.3 Build TransactionForm component
    - Create form with description, type, amount, bank (select), categories (multi-select), date (date picker) using React Hook Form + Zod
    - Handle create and edit modes, disable submit during submission
    - _Requirements: 3.1, 3.2, 3.3, 13.1 through 13.8_

  - [x] 5.4 Build TransactionCard and TransactionsTable components
    - Create `TransactionCard` for mobile display with description, amount, categories as tags, date, bank color indicator, edit/delete actions
    - Create `TransactionsTable` for desktop with sortable columns, pagination, row actions
    - Both support privacy mode
    - _Requirements: 10.10, 10.11, 9.1, 9.2_

  - [x] 5.5 Build TransactionFilter component
    - Implement bank select, category multi-select, type select, date range picker, search text input
    - Implement debounced search (300ms)
    - _Requirements: 3.7, 3.8, 3.9, 16.5_

  - [x] 5.6 Implement transfer functionality
    - Create transfer logic that creates two transactions (withdrawal from origin, deposit to destination)
    - Ensure balance preservation across both banks
    - _Requirements: 3.12_

  - [ ]\* 5.7 Write property tests for transaction validation
    - **Property 1: Transaction Amount Validation**
    - **Validates: Requirement 3.4**
    - **Property 2: Category Requirement for Transactions**
    - **Validates: Requirement 3.5**

  - [ ]\* 5.8 Write property test for transfer balance preservation
    - **Property 18: Transfer Balance Preservation**
    - **Validates: Requirement 3.12**

  - [ ]\* 5.9 Write integration tests for transaction management
    - Test create, update, delete with validation, optimistic updates, rollback on error
    - _Requirements: 28.2_

- [x] 6. Implement category management and budget tracking
  - [x] 6.1 Create category management React Query hooks
    - Implement `useCategories()` with user-scoped filtering and 2-min stale time
    - Implement `useCreateCategory()`, `useUpdateCategory()`, `useDeleteCategory()` mutations
    - Handle category deletion cascade (remove from associated transactions)
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 6.2 Build CategoryForm component
    - Create form with name, monthly_budget, hideable, total_exempt fields using React Hook Form + Zod
    - Handle create and edit modes
    - _Requirements: 4.1, 4.2, 13.1 through 13.8_

  - [x] 6.3 Implement budget calculation utilities
    - Create `calculateCategorySpending(transactions, categoryId, dateRange)` in `src/lib/utils/calculations.ts`
    - Create `calculateBudgetRemaining(budget, spending)` returning `Math.max(0, budget - spending)`
    - Implement timezone-aware month boundary calculation using user's local timezone
    - _Requirements: 5.2, 5.3, 5.6, 5.7_

  - [x] 6.4 Build BudgetsSummary component
    - Display progress bars per category with color coding (green < 50%, yellow 50-80%, red > 80%)
    - Show spending vs budget, percentage used
    - Support privacy mode (hide amounts)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 9.2_

  - [ ]\* 6.5 Write property tests for budget calculations
    - **Property 4: Category Spending Calculation**
    - **Validates: Requirement 5.2**
    - **Property 5: Budget Remaining Calculation**
    - **Validates: Requirement 5.3**
    - **Property 8: Timezone-Aware Budget Periods**
    - **Validates: Requirement 5.7**

  - [ ]\* 6.6 Write property test for category deletion cascade
    - **Property 24: Category Deletion Cascade**
    - **Validates: Requirement 4.6**

  - [ ]\* 6.7 Write integration tests for budget tracking
    - Test monthly spending calculation, budget remaining, overspending detection
    - _Requirements: 28.4_

- [x] 7. Checkpoint - Verify core data layer
  - Ensure all tests pass for banks, transactions, categories, and budget calculations. Ask the user if questions arise.

- [x] 8. Implement cryptocurrency tracking
  - [x] 8.1 Create cryptocurrency React Query hooks
    - Implement `useTokens()` with user-scoped filtering
    - Implement `useCreateToken()`, `useUpdateToken()`, `useDeleteToken()` mutations
    - _Requirements: 7.1, 7.2, 7.3, 7.8_

  - [x] 8.2 Set up CoinGecko API integration
    - Create `src/lib/utils/crypto.ts` with price fetching utility
    - Implement price update mechanism with configurable interval
    - Handle API rate limiting gracefully
    - _Requirements: 7.4, 7.5, 7.9_

  - [x] 8.3 Create TokensProvider context
    - Implement `src/lib/providers/TokensProvider.tsx` for crypto data context
    - Manage price state and portfolio calculations
    - _Requirements: 7.3, 7.5_

  - [x] 8.4 Build TokenForm component
    - Create form with name, symbol, coingecko_id, quantity, costAvg using React Hook Form + Zod
    - _Requirements: 7.1, 7.2, 13.1 through 13.8_

  - [x] 8.5 Build CryptoDashboard component
    - Display token list with holdings, current values, price changes
    - Show portfolio composition and total value
    - Calculate percentage change: `(current_price - costAvg) / costAvg`
    - Support privacy mode
    - _Requirements: 7.3, 7.5, 7.6, 7.7, 9.1, 9.2_

  - [ ]\* 8.6 Write property test for crypto portfolio calculation
    - **Property 19: Crypto Portfolio Calculation**
    - **Validates: Requirement 7.3**

  - [ ]\* 8.7 Write integration tests for crypto tracking
    - Test token CRUD, portfolio value calculation, price updates without full re-renders
    - _Requirements: 28.3_

- [x] 9. Implement planned transactions and notifications
  - [x] 9.1 Create planned transaction React Query hooks
    - Implement `usePlannedTransactions()` with user-scoped filtering
    - Implement `useCreatePlannedTransaction()`, `useUpdatePlannedTransaction()`, `useDeletePlannedTransaction()` mutations
    - _Requirements: 6.1, 6.7, 6.9, 6.10_

  - [x] 9.2 Implement recurrence calculation utilities
    - Create `calculateNextOccurrence(recurrenceRule, previousDate)` in `src/lib/utils/recurrence.ts`
    - Support daily, weekly, monthly, yearly frequencies with interval
    - Implement timezone-aware scheduling
    - Ensure next occurrence is always after previous occurrence
    - _Requirements: 6.2, 6.3, 6.4_

  - [x] 9.3 Build PlannedTransactionForm component
    - Create form with description, type, amount, bank, categories, recurrence (frequency + interval), timezone using React Hook Form + Zod
    - _Requirements: 6.1, 13.1 through 13.8_

  - [x] 9.4 Build UpcomingPlannedTransactions component
    - Display upcoming planned transactions with next occurrence dates
    - Support privacy mode
    - _Requirements: 6.1, 9.1, 9.2_

  - [x] 9.5 Implement push notification subscription
    - Create `usePushSubscription` hook for managing Web Push API subscriptions
    - Handle subscription endpoint storage in PocketBase push_subscriptions collection
    - Handle subscription management (subscribe/unsubscribe)
    - _Requirements: 8.1, 8.5, 8.6_

  - [x] 9.6 Create cron job API endpoint for planned transaction triggers
    - Implement `/api/cron-planned-reminders/route.ts`
    - Check for due planned transactions, create corresponding transactions
    - Send push notifications to subscribed devices
    - Update `previousDate`, `invokeDate`, `lastNotifiedAt` fields
    - _Requirements: 6.5, 6.6, 6.8, 8.2, 8.3, 8.4_

  - [ ]\* 9.7 Write property tests for planned transaction recurrence
    - **Property 7: Planned Transaction Recurrence**
    - **Validates: Requirement 6.2, 6.8**
    - **Property 9: Timezone-Aware Planned Transactions**
    - **Validates: Requirement 6.4**

  - [ ]\* 9.8 Write integration tests for planned transactions
    - Test recurrence calculation, timezone-aware triggering, notification sending
    - _Requirements: 28.5_

- [x] 10. Checkpoint - Verify feature modules
  - Ensure all tests pass for crypto, planned transactions, and notifications. Ask the user if questions arise.

- [x] 11. Build responsive layout and dashboard UI
  - [x] 11.1 Create `useResponsive` hook
    - Implement breakpoint detection: mobile (< 768px), tablet (768-1024px), desktop (> 1024px)
    - Return `isMobile`, `isTablet`, `isDesktop`, `breakpoint`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 11.2 Build RootLayout with providers
    - Wire up `AuthProvider`, `QueryClientProvider`, `TokensProvider` in `src/app/layout.tsx`
    - Set up viewport metadata, font loading, global styles
    - _Requirements: 24.1_

  - [x] 11.3 Build DashboardLayout with responsive navigation
    - Implement desktop sidebar (240px, collapsible to 176px on tablet)
    - Implement mobile header (60px fixed top) with logo, privacy toggle, menu
    - Implement mobile bottom nav (60px fixed bottom) with Dashboard, Banks, Crypto, Settings tabs
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 11.4 Build Dashboard page with summary components
    - Create `AssetSummary` component (total assets = bank total + crypto total, breakdown)
    - Create `BankSummary` component (bank card carousel, responsive: 1 card mobile, 2 tablet, 3+ desktop)
    - Integrate `BudgetsSummary` and `UpcomingPlannedTransactions`
    - All components support privacy mode
    - _Requirements: 9.1, 9.2, 9.4, 9.5_

  - [x] 11.5 Build Banks management page
    - Create `BankSelect` component for bank selection
    - Create `TransactionsContainer` wiring TransactionFilter, TransactionCard (mobile), TransactionsTable (desktop)
    - Integrate BankForm and TransactionForm in dialogs/bottom sheets
    - _Requirements: 10.10, 10.11_

  - [x] 11.6 Build Crypto tracking page
    - Wire `CryptoDashboard`, `TokenForm`, portfolio summary
    - _Requirements: 7.3, 7.5, 7.6, 7.7_

  - [x] 11.7 Implement PrivacyToggle component
    - Create toggle component integrated with `useUIStore`
    - Apply privacy mode to all monetary displays across all views
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]\* 11.8 Write property tests for responsive layout
    - **Property 11: Responsive Layout Adaptation**
    - **Validates: Requirement 10.1, 10.2, 10.3, 10.4**
    - **Property 12: Touch Target Size**
    - **Validates: Requirement 10.6**
    - **Property 13: Horizontal Scroll Prevention**
    - **Validates: Requirement 10.7**

  - [ ]\* 11.9 Write property test for privacy mode consistency
    - **Property 10: Privacy Mode Consistency**
    - **Validates: Requirement 9.1, 9.2**

  - [ ]\* 11.10 Write integration tests for responsive design
    - Test mobile, tablet, desktop layout rendering and adaptation on resize
    - _Requirements: 28.8_

- [x] 12. Implement state management patterns and optimistic updates
  - [x] 12.1 Implement optimistic update pattern for all mutations
    - Create reusable optimistic update helpers for create/update/delete
    - Implement rollback on error for all mutation hooks
    - Handle cache invalidation on success
    - _Requirements: 14.3, 14.4, 14.5, 12.8, 12.9_

  - [x] 12.2 Implement error handling and retry logic
    - Create `handleApiError` utility in `src/lib/utils/error.ts`
    - Handle 401 (redirect to login), 422 (validation errors), network errors
    - Implement automatic retry with exponential backoff
    - Display user-friendly error messages via toast
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [x] 12.3 Create formatting and calculation utility functions
    - Implement `formatCurrency(amount, currency)`, `formatDate(date)`, `formatPercentage(value)` in `src/lib/utils/formatting.ts`
    - Implement `calculateTotalBalance(banks)` in `src/lib/utils/calculations.ts`
    - _Requirements: 22.2, 22.3_

  - [ ]\* 12.4 Write property tests for state management architecture
    - **Property 14: React Query Server State**
    - **Validates: Requirement 12.1**
    - **Property 15: React Hook Form Usage**
    - **Validates: Requirement 12.2**
    - **Property 16: Zustand UI State Only**
    - **Validates: Requirement 12.3**

  - [ ]\* 12.5 Write property tests for optimistic updates
    - **Property 17: Optimistic Update Rollback**
    - **Validates: Requirement 14.4**
    - **Property 21: Cache Invalidation on Mutation**
    - **Validates: Requirement 14.5**

  - [ ]\* 12.6 Write property test for form validation error display
    - **Property 22: Form Validation Error Display**
    - **Validates: Requirement 13.4**

  - [ ]\* 12.7 Write unit tests for utility functions
    - Test formatting utilities (currency, date, percentage)
    - Test calculation utilities (balance, spending, budget)
    - _Requirements: 25.3_

- [x] 13. Checkpoint - Verify UI and state management
  - Ensure all tests pass for layout, dashboard, state management, and utilities. Ask the user if questions arise.

- [x] 14. Implement security and data isolation
  - [x] 14.1 Implement user data isolation
    - Add user filter (`user = @request.auth.id`) to all PocketBase queries
    - Verify user ownership on all mutations
    - Ensure RLS rules are documented and applied per collection
    - _Requirements: 17.6, 6.1_

  - [x] 14.2 Implement authentication token management
    - Secure token storage in localStorage with Zustand persistence
    - Token refresh logic via PocketBase `authRefresh()`
    - Token expiration handling and automatic re-authentication prompt
    - Session timeout after 30 minutes of inactivity
    - _Requirements: 17.1, 17.2, 17.3, 17.8_

  - [x] 14.3 Implement input validation on client and server
    - Client-side validation with Zod schemas for all forms
    - Server-side validation via PocketBase collection rules
    - _Requirements: 17.7_

  - [ ]\* 14.4 Write property test for user data isolation
    - **Property 6: User Data Isolation**
    - **Validates: Requirement 12.1**

- [x] 15. Implement offline support and service worker
  - [x] 15.1 Implement service worker for offline caching
    - Create `public/sw.js` with cache-first strategy for critical assets
    - Cache `/`, `/dashboard`, `/offline.html`
    - Handle fetch events with cache fallback
    - _Requirements: 11.1, 11.4, 20.6_

  - [x] 15.2 Implement offline transaction queueing
    - Create offline queue in localStorage
    - Queue transactions when offline, sync when online
    - _Requirements: 11.2, 11.3, 11.5_

  - [x] 15.3 Build offline indicator component
    - Display offline status in UI
    - Show sync status for queued transactions
    - _Requirements: 11.4_

  - [ ]\* 15.4 Write property test for offline transaction queueing
    - **Property 20: Offline Transaction Queueing**
    - **Validates: Requirement 11.2**

  - [ ]\* 15.5 Write integration tests for offline support
    - Test offline data caching, transaction queueing, sync on reconnect
    - _Requirements: 28.3_

- [x] 16. Implement PWA support
  - [x] 16.1 Create PWA manifest and configure icons
    - Create `public/manifest.json` with app name, icons (192px, 512px), theme color (`#0f172a`), standalone display mode, shortcuts
    - Configure PWA screenshots for mobile and desktop
    - _Requirements: 20.8, 20.9, 20.10_

  - [x] 16.2 Implement iOS home screen support
    - Add iOS meta tags: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`
    - Configure `apple-touch-icon`
    - _Requirements: 20.1, 20.2_

  - [x] 16.3 Implement Android install prompt
    - Create `usePWAInstall` hook handling `beforeinstallprompt` event
    - Build install prompt UI component
    - _Requirements: 20.3, 20.4_

  - [ ]\* 16.4 Write property tests for PWA
    - **Property 34: PWA Installation on iOS**
    - **Validates: Requirement 20.1, 20.2**
    - **Property 35: PWA Installation on Android**
    - **Validates: Requirement 20.3, 20.4**
    - **Property 36: PWA Offline Support**
    - **Validates: Requirement 20.6**
    - **Property 37: PWA Manifest Configuration**
    - **Validates: Requirement 20.8, 20.9, 20.10**

- [x] 17. Implement accessibility and browser compatibility
  - [x] 17.1 Implement keyboard navigation
    - Ensure all interactive elements are keyboard accessible
    - Add keyboard shortcuts for common actions
    - _Requirements: 18.1_

  - [x] 17.2 Add ARIA labels and semantic HTML
    - Add ARIA labels to all interactive elements and forms
    - Use semantic HTML elements throughout (nav, main, section, article)
    - Announce page changes and updates for screen readers
    - _Requirements: 18.2, 18.4, 18.5_

  - [x] 17.3 Ensure color contrast meets WCAG AA
    - Verify and adjust color contrast ratios across all themes
    - _Requirements: 18.3_

  - [x] 17.4 Verify browser compatibility
    - Test on Chrome/Edge 90+, Firefox 88+, Safari 14+, mobile browsers
    - Add unsupported browser warning
    - _Requirements: 19.1 through 19.5_

  - [ ]\* 17.5 Write property tests for shadcn/ui accessibility
    - **Property 32: shadcn/ui Component Accessibility**
    - **Validates: Requirement 29.6**
    - **Property 33: Custom Component Wrapper Consistency**
    - **Validates: Requirement 29.3, 29.7**

- [x] 18. Set up test infrastructure and write remaining integration tests
  - [x] 18.1 Create test utilities, fixtures, and mock data factories
    - Create mock data factories for all entities (banks, transactions, categories, tokens, planned transactions)
    - Create custom render function with all providers
    - Create test helpers for common assertions
    - _Requirements: 25.1 through 25.7_

  - [x] 18.2 Create core integration tests
    - Authentication flow test (email/password, OAuth, logout)
    - Transaction management test (CRUD, optimistic updates)
    - Bank balance calculation test
    - Budget tracking test (spending, remaining, overspending)
    - Planned transaction test (recurrence, timezone)
    - React Query integration test (caching, invalidation, optimistic updates)
    - Form handling test (validation, error display, submission)
    - Responsive design test (layout adaptation across breakpoints)
    - _Requirements: 28.1 through 28.8_

  - [ ]\* 18.3 Write property test for test coverage threshold
    - **Property 30: Test Coverage Threshold**
    - **Validates: Requirement 28.12**

- [x] 19. Final checkpoint - Ensure all tests pass
  - Run full test suite with `pnpm test`. Verify all requirements are covered. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties from the design document
- All code uses TypeScript with strict mode
- All forms use React Hook Form with Zod validation
- All server data managed via React Query (never useState)
- All UI state managed via Zustand (never server data in Zustand)
- All package management uses pnpm
- All tests use Vitest with `vi.mock()` for mocking
- shadcn/ui is the base component library, customized via Tailwind CSS
