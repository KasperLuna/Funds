# Requirements Document: Funds - Personal Finance Tracker

## Introduction

Funds is a comprehensive personal finance tracker web application that enables users to manage multiple bank accounts, track transactions across categories, monitor cryptocurrency holdings, set budgets, and receive notifications for planned transactions. This requirements document specifies the functional, non-functional, and technical requirements derived from the design specifications, emphasizing the state management architecture and component patterns that ensure clean separation of concerns and maintainable code.

## Glossary

- **System**: The Funds personal finance tracker application
- **User**: An authenticated individual using the System
- **Bank**: A financial account managed by the User
- **Transaction**: A financial record representing money movement (income, expense, deposit, withdrawal)
- **Category**: A classification label for organizing Transactions
- **Planned_Transaction**: A recurring Transaction scheduled for future execution
- **Token**: A cryptocurrency holding tracked by the User
- **Privacy_Mode**: A UI state that hides sensitive financial values from display
- **React_Query**: Server state management library for caching and synchronizing data
- **React_Hook_Form**: Form state management library for handling input validation
- **Zustand**: Client state management library for UI-only state
- **PocketBase**: Backend service providing authentication, database, and real-time subscriptions
- **Push_Notification**: A browser notification sent to the User about planned transactions
- **Responsive_Design**: UI adaptation to different device sizes (mobile, tablet, desktop)
- **Offline_Mode**: Application functionality when network connectivity is unavailable

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to authenticate with the System using email/password or OAuth, so that I can securely access my financial data.

#### Acceptance Criteria

1. WHEN a user submits valid email and password credentials, THE System SHALL create a new user account and return an authentication token
2. WHEN a user submits valid email and password for an existing account, THE System SHALL authenticate the user and return an authentication token
3. WHEN a user submits invalid credentials, THE System SHALL reject the authentication and display an error message
4. WHEN a user initiates Google OAuth login, THE System SHALL redirect to Google's authentication service and create/authenticate the user upon successful callback
5. WHEN a user logs out, THE System SHALL clear the authentication token and redirect to the login page
6. WHEN a user closes and reopens the browser, THE System SHALL restore the user session if a valid token exists in storage
7. WHEN an authentication token expires, THE System SHALL automatically refresh the token or prompt the user to re-authenticate

### Requirement 2: Bank Account Management

**User Story:** As a user, I want to create and manage multiple bank accounts, so that I can track finances across different financial institutions.

#### Acceptance Criteria

1. WHEN a user creates a bank account with a name, THE System SHALL store the bank and associate it with the user
2. WHEN a user provides optional primary and secondary colors, THE System SHALL store these colors and apply them to the bank's visual representation
3. WHEN a user views their banks, THE System SHALL display only the banks associated with that user
4. WHEN a user edits a bank's name or colors, THE System SHALL update the bank and persist the changes
5. WHEN a user deletes a bank account, THE System SHALL remove the bank and all associated transactions
6. WHEN a user views a bank, THE System SHALL calculate and display the current balance as the sum of all transactions for that bank
7. WHEN a user creates a bank with a duplicate name, THE System SHALL allow the creation (names need not be unique)

### Requirement 3: Transaction Management

**User Story:** As a user, I want to create, view, edit, and delete transactions, so that I can accurately track my financial activity.

#### Acceptance Criteria

1. WHEN a user creates a transaction with description, type, amount, bank, categories, and date, THE System SHALL store the transaction and associate it with the user
2. WHEN a user creates a transaction with an empty description, THE System SHALL reject the transaction and display a validation error
3. WHEN a user creates a transaction with a negative or zero amount, THE System SHALL reject the transaction and display a validation error
4. WHEN a user creates a transaction without selecting at least one category, THE System SHALL reject the transaction and display a validation error
5. WHEN a user creates a transaction with a date in the future, THE System SHALL allow the creation (future-dated transactions are valid)
6. WHEN a user views transactions for a specific bank, THE System SHALL display only transactions associated with that bank
7. WHEN a user filters transactions by date range, THE System SHALL display only transactions within the specified range
8. WHEN a user filters transactions by category, THE System SHALL display only transactions tagged with the selected category
9. WHEN a user searches transactions by description, THE System SHALL display transactions matching the search text (case-insensitive)
10. WHEN a user edits a transaction, THE System SHALL update the transaction and persist all changes
11. WHEN a user deletes a transaction, THE System SHALL remove the transaction and update affected calculations
12. WHEN a user creates a transfer between two banks, THE System SHALL create two transactions (withdrawal from origin, deposit to destination) with matching amounts

### Requirement 4: Category Management

**User Story:** As a user, I want to create and manage transaction categories, so that I can organize and analyze my spending by category.

#### Acceptance Criteria

1. WHEN a user creates a category with a name, THE System SHALL store the category and associate it with the user
2. WHEN a user creates a category with an optional monthly budget, THE System SHALL store the budget for budget tracking
3. WHEN a user creates a category with a duplicate name, THE System SHALL allow the creation (names need not be unique per user)
4. WHEN a user views their categories, THE System SHALL display only the categories associated with that user
5. WHEN a user edits a category's name or budget, THE System SHALL update the category and persist the changes
6. WHEN a user deletes a category, THE System SHALL remove the category and remove it from all associated transactions
7. WHEN a user marks a category as hideable, THE System SHALL allow the category to be hidden from summary views
8. WHEN a user marks a category as total_exempt, THE System SHALL exclude the category from total balance calculations

### Requirement 5: Budget Tracking

**User Story:** As a user, I want to set and monitor budgets for spending categories, so that I can control my spending and identify overspending.

#### Acceptance Criteria

1. WHEN a user sets a monthly budget for a category, THE System SHALL store the budget amount
2. WHEN a user views the current month, THE System SHALL calculate spending per category as the sum of all transactions in that category for the current month
3. WHEN a user views budget status, THE System SHALL calculate budget remaining as (monthly_budget - current_spending) for each category
4. WHEN a user's spending exceeds the budget for a category, THE System SHALL highlight the category as overspent
5. WHEN a user views budget information, THE System SHALL display spending as a percentage of budget (0-100%+)
6. WHEN a user changes their timezone, THE System SHALL recalculate budget periods based on the new timezone
7. WHEN a user views budget data, THE System SHALL use the user's local timezone to determine month boundaries

### Requirement 6: Planned Transactions

**User Story:** As a user, I want to schedule recurring transactions, so that I can track predictable income and expenses automatically.

