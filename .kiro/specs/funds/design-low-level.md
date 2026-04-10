# Low-Level Design Document: Funds - Component & Implementation Details

## Overview

This document provides detailed implementation specifications for the Funds application, covering component composition patterns, state management architecture, data fetching strategies, form handling, and responsive design implementation. It serves as a technical blueprint for developers implementing the system.

## Component Structure & Composition Patterns

### Component Design Philosophy

**All components MUST follow these principles**:

1. **Minimize Local State**: Use React Query, React Hook Form, or Zustand instead
2. **No Data Duplication**: Never copy server data into useState
3. **Leverage Specialized Tools**: Each tool has a specific purpose
4. **Functional & Declarative**: Components should be pure functions when possible

### Component Pattern: Data Display

**Example: TransactionsList Component**

```typescript
// ✅ CORRECT: Use React Query for server state
export function TransactionsList() {
  const { data: transactions, isLoading, error } = useTransactions();

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="space-y-2">
      {transactions?.map((tx) => (
        <TransactionCard key={tx.id} transaction={tx} />
      ))}
    </div>
  );
}

// ❌ WRONG: Don't duplicate server data in useState
export function TransactionsListWrong() {
  const { data: transactions } = useTransactions();
  const [localTransactions, setLocalTransactions] = useState([]);

  useEffect(() => {
    setLocalTransactions(transactions || []);
  }, [transactions]);

  return (
    <div>
      {localTransactions.map((tx) => (
        <TransactionCard key={tx.id} transaction={tx} />
      ))}
    </div>
  );
}
```

### Component Pattern: Forms

**Example: TransactionForm Component**

```typescript
// ✅ CORRECT: Use React Hook Form for form state
export function TransactionForm() {
  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
  });

  const createMutation = useCreateTransaction();

  const onSubmit = async (data: TransactionFormData) => {
    await createMutation.mutateAsync(data);
    form.reset();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('description')} />
      {form.formState.errors.description && (
        <span>{form.formState.errors.description.message}</span>
      )}
      <button type="submit" disabled={form.formState.isSubmitting}>
        Submit
      </button>
    </form>
  );
}

// ❌ WRONG: Don't use useState for form fields
export function TransactionFormWrong() {
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Manual validation, error handling, etc.
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {errors.description && <span>{errors.description}</span>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Component Pattern: UI State

**Example: PrivacyToggle Component**

```typescript
// ✅ CORRECT: Use Zustand for UI state
export function PrivacyToggle() {
  const { privacyMode, togglePrivacyMode } = useUIStore();

  return (
    <button onClick={togglePrivacyMode}>
      {privacyMode ? 'Privacy On' : 'Privacy Off'}
    </button>
  );
}

// ❌ WRONG: Don't use useState for persistent UI state
export function PrivacyToggleWrong() {
  const [privacyMode, setPrivacyMode] = useState(false);

  const handleToggle = () => {
    setPrivacyMode(!privacyMode);
    // Manually persist to localStorage
    localStorage.setItem('privacyMode', JSON.stringify(!privacyMode));
  };

  return (
    <button onClick={handleToggle}>
      {privacyMode ? 'Privacy On' : 'Privacy Off'}
    </button>
  );
}
```

### Component Pattern: Async Operations

**Example: BankForm Component**

```typescript
// ✅ CORRECT: Use React Query mutations for async operations
export function BankForm({ initialData }: { initialData?: Bank }) {
  const form = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: initialData,
  });

  const createMutation = useCreateBank();
  const updateMutation = useUpdateBank();

  const onSubmit = async (data: BankFormData) => {
    if (initialData?.id) {
      await updateMutation.mutateAsync({ id: initialData.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    form.reset();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('name')} />
      <button
        type="submit"
        disabled={form.formState.isSubmitting || createMutation.isPending}
      >
        {initialData ? 'Update' : 'Create'}
      </button>
    </form>
  );
}

// ❌ WRONG: Don't manage loading/error states manually
export function BankFormWrong({ initialData }: { initialData?: Bank }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialData?.name || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Manual API call
      await api.createBank({ name });
      setName('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      {error && <span>{error}</span>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Create'}
      </button>
    </form>
  );
}
```

## Layout Components

#### Root Layout (`src/app/layout.tsx`)

**Responsibilities**:

- Initialize global providers (Auth, Query, Tokens)
- Set up viewport and metadata
- Configure font loading

**Key Props**: `children: React.ReactNode`

**State Management**:

- Query client configuration
- Provider initialization

```typescript
interface RootLayoutProps {
  children: React.ReactNode;
}

