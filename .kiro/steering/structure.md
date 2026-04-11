# Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (providers, fonts, metadata)
│   ├── page.tsx                # Landing / login page
│   ├── api/                    # API routes
│   │   └── cron-planned-reminders/  # Cron endpoint for push reminders
│   └── dashboard/              # Authenticated dashboard pages
│       ├── layout.tsx          # Dashboard shell layout
│       ├── page.tsx            # Main dashboard view
│       ├── banks/page.tsx      # Banks management page
│       └── crypto/page.tsx     # Crypto portfolio page
├── components/
│   ├── ui/                     # shadcn/ui primitives (button, card, dialog, input, etc.)
│   ├── banks/                  # Bank-related components (BankForm, BankSelect)
│   │   └── transactions/       # Transaction components (Card, Filter, Form, Table, Container)
│   ├── dashboard/              # Dashboard widgets (AssetSummary, BankSummary, BudgetsSummary, etc.)
│   └── *.tsx                   # Shared components (CategoryForm, ProtectedRoute, PrivacyToggle, etc.)
├── lib/
│   ├── types.ts                # Central domain type definitions
│   ├── utils.ts                # cn() Tailwind merge helper
│   ├── hooks/                  # React Query hooks + custom hooks
│   │   ├── queryKeys.ts        # Centralized query key factory
│   │   ├── useBanks.ts         # Bank CRUD hooks (query + mutations with optimistic updates)
│   │   ├── useTransactions.ts  # Transaction hooks
│   │   ├── useCategories.ts    # Category hooks
│   │   ├── useTokens.ts        # Crypto token hooks
│   │   ├── usePlannedTransactions.ts
│   │   ├── useAuth.ts          # Auth convenience hook
│   │   └── use*.ts             # PWA, responsive, keyboard shortcuts, session timeout, etc.
│   ├── pocketbase/             # PocketBase client + schema definitions
│   ├── providers/              # React context providers (Auth, Query, Tokens)
│   ├── stores/                 # Zustand stores (useAuthStore, useUIStore)
│   ├── utils/                  # Utility modules (calculations, formatting, crypto, error, recurrence, offline queue)
│   └── validation/             # Zod schemas for form validation (bankSchema, transactionSchema, etc.)
├── styles/
│   └── globals.css             # Tailwind base styles
└── test/
    ├── setup.ts                # Vitest global setup (cleanup, mocks)
    ├── test-utils.tsx           # Custom render with providers
    ├── factories.ts            # Mock data factories (createMockUser, createMockBank, etc.)
    ├── helpers.ts              # Shared test helpers
    └── integration/            # Integration tests
```

## Conventions

- **Co-located tests**: Test files sit next to their source file as `*.test.ts(x)`.
- **Path alias**: `@/*` maps to `./src/*`.
- **"use client" directive**: Required on any component or hook that uses browser APIs, React state, or context.
- **Hook naming**: Custom hooks follow `use{Entity}` pattern and export individual query/mutation hooks (e.g., `useBanks`, `useCreateBank`, `useUpdateBank`, `useDeleteBank`).
- **Validation schemas**: One file per entity in `src/lib/validation/`, named `{entity}Schema.ts`. Each exports a Zod schema and an inferred TypeScript type.
- **Query keys**: Always use the centralized `queryKeys` factory from `src/lib/hooks/queryKeys.ts` — never inline key arrays.
- **Optimistic updates**: Mutations follow the pattern: `onMutate` (cancel + snapshot + optimistic set) → `onError` (rollback) → `onSettled` (invalidate).
- **Type imports**: Use inline `type` keyword (`import { type Foo }`) per ESLint rule `consistent-type-imports`.
