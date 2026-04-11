# Tech Stack & Tooling

## Framework & Runtime

- **Next.js 15** (App Router, RSC enabled) with Turbopack dev server.
- **React 19**, TypeScript 5.8, strict mode (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`).
- **PocketBase** as the backend (BaaS). Client singleton at `src/lib/pocketbase/pocketbase.ts`. Default URL: `http://localhost:8090`, overridden via `NEXT_PUBLIC_POCKETBASE_URL`.

## State & Data Fetching

- **TanStack React Query v5** – server-state cache with 5 min stale / 10 min GC defaults. Centralized query key factory at `src/lib/hooks/queryKeys.ts`. Mutations use optimistic updates with rollback.
- **Zustand v5** – client-side stores (`useAuthStore`, `useUIStore`) with `persist` middleware.
- **React Hook Form + Zod** – form handling with `@hookform/resolvers/zod`. Validation schemas live in `src/lib/validation/`.

## Styling

- **Tailwind CSS v4** via `@tailwindcss/postcss`.
- **shadcn/ui** (base-nova style, Base UI primitives) – components in `src/components/ui/`.
- Utility: `cn()` helper using `clsx` + `tailwind-merge`.
- **Lucide React** for icons.

## Environment Variables

- Validated at build time with `@t3-oss/env-nextjs` + Zod (`src/env.js`).
- Skip validation with `SKIP_ENV_VALIDATION=true`.

## Testing

- **Vitest 4** with jsdom, React Testing Library, `@testing-library/user-event`.
- Setup file: `src/test/setup.ts` (auto-cleanup, mock `matchMedia` / `IntersectionObserver`).
- Custom `render` in `src/test/test-utils.tsx` wraps components with QueryClient + AuthContext.
- Test factories in `src/test/factories.ts` (`createMockUser`, `createMockBank`, etc.).
- Coverage via `@vitest/coverage-v8`.

## Linting & Formatting

- **ESLint 9** flat config: `@eslint/js` + `typescript-eslint` + Prettier integration.
- Key rules: `consistent-type-imports` (prefer `type` keyword, inline style), unused vars warning with `_` prefix ignore.
- **Prettier**: double quotes, semicolons, trailing commas, 100 char print width, LF line endings.
- **Husky + lint-staged**: pre-commit runs ESLint fix + Prettier on staged files.

## Package Manager

- **pnpm 10** (declared via `packageManager` field). Workspace config in `pnpm-workspace.yaml`.

## Common Commands

| Task          | Command              |
| ------------- | -------------------- |
| Dev server    | `pnpm dev`           |
| Build         | `pnpm build`         |
| Type check    | `pnpm typecheck`     |
| Lint          | `pnpm lint`          |
| Lint + fix    | `pnpm lint:fix`      |
| Format        | `pnpm format`        |
| Format check  | `pnpm format:check`  |
| Run tests     | `pnpm test`          |
| Tests (watch) | `pnpm test:watch`    |
| Test coverage | `pnpm test:coverage` |