#### Acceptance Criteria

1. WHEN a user creates a planned transaction with description, type, amount, bank, categories, and recurrence rule, THE System SHALL store the planned transaction
2. WHEN a user specifies a recurrence rule (daily, weekly, monthly, yearly), THE System SHALL calculate the next occurrence based on the rule
3. WHEN a user specifies an interval (e.g., every 2 weeks), THE System SHALL apply the interval to the recurrence calculation
4. WHEN a user specifies a timezone, THE System SHALL schedule the planned transaction to occur at the correct local time in that timezone
5. WHEN a planned transaction's scheduled time arrives, THE System SHALL create a corresponding transaction automatically
6. WHEN a planned transaction is created, THE System SHALL send a push notification to the user at the scheduled time
7. WHEN a user enables or disables a planned transaction, THE System SHALL respect the active flag and only trigger active transactions
8. WHEN a planned transaction is triggered, THE System SHALL update the previousDate and invokeDate fields
9. WHEN a user edits a planned transaction, THE System SHALL update the transaction and recalculate future occurrences
10. WHEN a user deletes a planned transaction, THE System SHALL remove the transaction and stop future occurrences

### Requirement 7: Cryptocurrency Tracking

**User Story:** As a user, I want to track cryptocurrency holdings and view their current valuations, so that I can monitor my crypto portfolio.

#### Acceptance Criteria

1. WHEN a user adds a cryptocurrency token with name, symbol, and CoinGecko ID, THE System SHALL store the token and associate it with the user
2. WHEN a user specifies a quantity and cost average for a token, THE System SHALL store these values for portfolio calculations
3. WHEN a user views their crypto holdings, THE System SHALL display all tokens associated with the user
4. WHEN the System fetches current prices from CoinGecko, THE System SHALL update the token valuations
5. WHEN a user views their crypto portfolio, THE System SHALL calculate total portfolio value as the sum of (quantity × current_price) for all tokens
6. WHEN a user views a token, THE System SHALL display the current price, quantity, total value, and cost average
7. WHEN a user views a token, THE System SHALL calculate and display the percentage change as (current_price - cost_avg) / cost_avg
8. WHEN a user removes a token from their portfolio, THE System SHALL delete the token and remove it from portfolio calculations
9. WHEN crypto prices update, THE System SHALL update token valuations without causing full page re-renders

### Requirement 8: Push Notifications

**User Story:** As a user, I want to receive push notifications for upcoming planned transactions, so that I don't forget about scheduled payments or income.

#### Acceptance Criteria

1. WHEN a user subscribes to push notifications, THE System SHALL store the push subscription endpoint and keys
2. WHEN a planned transaction is due, THE System SHALL send a push notification to all subscribed devices
3. WHEN a push notification is sent, THE System SHALL include the transaction description, amount, and type
4. WHEN a user has multiple devices subscribed, THE System SHALL send notifications to all subscribed endpoints
5. WHEN a push subscription becomes invalid, THE System SHALL remove the subscription and handle the error gracefully
6. WHEN a user unsubscribes from notifications, THE System SHALL remove the push subscription

### Requirement 9: Privacy Mode

**User Story:** As a user, I want to hide sensitive financial values from display, so that I can use the application in public without exposing my financial information.

#### Acceptance Criteria

1. WHEN a user enables privacy mode, THE System SHALL hide all monetary amounts in the UI
2. WHEN privacy mode is enabled, THE System SHALL display placeholder values (e.g., "●●●●") instead of actual amounts
3. WHEN a user toggles privacy mode, THE System SHALL immediately update the UI to show or hide amounts
4. WHEN a user closes and reopens the browser, THE System SHALL restore the privacy mode preference
5. WHEN privacy mode is enabled, THE System SHALL hide amounts in all views (dashboard, transactions, budgets, crypto)

### Requirement 10: Responsive Design

**User Story:** As a user, I want the application to work seamlessly on mobile, tablet, and desktop devices, so that I can access my finances from any device.

#### Acceptance Criteria

1. WHEN a user accesses the application on a mobile device (< 768px), THE System SHALL display a bottom navigation bar with primary sections
2. WHEN a user accesses the application on a mobile device, THE System SHALL display a fixed header with logo and menu
3. WHEN a user accesses the application on a tablet device (768px - 1024px), THE System SHALL display a collapsible sidebar with navigation
4. WHEN a user accesses the application on a desktop device (> 1024px), THE System SHALL display a fixed sidebar with full navigation
5. WHEN a user resizes the browser window, THE System SHALL adapt the layout to the new viewport size
6. WHEN a user views content on mobile, THE System SHALL ensure all interactive elements are at least 44px in size
7. WHEN a user views content on any device, THE System SHALL ensure content is readable without horizontal scrolling
8. WHEN a user views forms on mobile, THE System SHALL display forms in a single column with stacked inputs
9. WHEN a user views forms on desktop, THE System SHALL display forms in multiple columns where appropriate
10. WHEN a user views transaction lists on mobile, THE System SHALL display transactions as cards
11. WHEN a user views transaction lists on desktop, THE System SHALL display transactions as a table

### Requirement 11: Offline Support

**User Story:** As a user, I want the application to work offline, so that I can access my financial data even without internet connectivity.

#### Acceptance Criteria

1. WHEN a user is offline, THE System SHALL display cached data from previous sessions
2. WHEN a user creates a transaction while offline, THE System SHALL queue the transaction for sync
3. WHEN a user goes online after being offline, THE System SHALL automatically sync queued transactions
4. WHEN a user is offline, THE System SHALL display an offline indicator in the UI
5. WHEN a user attempts to perform an operation that requires network connectivity while offline, THE System SHALL display an appropriate message

### Requirement 12: State Management Architecture

**User Story:** As a developer, I want the application to follow a strict state management architecture, so that the codebase is maintainable and components are decoupled.

#### Acceptance Criteria

1. THE System SHALL use React Query for ALL server state (banks, transactions, categories, tokens, planned transactions)
2. THE System SHALL use React Hook Form for ALL form input state and validation
3. THE System SHALL use Zustand ONLY for UI state (privacy mode, theme, modals, sidebar state)
4. WHEN a component needs server data, THE Component SHALL fetch it via React Query hooks, not useState
5. WHEN a component has a form, THE Component SHALL use React Hook Form, not useState for form fields
6. WHEN a component needs UI state, THE Component SHALL use Zustand, not useState
7. WHEN a component receives data from React Query, THE Component SHALL NOT duplicate the data in local state
8. WHEN a component performs an async operation, THE Component SHALL use React Query mutations, not manual fetch calls
9. WHEN a component needs to update server data, THE Component SHALL use React Query mutations with optimistic updates
10. WHEN a component renders, THE Component SHALL minimize the use of useEffect and prefer declarative patterns