// Preconditions:
// - All providers are properly configured
// - Query client has default options set
// Postconditions:
// - All child components have access to providers
// - Global styles are applied
```

#### Dashboard Layout (`src/app/dashboard/layout.tsx`)

**Responsibilities**:

- Render responsive navigation (desktop sidebar, mobile header/footer)
- Manage layout structure for all dashboard pages
- Handle responsive breakpoint transitions

**Key Components**:

- Desktop Sidebar (md:block, hidden on mobile)
- Mobile Header (md:hidden, fixed top)
- Mobile Footer (md:hidden, fixed bottom)
- Main content area

**Responsive Behavior**:

- Mobile: Header (60px) + Content + Footer (60px)
- Tablet+: Sidebar (176px/240px) + Content

```typescript
interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Preconditions:
// - User is authenticated
// - Responsive utilities are available
// Postconditions:
// - Navigation is visible and functional
// - Content area is properly sized
// - Layout adapts to viewport changes
```

### Page Components

#### Dashboard Page (`src/app/dashboard/page.tsx`)

**Responsibilities**:

- Display financial overview and summary
- Show upcoming planned transactions
- Render asset summary and trends

**Key Sections**:

- Asset Summary (total balance, net worth)
- Bank Summary (account balances)
- Budget Summary (spending vs limits)
- Upcoming Planned Transactions
- Monthly Trends Chart

**Data Dependencies**:

- Banks (for balances)
- Transactions (for calculations)
- Categories (for budgets)
- Planned Transactions (for upcoming)
- Tokens (for crypto holdings)

```typescript
// Preconditions:
// - User is authenticated
// - All required data is fetched
// Postconditions:
// - Dashboard displays current financial state
// - All summaries are up-to-date
// - Charts render correctly
```

#### Banks Page (`src/app/dashboard/banks/page.tsx`)

**Responsibilities**:

- Display list of bank accounts
- Show transactions for selected bank
- Provide transaction management UI

**Key Sections**:

- Bank selector/carousel
- Transaction list/table
- Transaction form (create/edit)
- Transaction filters

**Data Dependencies**:

- Banks
- Transactions
- Categories

```typescript
// Preconditions:
// - User has at least one bank account
// - Transaction data is loaded
// Postconditions:
// - Bank accounts are displayed
// - Transactions are filterable and sortable
// - User can create/edit/delete transactions
```

#### Crypto Page (`src/app/dashboard/crypto/page.tsx`)

**Responsibilities**:

- Display cryptocurrency holdings
- Show token prices and valuations
- Provide token management UI

**Key Sections**:

- Token list with holdings
- Portfolio value summary
- Price charts
- Add/remove token forms

**Data Dependencies**:

- Tokens
- Crypto prices (from CoinGecko)

```typescript
// Preconditions:
// - Crypto data provider is initialized
// - Token data is fetched
// Postconditions:
// - Tokens are displayed with current prices
// - Portfolio value is calculated
// - User can manage token holdings
```

### Dashboard Components

#### AssetSummary Component

**Purpose**: Display total assets across all accounts and crypto

**Props**:

```typescript
interface AssetSummaryProps {
  banks: Bank[];
  tokens: Token[];
  cryptoPrices: Record<string, number>;
  privacyMode?: boolean;
}
```

**Calculations**:

- Bank total = sum of all bank balances
- Crypto total = sum of (token quantity × current price)
- Total assets = bank total + crypto total

**Rendering**:

- Large display of total assets
- Breakdown by category (banks, crypto)
- Percentage change indicator
- Privacy mode hides exact values

```typescript
// Preconditions:
// - banks array is valid and non-empty
// - cryptoPrices contains all required tokens
// Postconditions:
// - Total assets displayed correctly
// - Breakdown is accurate
// - Privacy mode respected
```

#### BankSummary Component

**Purpose**: Display summary of all bank accounts

**Props**:

```typescript
interface BankSummaryProps {
  banks: Bank[];
  transactions: Transaction[];
  privacyMode?: boolean;
}
```

**Features**:

- Card carousel for each bank
- Balance display with color coding
- Recent transactions preview
- Quick action buttons (add transaction, transfer)

**Responsive Behavior**:

- Mobile: Single card visible, swipe to navigate
- Tablet: 2 cards visible
- Desktop: 3+ cards visible

```typescript
// Preconditions:
// - banks array is valid
// - transactions are loaded
// Postconditions:
// - All banks displayed in carousel
// - Recent transactions shown
// - Colors applied correctly
```

#### BudgetsSummary Component

**Purpose**: Display budget tracking and spending

**Props**:

```typescript
interface BudgetsSummaryProps {
  categories: Category[];
  transactions: Transaction[];
  currentMonth: Date;
  privacyMode?: boolean;
}
```

**Calculations**:

- Monthly spending per category = sum of transactions in month
- Budget remaining = monthly_budget - spending
- Percentage used = spending / monthly_budget

**Rendering**:

- Progress bars for each category
- Color coding (green < 50%, yellow 50-80%, red > 80%)
- Spending vs budget display

```typescript
// Preconditions:
// - categories have monthly_budget set
// - transactions are filtered to current month
// Postconditions:
// - Budget progress displayed accurately
// - Color coding applied correctly
// - Overspending highlighted
```

#### CryptoDashboard Component

**Purpose**: Display cryptocurrency holdings and portfolio

**Props**:

```typescript
interface CryptoDashboardProps {
  tokens: Token[];
  cryptoPrices: Record<string, number>;
  privacyMode?: boolean;
}
```

**Features**:

- Token list with holdings and values
- Portfolio composition chart
- Price change indicators
- Add/remove token forms

**Calculations**:

- Token value = quantity × current price
- Portfolio total = sum of all token values
- Percentage change = (current price - cost avg) / cost avg

```typescript
// Preconditions:
// - tokens array is valid
// - cryptoPrices contains all token prices
// Postconditions:
// - Portfolio value calculated correctly
// - Price changes displayed
// - User can manage tokens
```

### Bank Components

#### BankForm Component

**Purpose**: Create or edit bank account

**Props**:

```typescript
interface BankFormProps {
  initialData?: Bank;
  onSubmit: (data: BankFormData) => Promise<void>;
  isLoading?: boolean;
}
```

**Form Fields**:

- Name (text input, required)
- Primary Color (color picker)
- Secondary Color (color picker)

**Validation**:

- Name: min 1 char, max 50 chars
- Colors: valid hex format

**Submission**:

- POST /api/collections/banks/records (create)
- PATCH /api/collections/banks/records/{id} (update)

```typescript
// Preconditions:
// - Form data is valid
// - User is authenticated
// Postconditions:
// - Bank created or updated
// - Form cleared on success
// - Error message shown on failure
```

#### TransactionForm Component

**Purpose**: Create or edit transaction

**Props**:

```typescript
interface TransactionFormProps {
  initialData?: Transaction;
  banks: Bank[];
  categories: Category[];
  onSubmit: (data: TransactionFormData) => Promise<void>;
  isLoading?: boolean;
}
```

**Form Fields**:

- Description (text input, required)
- Type (select: income/expense/deposit/withdrawal)
- Amount (number input, required, positive)
- Bank (select, required)
- Categories (multi-select, required)
- Date (date picker, required)

**Validation Schema**:

```typescript
const transactionSchema = z.object({
  description: z.string().min(1).max(200),
  type: z.enum(["income", "expense", "deposit", "withdrawal"]),
  amount: z.number().positive(),
  bank: z.string().min(1),
  categories: z.array(z.string()).min(1),
  date: z.date(),
});
```

**Submission**:

- POST /api/collections/transactions/records (create)
- PATCH /api/collections/transactions/records/{id} (update)

```typescript
// Preconditions:
// - Form data passes validation
// - Bank and categories exist
// - User is authenticated
// Postconditions:
// - Transaction created or updated
// - Form cleared on success
// - Optimistic update applied
// - Error rolled back on failure
```

#### TransactionCard Component

**Purpose**: Display single transaction in card format

**Props**:

```typescript
interface TransactionCardProps {
  transaction: ExpandedTransaction;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  privacyMode?: boolean;
}
```

**Display**:

- Description
- Amount (with type icon)
- Categories (as tags)
- Date
- Bank (with color indicator)

**Actions**:

- Edit button
- Delete button
- Category click to filter

**Responsive**:

- Mobile: Full width, stacked layout
- Desktop: Compact layout

```typescript
// Preconditions:
// - transaction is valid and expanded
// Postconditions:
// - Transaction displayed correctly
// - Actions functional
// - Privacy mode respected
```

#### TransactionsTable Component

**Purpose**: Display transactions in table format (desktop)

**Props**:

```typescript
interface TransactionsTableProps {
  transactions: ExpandedTransaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  privacyMode?: boolean;
  isLoading?: boolean;
}
```

**Columns**:

- Date
- Description
- Type (with icon)
- Amount
- Categories
- Bank
- Actions (edit, delete)

**Features**:

- Sortable columns
- Pagination
- Row selection
- Bulk actions

```typescript
// Preconditions:
// - transactions array is valid
// - viewport is desktop (md+)
// Postconditions:
// - Table renders correctly
// - Sorting works
// - Pagination functional
```

#### TransactionFilter Component

**Purpose**: Filter and search transactions

**Props**:

```typescript
interface TransactionFilterProps {
  onFilterChange: (filters: TransactionFilters) => void;
  banks: Bank[];
  categories: Category[];
}

