# Product: Funds

Funds is a personal finance tracker PWA. Users manage bank accounts, record income/expense transactions, track crypto token holdings, set up planned (recurring) transactions with push-notification reminders, and view dashboard summaries of their financial position.

## Core domains

- **Banks** – CRUD bank accounts, each with a balance and color branding.
- **Transactions** – Income, expense, deposit, withdrawal records tied to a bank and one-or-more categories. Supports filtering, search, and date ranges.
- **Categories** – User-defined labels with optional monthly budgets and hide/exempt flags.
- **Planned Transactions** – Recurring transactions with configurable frequency (daily/weekly/monthly/yearly). A cron API route sends push-notification reminders.
- **Crypto Tokens** – Track holdings, cost average, and live prices via CoinGecko IDs.
- **Transfers** – Move funds between banks with independent origin/destination amounts (supports currency conversion).
- **Dashboard** – Aggregated views: asset summary, bank summary, budget summary, upcoming planned transactions, crypto dashboard.

## Key characteristics

- Dark-mode-first UI.
- PWA with offline support (service worker, offline queue, install prompt).
- Privacy mode toggle to hide sensitive balances.
- Session timeout and protected routes for security.
- Keyboard shortcuts for power users.
- Responsive layout with mobile-first considerations.