### Requirement 13: Form Handling

**User Story:** As a developer, I want all forms to use React Hook Form with Zod validation, so that form handling is consistent and type-safe.

#### Acceptance Criteria

1. WHEN a form is created, THE Form SHALL use React Hook Form for state management
2. WHEN a form is created, THE Form SHALL use Zod for schema validation
3. WHEN a form is submitted, THE Form SHALL validate all fields against the Zod schema
4. WHEN a form has validation errors, THE Form SHALL display error messages for each invalid field
5. WHEN a form is submitted successfully, THE Form SHALL clear the form and show a success message
6. WHEN a form is submitted and fails, THE Form SHALL display an error message and preserve the form data
7. WHEN a form is submitted, THE Form SHALL disable the submit button during submission
8. WHEN a form field changes, THE Form SHALL validate the field in real-time (optional)

### Requirement 14: Data Fetching & Caching

**User Story:** As a developer, I want data fetching to be handled consistently with React Query, so that caching and synchronization are automatic.

#### Acceptance Criteria

1. WHEN data is fetched from the API, THE System SHALL cache the data for 5 minutes (banks, transactions)
2. WHEN data is fetched from the API, THE System SHALL automatically refetch when the cache becomes stale
3. WHEN a user performs a mutation (create, update, delete), THE System SHALL optimistically update the cache
4. WHEN a mutation fails, THE System SHALL rollback the optimistic update and display an error
5. WHEN a mutation succeeds, THE System SHALL invalidate the relevant cache and refetch data
6. WHEN a user navigates away and back to a page, THE System SHALL use cached data if available
7. WHEN a user goes offline and comes back online, THE System SHALL refetch data to ensure consistency

### Requirement 15: Error Handling

**User Story:** As a user, I want clear error messages when something goes wrong, so that I can understand what happened and how to fix it.

#### Acceptance Criteria

1. WHEN an API request fails, THE System SHALL display an error message to the user
2. WHEN a form validation fails, THE System SHALL display field-level error messages
3. WHEN a network error occurs, THE System SHALL display a network error message and offer retry options
4. WHEN an authentication error occurs, THE System SHALL redirect the user to the login page
5. WHEN a permission error occurs, THE System SHALL display a permission denied message
6. WHEN an unexpected error occurs, THE System SHALL display a generic error message and log the error

### Requirement 16: Performance

**User Story:** As a user, I want the application to load quickly and respond instantly to my actions, so that I have a smooth experience.

#### Acceptance Criteria

1. WHEN a user loads the dashboard page, THE System SHALL complete the initial page load within 3 seconds on 4G networks
2. WHEN a user views a transaction list with 100+ items, THE System SHALL render the list without noticeable lag
3. WHEN crypto prices update, THE System SHALL update the display without causing full page re-renders
4. WHEN a user creates a transaction, THE System SHALL show an optimistic update immediately
5. WHEN a user filters transactions, THE System SHALL apply filters with debouncing (300ms) to avoid excessive re-renders
6. WHEN a user scrolls through a long list, THE System SHALL maintain smooth scrolling performance

### Requirement 17: Security

**User Story:** As a user, I want my financial data to be secure and protected, so that I can trust the application with sensitive information.

#### Acceptance Criteria

1. WHEN a user logs in, THE System SHALL store the authentication token securely
2. WHEN a user makes an API request, THE System SHALL include the authentication token in the request
3. WHEN a user's token expires, THE System SHALL automatically refresh the token or prompt re-authentication
4. WHEN a user logs out, THE System SHALL clear the authentication token from storage
5. WHEN a user accesses a protected route without authentication, THE System SHALL redirect to the login page
6. WHEN a user attempts to access another user's data, THE System SHALL reject the request and display an error
7. WHEN a user submits a form, THE System SHALL validate all input on the client and server
8. WHEN a user's session is inactive for 30 minutes, THE System SHALL automatically log out the user

### Requirement 18: Accessibility

**User Story:** As a user with accessibility needs, I want the application to be usable with assistive technologies, so that I can access my financial information.

#### Acceptance Criteria

1. WHEN a user navigates the application with a keyboard, THE System SHALL provide keyboard navigation for all interactive elements
2. WHEN a user uses a screen reader, THE System SHALL provide appropriate ARIA labels and semantic HTML
3. WHEN a user views the application, THE System SHALL maintain sufficient color contrast for readability
4. WHEN a user interacts with forms, THE System SHALL provide clear labels and error messages
5. WHEN a user navigates with a screen reader, THE System SHALL announce page changes and updates

### Requirement 19: Browser Compatibility

**User Story:** As a user, I want the application to work across different browsers, so that I can use my preferred browser.

#### Acceptance Criteria

1. THE System SHALL support Chrome/Edge 90+
2. THE System SHALL support Firefox 88+
3. THE System SHALL support Safari 14+
4. THE System SHALL support mobile browsers (Chrome, Safari, Firefox on iOS/Android)
5. WHEN a user uses an unsupported browser, THE System SHALL display a compatibility warning

### Requirement 20: PWA Capabilities

**User Story:** As a user, I want to install the application as a PWA, so that I can access it like a native app on iOS and Android.

#### Acceptance Criteria

1. WHEN a user visits the application on iOS, THE System SHALL display an "Add to Home Screen" prompt in the share menu
2. WHEN a user adds the application to iOS home screen, THE System SHALL create a home screen icon and launch in fullscreen mode
3. WHEN a user visits the application on Android, THE System SHALL display an "Install App" prompt
4. WHEN a user installs the application on Android, THE System SHALL create a home screen icon and launch in fullscreen mode
5. WHEN a user launches the installed application, THE System SHALL display the app in fullscreen mode without browser UI
6. WHEN a user is offline, THE System SHALL serve cached content via service worker
7. WHEN a user has the app installed, THE System SHALL support push notifications
8. WHEN the application is installed, THE System SHALL display the app name and icon from manifest.json
9. WHEN the application is installed, THE System SHALL use the theme color from manifest.json
10. WHEN the application is installed, THE System SHALL support standalone display mode