interface TransactionFilters {
  bank?: string;
  categories?: string[];
  type?: Type;
  dateRange?: { start: Date; end: Date };
  searchText?: string;
}
```

**Filter Options**:

- Bank (select)
- Categories (multi-select)
- Type (select)
- Date range (date picker)
- Search text (text input)

**Behavior**:

- Debounced search (300ms)
- Immediate filter updates
- Clear all button

```typescript
// Preconditions:
// - Filter options are valid
// Postconditions:
// - Filters applied to transaction list
// - URL updated with filter params
// - Results updated in real-time
```

### Form Handling Patterns

#### React Hook Form Integration

All forms follow this pattern:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  field1: z.string().min(1),
  field2: z.number().positive(),
});

type FormData = z.infer<typeof schema>;

export function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      field1: '',
      field2: 0,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.submit(data);
      toast.success('Success');
      form.reset();
    } catch (error) {
      toast.error('Error');
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('field1')} />
      {form.formState.errors.field1 && (
        <span>{form.formState.errors.field1.message}</span>
      )}
      <button type="submit" disabled={form.formState.isSubmitting}>
        Submit
      </button>
    </form>
  );
}
```

**Preconditions**:

- Schema is valid and matches form data
- Resolver is properly configured

**Postconditions**:

- Form validates on submit
- Errors displayed to user
- Submission handled correctly