### Requirement 21: Data Persistence

**User Story:** As a user, I want my data to be persisted across sessions, so that I don't lose my financial information.

#### Acceptance Criteria

1. WHEN a user creates a bank account, THE System SHALL persist the bank to the database
2. WHEN a user creates a transaction, THE System SHALL persist the transaction to the database
3. WHEN a user edits data, THE System SHALL persist the changes to the database
4. WHEN a user deletes data, THE System SHALL remove the data from the database
5. WHEN a user goes offline and comes back online, THE System SHALL sync any queued changes

### Requirement 22: Multi-Currency Support

**User Story:** As a user in a different country, I want to track finances in my local currency, so that I can see amounts in a familiar format.

#### Acceptance Criteria

1. WHEN a user sets their currency preference, THE System SHALL store the preference
2. WHEN a user views amounts, THE System SHALL display amounts in the user's selected currency
3. WHEN a user views amounts, THE System SHALL format amounts according to the currency's locale
4. WHEN a user creates a transaction, THE System SHALL store the amount in the user's currency
5. WHEN a user views historical data, THE System SHALL display amounts in the currency that was active at that time

### Requirement 23: Real-Time Data Synchronization

**User Story:** As a user, I want my data to be synchronized across devices in real-time, so that changes on one device appear on others.

#### Acceptance Criteria

1. WHEN a user creates a transaction on one device, THE System SHALL sync the transaction to other devices
2. WHEN a user edits data on one device, THE System SHALL sync the changes to other devices
3. WHEN a user deletes data on one device, THE System SHALL sync the deletion to other devices
4. WHEN multiple users access shared data, THE System SHALL handle concurrent updates gracefully
5. WHEN a conflict occurs during sync, THE System SHALL resolve the conflict using last-write-wins strategy

### Requirement 24: Component Design Patterns

**User Story:** As a developer, I want components to follow consistent design patterns, so that the codebase is predictable and maintainable.

#### Acceptance Criteria

1. WHEN a component displays server data, THE Component SHALL use React Query hooks to fetch data
2. WHEN a component displays server data, THE Component SHALL NOT use useState to store the data
3. WHEN a component has a form, THE Component SHALL use React Hook Form for state management
4. WHEN a component needs UI state, THE Component SHALL use Zustand stores
5. WHEN a component performs async operations, THE Component SHALL use React Query mutations
6. WHEN a component renders, THE Component SHALL minimize the use of useEffect
7. WHEN a component receives props, THE Component SHALL use TypeScript for type safety
8. WHEN a component is large, THE Component SHALL be split into smaller sub-components

### Requirement 25: Testing Strategy

**User Story:** As a developer, I want comprehensive test coverage using Vitest, so that the application is reliable and bugs are caught early.

#### Acceptance Criteria

1. WHEN a component is created, THE Component SHALL have unit tests for rendering and props
2. WHEN a hook is created, THE Hook SHALL have tests for state updates and side effects
3. WHEN a utility function is created, THE Function SHALL have tests for various inputs
4. WHEN a form is created, THE Form SHALL have tests for validation and submission
5. WHEN a critical user flow is implemented, THE Flow SHALL have integration tests using Vitest
6. WHEN property-based tests are applicable, THE System SHALL use property-based testing for universal properties
7. WHEN a bug is fixed, THE Fix SHALL include a regression test
8. WHEN tests are run, THE System SHALL use `pnpm test` command
9. WHEN tests are run in watch mode, THE System SHALL use `pnpm test:watch` command
10. WHEN test coverage is measured, THE System SHALL use `pnpm test:coverage` command

### Requirement 26: Package Management with pnpm

**User Story:** As a developer, I want to use pnpm for all package management, so that dependencies are managed efficiently and consistently.

#### Acceptance Criteria

1. WHEN installing dependencies, THE System SHALL use `pnpm install` command
2. WHEN adding a package, THE System SHALL use `pnpm add package-name` command
3. WHEN adding a dev dependency, THE System SHALL use `pnpm add -D package-name` command
4. WHEN removing a package, THE System SHALL use `pnpm remove package-name` command
5. WHEN updating dependencies, THE System SHALL use `pnpm update` command
6. WHEN checking for outdated packages, THE System SHALL use `pnpm outdated` command
7. WHEN running scripts, THE System SHALL use `pnpm run script-name` command
8. WHEN the lock file is committed, THE System SHALL commit `pnpm-lock.yaml` to version control
9. WHEN a developer clones the repository, THE System SHALL use `pnpm install --frozen-lockfile` to ensure consistency
10. WHEN managing workspaces, THE System SHALL use `pnpm-workspace.yaml` configuration

### Requirement 27: Repository Structure & Gitignore

**User Story:** As a developer, I want a well-organized repository structure with appropriate gitignore files, so that the codebase is clean and version control is efficient.

#### Acceptance Criteria

1. WHEN the repository is initialized, THE Repository SHALL have a root `.gitignore` file
2. WHEN the repository is initialized, THE Repository SHALL have directory-specific `.gitignore` files
3. WHEN environment variables are used, THE System SHALL gitignore `.env.local` and `.env.*.local` files
4. WHEN environment variables are used, THE System SHALL include `.env.example` in version control
5. WHEN dependencies are installed, THE System SHALL gitignore `node_modules/` directory
6. WHEN tests are run, THE System SHALL gitignore `coverage/` directory
7. WHEN the application is built, THE System SHALL gitignore `.next/`, `dist/`, and `build/` directories
8. WHEN IDE files are created, THE System SHALL gitignore `.vscode/`, `.idea/`, and other IDE-specific files
9. WHEN OS files are created, THE System SHALL gitignore `.DS_Store`, `Thumbs.db`, and other OS-specific files
10. WHEN the repository is cloned, THE Repository Structure SHALL be clean and ready for development

### Requirement 28: Core Integration Tests with Vitest

**User Story:** As a developer, I want core integration tests that verify critical functionalities, so that the application's core features are reliable.

#### Acceptance Criteria