## State Management Architecture

### State Management Philosophy

**Critical Principle**: Components must minimize usage of local state and effects. The architecture enforces a strict separation of concerns:

1. **TanStack Query (React Query)**: Manages ALL server state (data from PocketBase)
   - Banks, transactions, categories, tokens, planned transactions
   - Automatic caching, invalidation, and refetching
   - Optimistic updates for mutations
   - Loading and error states built-in
   - **Components MUST NOT duplicate this data in local state**

2. **React Hook Form**: Manages ALL form input state
   - Transaction forms, bank forms, category forms
   - Validation, error handling, submission
   - **Components MUST NOT use useState for form fields**

3. **Zustand Stores**: ONLY for UI state that doesn't fit above categories
   - Privacy mode toggle
   - Theme preference
   - Sidebar open/closed state
   - Modal visibility states
   - Authentication token and user session (non-server data)
   - **Zustand MUST NOT be used for server data or form inputs**

### Zustand Stores

#### useAuthStore

**Purpose**: Manage authentication state (token, user session) - NOT server data

```typescript
interface AuthState {
  // Session management only - NOT server data
  token: string | null;
  isAuthenticated: boolean;

  setToken: (token: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,

  setToken: (token) =>
    set({
      token,
      isAuthenticated: !!token,
    }),
  clearAuth: () => set({ token: null, isAuthenticated: false }),
}));
```

**Important**: User data (email, username, currency) is fetched via React Query, NOT stored in Zustand.

**Preconditions**:

- Store is initialized before use
- Token is persisted to localStorage

**Postconditions**:

- Token available for API calls
- Authentication state accessible to all components

#### useUIStore

**Purpose**: Manage UI state that doesn't belong to server state or forms

```typescript
interface UIState {
  privacyMode: boolean;
  theme: "dark" | "light";
  sidebarOpen: boolean;
  modals: Record<string, boolean>;

  togglePrivacyMode: () => void;
  setTheme: (theme: "dark" | "light") => void;
  toggleSidebar: () => void;
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  privacyMode: false,
  theme: "dark",
  sidebarOpen: true,
  modals: {},

  togglePrivacyMode: () =>
    set((state) => ({
      privacyMode: !state.privacyMode,
    })),
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    })),
  openModal: (id) =>
    set((state) => ({
      modals: { ...state.modals, [id]: true },
    })),
  closeModal: (id) =>
    set((state) => ({
      modals: { ...state.modals, [id]: false },
    })),
}));
```

**Preconditions**:

- UI preferences are loaded from localStorage
- Store is initialized

**Postconditions**:

- UI state persisted
- Preferences applied to UI

### What NOT to Store in Zustand

❌ **DO NOT use Zustand for**:

- Banks, transactions, categories, tokens (use React Query)
- Form field values (use React Hook Form)
- Loading/error states for API calls (use React Query)
- Paginated data (use React Query)
- Real-time data updates (use React Query subscriptions)

### React Context

#### AuthContext

```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const user = await pb.collection('users').authRefresh();
        setUser(user.record);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const authData = await pb.collection('users').authWithPassword(email, password);
    setUser(authData.record);
  };

  const logout = async () => {
    pb.authStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Preconditions**:

- PocketBase client is initialized
- Provider wraps entire app

**Postconditions**:

- User authentication state available
- Auth methods accessible to all components

## Data Fetching & Caching

### React Query Hooks

#### useBanks Hook

```typescript
export function useBanks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.banks.list(),
    queryFn: async () => {
      const records = await pb.collection("banks").getFullList({
        filter: `user = "${user?.id}"`,
        sort: "-created",
      });
      return records as Bank[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
```

**Preconditions**:

- User is authenticated
- PocketBase client is initialized

**Postconditions**:

- Banks fetched from API
- Data cached for 5 minutes
- Automatic refetch on stale

#### useTransactions Hook

```typescript
interface UseTransactionsOptions {
  bankId?: string;
  filters?: TransactionFilters;
  limit?: number;
  offset?: number;
}

export function useTransactions(options?: UseTransactionsOptions) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.transactions.list(options?.filters),
    queryFn: async () => {
      let filter = `user = "${user?.id}"`;

      if (options?.bankId) {
        filter += ` && bank = "${options.bankId}"`;
      }

      if (options?.filters?.dateRange) {
        const { start, end } = options.filters.dateRange;
        filter += ` && date >= "${start.toISOString()}" && date <= "${end.toISOString()}"`;
      }

      const records = await pb.collection("transactions").getFullList({
        filter,
        sort: "-date",
        expand: "bank,categories",
      });

      return records as ExpandedTransaction[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}
```

**Preconditions**:

- User is authenticated
- Filter options are valid

**Postconditions**:

- Transactions fetched with filters applied
- Related data expanded
- Sorted by date descending

#### useCreateTransaction Hook

```typescript
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: TransactionFormData) => {
      return await pb.collection("transactions").create({
        ...data,
        user: user?.id,
      });
    },
    onMutate: async (newTransaction) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions.list() });

      // Snapshot previous data
      const previousTransactions = queryClient.getQueryData(queryKeys.transactions.list());

      // Optimistically update cache
      queryClient.setQueryData(queryKeys.transactions.list(), (old: Transaction[]) => [
        ...old,
        { ...newTransaction, id: "temp-id" } as Transaction,
      ]);

      return { previousTransactions };
    },
    onError: (err, newTransaction, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKeys.transactions.list(), context?.previousTransactions);
    },
    onSuccess: () => {
      // Refetch to get server-generated ID
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.list() });
    },
  });
}
```

**Preconditions**:

- User is authenticated
- Transaction data is valid

**Postconditions**:

- Transaction created on server
- Optimistic update applied
- Cache invalidated on success

## Responsive Design Implementation

### useResponsive Hook

```typescript
export function useResponsive() {
  const [breakpoint, setBreakpoint] = useState<"mobile" | "tablet" | "desktop">("mobile");

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setBreakpoint("mobile");
      } else if (window.innerWidth < 1024) {
        setBreakpoint("tablet");
      } else {
        setBreakpoint("desktop");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isMobile: breakpoint === "mobile",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop",
    breakpoint,
  };
}
```

**Preconditions**:

- Hook is called in component

**Postconditions**:

- Breakpoint state updated on resize
- Component re-renders on breakpoint change

### Responsive Component Example

```typescript
export function TransactionsList() {
  const { isMobile, isTablet } = useResponsive();
  const { data: transactions } = useTransactions();

  if (isMobile) {
    return (
      <div className="space-y-2">
        {transactions?.map((tx) => (
          <TransactionCard key={tx.id} transaction={tx} />
        ))}
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {transactions?.map((tx) => (
          <TransactionCard key={tx.id} transaction={tx} />
        ))}
      </div>
    );
  }

  return (
    <TransactionsTable transactions={transactions || []} />
  );
}
```

**Preconditions**:

- useResponsive hook is available
- Transactions are loaded

**Postconditions**:

- Correct layout rendered for breakpoint
- Layout updates on resize

## Utility Functions

### Formatting Utilities

```typescript
// Currency formatting
export function formatCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.code,
  }).format(amount);
}