1. WHEN authentication is tested, THE Test SHALL verify email/password login, OAuth login, and logout flows
2. WHEN transactions are tested, THE Test SHALL verify create, read, update, delete operations
3. WHEN bank balance is tested, THE Test SHALL verify balance calculation as sum of transactions
4. WHEN budgets are tested, THE Test SHALL verify spending calculation and budget remaining
5. WHEN planned transactions are tested, THE Test SHALL verify recurrence calculation and timezone handling
6. WHEN React Query is tested, THE Test SHALL verify caching, invalidation, and optimistic updates
7. WHEN forms are tested, THE Test SHALL verify validation, error display, and submission
8. WHEN responsive design is tested, THE Test SHALL verify layout adaptation across breakpoints
9. WHEN tests are run, THE System SHALL use Vitest as the testing framework
10. WHEN tests are run, THE System SHALL use Mock Service Worker (MSW) for API mocking
11. WHEN tests are run, THE System SHALL use `@testing-library/react` for component testing
12. WHEN test coverage is measured, THE System SHALL target 80%+ coverage for core functionalities

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Transaction Amount Validation

_For any_ transaction creation attempt, if the amount is zero or negative, the transaction SHALL be rejected and the transaction list SHALL remain unchanged.

**Validates: Requirement 3.4**

### Property 2: Category Requirement for Transactions

_For any_ transaction creation attempt, if no categories are selected, the transaction SHALL be rejected and the transaction list SHALL remain unchanged.

**Validates: Requirement 3.5**

### Property 3: Bank Balance Calculation

_For any_ bank account, the displayed balance SHALL equal the sum of all transactions associated with that bank.

**Validates: Requirement 2.6**

### Property 4: Category Spending Calculation

_For any_ category in the current month, the displayed spending SHALL equal the sum of all transaction amounts tagged with that category in the current month.

**Validates: Requirement 5.2**

### Property 5: Budget Remaining Calculation

_For any_ category with a monthly budget, the displayed budget remaining SHALL equal (monthly_budget - current_spending), and SHALL never be negative (displayed as 0 if overspent).

**Validates: Requirement 5.3**

### Property 6: User Data Isolation

_For any_ two different users, when user A queries their banks/transactions/categories, the results SHALL NOT include any data belonging to user B.

**Validates: Requirement 12.1**

### Property 7: Planned Transaction Recurrence

_For any_ planned transaction with a recurrence rule, the next occurrence date SHALL be calculated correctly based on the frequency and interval, and SHALL always be after the previous occurrence date.

**Validates: Requirement 6.2, 6.8**

### Property 8: Timezone-Aware Budget Periods

_For any_ user with a specified timezone, when calculating monthly spending, the month boundaries SHALL respect the user's local timezone (not UTC).

**Validates: Requirement 5.7**

### Property 9: Timezone-Aware Planned Transactions

_For any_ planned transaction with a specified timezone, the transaction SHALL be triggered at the correct local time in that timezone, regardless of the server's timezone.

**Validates: Requirement 6.4**

### Property 10: Privacy Mode Consistency

_For any_ UI component displaying monetary amounts, when privacy mode is enabled, the component SHALL display placeholder values instead of actual amounts; when privacy mode is disabled, the component SHALL display actual amounts.

**Validates: Requirement 9.1, 9.2**

### Property 11: Responsive Layout Adaptation

_For any_ viewport size, the layout SHALL adapt correctly: mobile (< 768px) displays bottom nav, tablet (768-1024px) displays collapsible sidebar, desktop (> 1024px) displays fixed sidebar.

**Validates: Requirement 10.1, 10.2, 10.3, 10.4**

### Property 12: Touch Target Size

_For any_ interactive element on mobile devices, the element SHALL have a minimum size of 44px × 44px to ensure touch-friendliness.

**Validates: Requirement 10.6**

### Property 13: Horizontal Scroll Prevention

_For any_ viewport size, content SHALL be readable without requiring horizontal scrolling.

**Validates: Requirement 10.7**

### Property 14: React Query Server State

_For any_ server data (banks, transactions, categories, tokens), the data SHALL be fetched and cached via React Query, not stored in component local state.

**Validates: Requirement 12.1**

### Property 15: React Hook Form Usage

_For any_ form in the application, form input state and validation SHALL be managed by React Hook Form, not useState.

**Validates: Requirement 12.2**

### Property 16: Zustand UI State Only

_For any_ Zustand store, the store SHALL contain ONLY UI state (privacy mode, theme, modals, sidebar), never server data or form input state.

**Validates: Requirement 12.3**

### Property 17: Optimistic Update Rollback

_For any_ failed mutation, the optimistic update to the cache SHALL be rolled back, and the UI SHALL display the previous state.

**Validates: Requirement 14.4**

### Property 18: Transfer Balance Preservation

_For any_ transfer between two banks, the total portfolio balance before and after the transfer SHALL remain the same (accounting for exchange rates if applicable).

**Validates: Requirement 3.12**

### Property 19: Crypto Portfolio Calculation

_For any_ cryptocurrency portfolio, the total portfolio value SHALL equal the sum of (token_quantity × current_price) for all tokens.

**Validates: Requirement 7.3**

### Property 20: Offline Transaction Queueing

_For any_ transaction created while offline, the transaction SHALL be queued and automatically synced when the user goes online.

**Validates: Requirement 11.2**

### Property 21: Cache Invalidation on Mutation

_For any_ successful mutation (create, update, delete), the relevant React Query cache SHALL be invalidated and refetched to ensure consistency.

**Validates: Requirement 14.5**

### Property 22: Form Validation Error Display

_For any_ form submission with validation errors, error messages SHALL be displayed for each invalid field, and the form SHALL NOT be submitted.

**Validates: Requirement 13.4**

### Property 23: Authentication Token Persistence

_For any_ authenticated user who closes and reopens the browser, if a valid token exists in storage, the user's session SHALL be restored without requiring re-authentication.

**Validates: Requirement 1.6**

### Property 24: Category Deletion Cascade

_For any_ category that is deleted, the category SHALL be removed from all associated transactions, and the transactions SHALL remain valid.

**Validates: Requirement 4.6**

### Property 25: Bank Deletion Cascade

_For any_ bank that is deleted, all transactions associated with the bank SHALL also be deleted.

**Validates: Requirement 2.5**

---

## Non-Functional Requirements

### Performance Requirements

- Initial page load SHALL complete within 3 seconds on 4G networks
- Transaction list with 100+ items SHALL render without noticeable lag
- Crypto price updates SHALL NOT cause full page re-renders
- Form submission SHALL show optimistic updates immediately
- Transaction filtering SHALL use debouncing (300ms) to prevent excessive re-renders

### Scalability Requirements

- System SHALL support users with 10,000+ transactions
- System SHALL support users with 100+ categories
- System SHALL support users with 50+ cryptocurrency tokens
- System SHALL handle concurrent updates from multiple devices

### Reliability Requirements

- System uptime SHALL be 99.9% or higher
- Failed mutations SHALL be retried automatically with exponential backoff
- Offline transactions SHALL be queued and synced when online
- Data corruption SHALL be detected and prevented

### Maintainability Requirements

- Code SHALL follow TypeScript best practices
- Components SHALL be modular and reusable
- State management SHALL follow the specified architecture
- Tests SHALL cover critical user flows and edge cases

### Usability Requirements

- All interactive elements SHALL be keyboard accessible
- All interactive elements SHALL have appropriate ARIA labels
- Color contrast SHALL meet WCAG AA standards
- Forms SHALL provide clear error messages

---

## Implementation Notes

### State Management Architecture

The application enforces a strict separation of concerns for state management:

1. **React Query**: Manages ALL server state (banks, transactions, categories, tokens, planned transactions)
   - Automatic caching with 5-minute stale time
   - Optimistic updates for mutations
   - Automatic refetching on stale
   - Background synchronization

2. **React Hook Form**: Manages ALL form input state and validation
   - Zod schema validation
   - Real-time field validation
   - Error message display
   - Form reset on successful submission

3. **Zustand**: Manages ONLY UI state
   - Privacy mode toggle
   - Theme preference
   - Sidebar open/closed state
   - Modal visibility states
   - Authentication token (session only, not server data)

### Component Patterns

All components MUST follow these patterns:

- **Data Display**: Use React Query hooks, never useState for server data
- **Forms**: Use React Hook Form with Zod validation
- **UI State**: Use Zustand stores for privacy mode, theme, modals
- **Async Operations**: Use React Query mutations, never manual fetch calls
- **Effects**: Minimize useEffect usage, prefer declarative patterns

### Data Fetching

- All server data fetched via React Query
- Cache stale time: 5 minutes for banks/transactions, 2 minutes for categories
- Optimistic updates for all mutations
- Automatic refetch on window focus
- Offline support via service worker caching

### Form Handling

- All forms use React Hook Form with Zod validation
- Validation schemas defined in separate files
- Error messages displayed inline
- Submit button disabled during submission
- Form reset on successful submission

### Requirement 25: Testing Strategy

**User Story:** As a developer, I want comprehensive test coverage using Vitest, so that the application is reliable and bugs are caught early.

#### Acceptance Criteria

1. WHEN a component is created, THE Component SHALL have unit tests for rendering and props
2. WHEN a hook is created, THE Hook SHALL have tests for state updates and side effects
3. WHEN a utility function is created, THE Function SHALL have tests for various inputs
4. WHEN a form is created, THE Form SHALL have tests for validation and submission
5. WHEN a critical user flow is implemented, THE Flow SHALL have integration tests using Vitest
6. WHEN property-based tests are applicable, THE System SHALL use property-based testing for universal properties
7. WHEN a bug is fixed, THE Fix SHALL include a regression test
8. WHEN tests are run, THE System SHALL use `pnpm test` command
9. WHEN tests are run in watch mode, THE System SHALL use `pnpm test:watch` command
10. WHEN test coverage is measured, THE System SHALL use `pnpm test:coverage` command

### Requirement 26: Package Management with pnpm

**User Story:** As a developer, I want to use pnpm for all package management, so that dependencies are managed efficiently and consistently.

#### Acceptance Criteria

1. WHEN installing dependencies, THE System SHALL use `pnpm install` command
2. WHEN adding a package, THE System SHALL use `pnpm add package-name` command
3. WHEN adding a dev dependency, THE System SHALL use `pnpm add -D package-name` command
4. WHEN removing a package, THE System SHALL use `pnpm remove package-name` command
5. WHEN updating dependencies, THE System SHALL use `pnpm update` command
6. WHEN checking for outdated packages, THE System SHALL use `pnpm outdated` command
7. WHEN running scripts, THE System SHALL use `pnpm run script-name` command
8. WHEN the lock file is committed, THE System SHALL commit `pnpm-lock.yaml` to version control
9. WHEN a developer clones the repository, THE System SHALL use `pnpm install --frozen-lockfile` to ensure consistency
10. WHEN managing workspaces, THE System SHALL use `pnpm-workspace.yaml` configuration

### Requirement 27: Repository Structure & Gitignore

**User Story:** As a developer, I want a well-organized repository structure with appropriate gitignore files, so that the codebase is clean and version control is efficient.

#### Acceptance Criteria

1. WHEN the repository is initialized, THE Repository SHALL have a root `.gitignore` file
2. WHEN the repository is initialized, THE Repository SHALL have directory-specific `.gitignore` files
3. WHEN environment variables are used, THE System SHALL gitignore `.env.local` and `.env.*.local` files
4. WHEN environment variables are used, THE System SHALL include `.env.example` in version control
5. WHEN dependencies are installed, THE System SHALL gitignore `node_modules/` directory
6. WHEN tests are run, THE System SHALL gitignore `coverage/` directory
7. WHEN the application is built, THE System SHALL gitignore `.next/`, `dist/`, and `build/` directories
8. WHEN IDE files are created, THE System SHALL gitignore `.vscode/`, `.idea/`, and other IDE-specific files
9. WHEN OS files are created, THE System SHALL gitignore `.DS_Store`, `Thumbs.db`, and other OS-specific files
10. WHEN the repository is cloned, THE Repository Structure SHALL be clean and ready for development

### Requirement 28: Core Integration Tests with Vitest

**User Story:** As a developer, I want core integration tests that verify critical functionalities, so that the application's core features are reliable.

#### Acceptance Criteria

1. WHEN authentication is tested, THE Test SHALL verify email/password login, OAuth login, and logout flows
2. WHEN transactions are tested, THE Test SHALL verify create, read, update, delete operations
3. WHEN bank balance is tested, THE Test SHALL verify balance calculation as sum of transactions
4. WHEN budgets are tested, THE Test SHALL verify spending calculation and budget remaining
5. WHEN planned transactions are tested, THE Test SHALL verify recurrence calculation and timezone handling
6. WHEN React Query is tested, THE Test SHALL verify caching, invalidation, and optimistic updates
7. WHEN forms are tested, THE Test SHALL verify validation, error display, and submission
8. WHEN responsive design is tested, THE Test SHALL verify layout adaptation across breakpoints
9. WHEN tests are run, THE System SHALL use Vitest as the testing framework
10. WHEN tests are run, THE System SHALL use Mock Service Worker (MSW) for API mocking
11. WHEN tests are run, THE System SHALL use `@testing-library/react` for component testing
12. WHEN test coverage is measured, THE System SHALL target 80%+ coverage for core functionalities

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Transaction Amount Validation