// Date formatting
export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM dd, yyyy");
}

// Percentage formatting
export function formatPercentage(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
```

**Preconditions**:

- Input values are valid

**Postconditions**:

- Values formatted according to locale/currency

### Calculation Utilities

```typescript
// Calculate total balance
export function calculateTotalBalance(banks: Bank[]): number {
  return banks.reduce((sum, bank) => sum + bank.balance, 0);
}

// Calculate category spending
export function calculateCategorySpending(
  transactions: Transaction[],
  categoryId: string,
  dateRange: { start: Date; end: Date },
): number {
  return transactions
    .filter((tx) => {
      const txDate = new Date(tx.date);
      return (
        tx.categories.includes(categoryId) && txDate >= dateRange.start && txDate <= dateRange.end
      );
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
}

// Calculate budget remaining
export function calculateBudgetRemaining(budget: number, spending: number): number {
  return Math.max(0, budget - spending);
}
```

**Preconditions**:

- Input data is valid and non-null

**Postconditions**:

- Calculations are accurate
- Results are numeric

### Validation Utilities

```typescript
// Validate transaction
export function validateTransaction(data: unknown): data is TransactionFormData {
  return transactionSchema.safeParse(data).success;
}

// Validate amount
export function validateAmount(amount: number): boolean {
  return amount > 0 && Number.isFinite(amount);
}

// Validate date
export function validateDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}
```

**Preconditions**:

- Input data is provided

**Postconditions**:

- Validation result returned
- Type guard applied if successful

## Correctness Properties

### Component Rendering

- **Property**: Component renders without errors when props are valid
- **Property**: Component handles missing optional props gracefully
- **Property**: Component updates when props change
- **Property**: Component cleans up resources on unmount

### State Management

- **Property**: Store state is immutable (no direct mutations)
- **Property**: Store updates trigger component re-renders
- **Property**: Multiple components can subscribe to same store
- **Property**: Store state persists across navigation

### Data Fetching

- **Property**: Query is only executed when enabled
- **Property**: Query result is cached for staleTime duration
- **Property**: Query refetches when invalidated
- **Property**: Mutation optimistic update is rolled back on error

### Form Handling

- **Property**: Form validation runs before submission
- **Property**: Form errors are displayed to user
- **Property**: Form submission is prevented if invalid
- **Property**: Form resets after successful submission

### Responsive Design

- **Property**: Layout adapts to all breakpoints
- **Property**: Content is readable at all sizes
- **Property**: Touch targets are min 44px on mobile
- **Property**: No horizontal scrolling on any breakpoint

### Performance

- **Property**: Component memoization prevents unnecessary re-renders
- **Property**: Debounced functions don't fire excessively
- **Property**: Large lists render efficiently with virtualization
- **Property**: Images are lazy-loaded below fold