_For any_ transaction creation attempt, if the amount is zero or negative, the transaction SHALL be rejected and the transaction list SHALL remain unchanged.

**Validates: Requirement 3.4**

### Property 2: Category Requirement for Transactions

_For any_ transaction creation attempt, if no categories are selected, the transaction SHALL be rejected and the transaction list SHALL remain unchanged.

**Validates: Requirement 3.5**

### Property 3: Bank Balance Calculation

_For any_ bank account, the displayed balance SHALL equal the sum of all transactions associated with that bank.

**Validates: Requirement 2.6**

### Property 4: Category Spending Calculation

_For any_ category in the current month, the displayed spending SHALL equal the sum of all transaction amounts tagged with that category in the current month.

**Validates: Requirement 5.2**

### Property 5: Budget Remaining Calculation

_For any_ category with a monthly budget, the displayed budget remaining SHALL equal (monthly_budget - current_spending), and SHALL never be negative (displayed as 0 if overspent).

**Validates: Requirement 5.3**

### Property 6: User Data Isolation

_For any_ two different users, when user A queries their banks/transactions/categories, the results SHALL NOT include any data belonging to user B.

**Validates: Requirement 12.1**

### Property 7: Planned Transaction Recurrence

_For any_ planned transaction with a recurrence rule, the next occurrence date SHALL be calculated correctly based on the frequency and interval, and SHALL always be after the previous occurrence date.

**Validates: Requirement 6.2, 6.8**

### Property 8: Timezone-Aware Budget Periods

_For any_ user with a specified timezone, when calculating monthly spending, the month boundaries SHALL respect the user's local timezone (not UTC).

**Validates: Requirement 5.7**

### Property 9: Timezone-Aware Planned Transactions

_For any_ planned transaction with a specified timezone, the transaction SHALL be triggered at the correct local time in that timezone, regardless of the server's timezone.

**Validates: Requirement 6.4**

### Property 10: Privacy Mode Consistency

_For any_ UI component displaying monetary amounts, when privacy mode is enabled, the component SHALL display placeholder values instead of actual amounts; when privacy mode is disabled, the component SHALL display actual amounts.

**Validates: Requirement 9.1, 9.2**

### Property 11: Responsive Layout Adaptation

_For any_ viewport size, the layout SHALL adapt correctly: mobile (< 768px) displays bottom nav, tablet (768-1024px) displays collapsible sidebar, desktop (> 1024px) displays fixed sidebar.

**Validates: Requirement 10.1, 10.2, 10.3, 10.4**

### Property 12: Touch Target Size

_For any_ interactive element on mobile devices, the element SHALL have a minimum size of 44px × 44px to ensure touch-friendliness.

**Validates: Requirement 10.6**

### Property 13: Horizontal Scroll Prevention

_For any_ viewport size, content SHALL be readable without requiring horizontal scrolling.

**Validates: Requirement 10.7**

### Property 14: React Query Server State

_For any_ server data (banks, transactions, categories, tokens), the data SHALL be fetched and cached via React Query, not stored in component local state.

**Validates: Requirement 12.1**

### Property 15: React Hook Form Usage

_For any_ form in the application, form input state and validation SHALL be managed by React Hook Form, not useState.

**Validates: Requirement 12.2**

### Property 16: Zustand UI State Only

_For any_ Zustand store, the store SHALL contain ONLY UI state (privacy mode, theme, modals, sidebar), never server data or form input state.

**Validates: Requirement 12.3**

### Property 17: Optimistic Update Rollback

_For any_ failed mutation, the optimistic update to the cache SHALL be rolled back, and the UI SHALL display the previous state.

**Validates: Requirement 14.4**

### Property 18: Transfer Balance Preservation

_For any_ transfer between two banks, the total portfolio balance before and after the transfer SHALL remain the same (accounting for exchange rates if applicable).

**Validates: Requirement 3.12**

### Property 19: Crypto Portfolio Calculation

_For any_ cryptocurrency portfolio, the total portfolio value SHALL equal the sum of (token_quantity × current_price) for all tokens.

**Validates: Requirement 7.3**

### Property 20: Offline Transaction Queueing

_For any_ transaction created while offline, the transaction SHALL be queued and automatically synced when the user goes online.

**Validates: Requirement 11.2**

### Property 21: Cache Invalidation on Mutation

_For any_ successful mutation (create, update, delete), the relevant React Query cache SHALL be invalidated and refetched to ensure consistency.

**Validates: Requirement 14.5**

### Property 22: Form Validation Error Display

_For any_ form submission with validation errors, error messages SHALL be displayed for each invalid field, and the form SHALL NOT be submitted.

**Validates: Requirement 13.4**

### Property 23: Authentication Token Persistence

_For any_ authenticated user who closes and reopens the browser, if a valid token exists in storage, the user's session SHALL be restored without requiring re-authentication.

**Validates: Requirement 1.6**

### Property 24: Category Deletion Cascade

_For any_ category that is deleted, the category SHALL be removed from all associated transactions, and the transactions SHALL remain valid.

**Validates: Requirement 4.6**

### Property 25: Bank Deletion Cascade

_For any_ bank that is deleted, all transactions associated with the bank SHALL also be deleted.

**Validates: Requirement 2.5**

### Property 26: pnpm Lock File Consistency

_For any_ developer who clones the repository and runs `pnpm install --frozen-lockfile`, the installed dependencies SHALL be identical to those in `pnpm-lock.yaml`.

**Validates: Requirement 26.9**

### Property 27: Gitignore Effectiveness

_For any_ file matching a gitignore pattern, the file SHALL NOT be tracked by git and SHALL NOT appear in `git status`.

**Validates: Requirement 27.1 through 27.9**

### Property 28: Vitest Integration Test Coverage

_For any_ core functionality (authentication, transactions, budgets, planned transactions), there SHALL exist at least one integration test that verifies the complete workflow.

**Validates: Requirement 28.1 through 28.8**

### Property 29: Mock Service Worker Interception

_For any_ HTTP request made during a Vitest test, if a matching MSW handler exists, the request SHALL be intercepted and the mock response SHALL be returned instead of making a real network request.

**Validates: Requirement 28.10**

### Property 30: Test Coverage Threshold

_For any_ core functionality module (authentication, transactions, calculations, forms), the test coverage SHALL be at least 80%.

**Validates: Requirement 28.12**

---

## Non-Functional Requirements

### Performance Requirements

- Initial page load SHALL complete within 3 seconds on 4G networks
- Transaction list with 100+ items SHALL render without noticeable lag
- Crypto price updates SHALL NOT cause full page re-renders
- Form submission SHALL show optimistic updates immediately
- Transaction filtering SHALL use debouncing (300ms) to prevent excessive re-renders

### Scalability Requirements

- System SHALL support users with 10,000+ transactions
- System SHALL support users with 100+ categories
- System SHALL support users with 50+ cryptocurrency tokens
- System SHALL handle concurrent updates from multiple devices

### Reliability Requirements

- System uptime SHALL be 99.9% or higher
- Failed mutations SHALL be retried automatically with exponential backoff
- Offline transactions SHALL be queued and synced when online
- Data corruption SHALL be detected and prevented

### Maintainability Requirements

- Code SHALL follow TypeScript best practices
- Components SHALL be modular and reusable
- State management SHALL follow the specified architecture
- Tests SHALL cover critical user flows and edge cases
- All package management SHALL use pnpm
- Repository structure SHALL follow the defined directory layout

### Usability Requirements

- All interactive elements SHALL be keyboard accessible
- All interactive elements SHALL have appropriate ARIA labels
- Color contrast SHALL meet WCAG AA standards
- Forms SHALL provide clear error messages

---

## Implementation Notes

### State Management Architecture

The application enforces a strict separation of concerns for state management:

1. **React Query**: Manages ALL server state (banks, transactions, categories, tokens, planned transactions)
   - Automatic caching with 5-minute stale time
   - Optimistic updates for mutations
   - Automatic refetching on stale
   - Background synchronization

2. **React Hook Form**: Manages ALL form input state and validation
   - Zod schema validation
   - Real-time field validation
   - Error message display
   - Form reset on successful submission

3. **Zustand**: Manages ONLY UI state
   - Privacy mode toggle
   - Theme preference
   - Sidebar open/closed state
   - Modal visibility states
   - Authentication token (session only, not server data)

### Component Patterns

All components MUST follow these patterns:

- **Data Display**: Use React Query hooks, never useState for server data
- **Forms**: Use React Hook Form with Zod validation
- **UI State**: Use Zustand stores for privacy mode, theme, modals
- **Async Operations**: Use React Query mutations, never manual fetch calls
- **Effects**: Minimize useEffect usage, prefer declarative patterns

### Data Fetching

- All server data fetched via React Query
- Cache stale time: 5 minutes for banks/transactions, 2 minutes for categories
- Optimistic updates for all mutations
- Automatic refetch on window focus
- Offline support via service worker caching

### Form Handling

- All forms use React Hook Form with Zod validation
- Validation schemas defined in separate files
- Error messages displayed inline
- Submit button disabled during submission
- Form reset on successful submission

### Package Management with pnpm

- All dependencies managed via pnpm
- Lock file (`pnpm-lock.yaml`) committed to version control
- Workspace configuration via `pnpm-workspace.yaml`
- Scripts run via `pnpm run` or `pnpm` shorthand
- Installation via `pnpm install --frozen-lockfile` for consistency

### Testing with Vitest

- Core integration tests for critical functionalities
- Mock Service Worker (MSW) for API mocking
- @testing-library/react for component testing
- 80%+ coverage target for core modules
- Tests run via `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`

### Repository Structure

- Root `.gitignore` for global patterns
- Directory-specific `.gitignore` files for granular control
- `.env.example` in version control, `.env.local` gitignored
- Clean separation of concerns: app, components, lib, test, public
- Organized test structure with mocks, fixtures, and integration tests

### Requirement 29: shadcn/ui Component Library

**User Story:** As a developer, I want to use shadcn/ui as the base for UI components, so that I have pre-built, accessible, and customizable components.

#### Acceptance Criteria

1. WHEN building UI components, THE System SHALL use shadcn/ui as the base component library
2. WHEN shadcn/ui components are used, THE System SHALL customize them via Tailwind CSS classes
3. WHEN domain-specific components are needed, THE System SHALL create custom wrappers around shadcn/ui components
4. WHEN components are created, THE System SHALL use the shadcn/ui CLI for component generation
5. WHEN components are styled, THE System SHALL maintain consistency with the design system
6. WHEN components are used, THE System SHALL ensure accessibility standards are met
7. WHEN custom components are created, THE System SHALL document the wrapper's purpose and usage

### Property 31: Mock Service Worker Interception

_For any_ HTTP request made during a Vitest test, if a matching `vi.mock()` handler exists, the request SHALL be intercepted and the mock response SHALL be returned instead of making a real network request.

**Validates: Requirement 28.10**

### Property 32: shadcn/ui Component Accessibility

_For any_ shadcn/ui component used in the application, the component SHALL maintain accessibility standards including proper ARIA labels, keyboard navigation, and semantic HTML.

**Validates: Requirement 29.6**

### Property 33: Custom Component Wrapper Consistency

_For any_ custom component wrapper around shadcn/ui, the wrapper SHALL maintain the same accessibility and functionality as the base component while adding domain-specific behavior.

**Validates: Requirement 29.3, 29.7**

### Property 34: PWA Installation on iOS

_For any_ user on iOS who accesses the application and uses the "Add to Home Screen" feature, the application SHALL create a home screen icon and launch in fullscreen mode without browser UI.

**Validates: Requirement 20.1, 20.2**

### Property 35: PWA Installation on Android

_For any_ user on Android who sees the install prompt and accepts installation, the application SHALL create a home screen icon and launch in fullscreen mode without browser UI.

**Validates: Requirement 20.3, 20.4**

### Property 36: PWA Offline Support

_For any_ user with the PWA installed who goes offline, the application SHALL serve cached content via service worker and display previously loaded data.

**Validates: Requirement 20.6**

### Property 37: PWA Manifest Configuration

_For any_ PWA installation, the manifest.json configuration SHALL be correctly applied, including app name, icons, theme color, and display mode.

**Validates: Requirement 20.8, 20.9, 20.10**
