import type {
  User,
  Bank,
  Category,
  Transaction,
  PlannedTransaction,
  Token,
  Currency,
  RecurrenceRule,
} from "@/lib/types";

// Simple incrementing counter for unique IDs
let idCounter = 0;
function uniqueId(prefix: string): string {
  return `${prefix}_${++idCounter}`;
}

/** Reset the ID counter (useful between tests) */
export function resetFactoryIds(): void {
  idCounter = 0;
}

// ── Default Currency ─────────────────────────────────────────────────────────

const defaultCurrency: Currency = {
  code: "USD",
  name: "US Dollar",
  symbol: "$",
};

// ── Factories ────────────────────────────────────────────────────────────────

export function createMockUser(overrides?: Partial<User>): User {
  const id = uniqueId("user");
  return {
    id,
    email: `${id}@test.com`,
    username: `user_${id}`,
    currency: defaultCurrency,
    emailVisibility: false,
    verified: true,
    created: new Date("2024-01-01T00:00:00Z"),
    updated: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

export function createMockBank(overrides?: Partial<Bank>): Bank {
  const id = uniqueId("bank");
  return {
    id,
    user: "user_1",
    name: `Bank ${id}`,
    balance: 1000,
    primaryColor: "#3b82f6",
    secondaryColor: "#eff6ff",
    created: new Date("2024-01-01T00:00:00Z"),
    updated: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

export function createMockCategory(overrides?: Partial<Category>): Category {
  const id = uniqueId("cat");
  return {
    id,
    user: "user_1",
    name: `Category ${id}`,
    hideable: false,
    total_exempt: false,
    monthly_budget: 500,
    created: new Date("2024-01-01T00:00:00Z"),
    updated: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

export function createMockTransaction(overrides?: Partial<Transaction>): Transaction {
  const id = uniqueId("txn");
  return {
    id,
    user: "user_1",
    description: `Transaction ${id}`,
    type: "expense",
    amount: 50,
    bank: "bank_1",
    categories: ["cat_1"],
    date: "2024-06-15",
    created: new Date("2024-01-01T00:00:00Z"),
    updated: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

export function createMockPlannedTransaction(
  overrides?: Partial<PlannedTransaction>,
): PlannedTransaction {
  const id = uniqueId("planned");
  const defaultRecurrence: RecurrenceRule = { frequency: "monthly", interval: 1 };
  return {
    id,
    user: "user_1",
    description: `Planned ${id}`,
    type: "expense",
    amount: 100,
    bank: "bank_1",
    categories: ["cat_1"],
    recurrence: defaultRecurrence,
    timezone: 0,
    previousDate: null,
    invokeDate: new Date("2024-07-01T00:00:00Z"),
    active: true,
    created: new Date("2024-01-01T00:00:00Z"),
    updated: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

export function createMockToken(overrides?: Partial<Token>): Token {
  const id = uniqueId("token");
  return {
    id,
    user: "user_1",
    name: "Bitcoin",
    symbol: "BTC",
    coingecko_id: "bitcoin",
    total: 0.5,
    costAvg: 30000,
    created: new Date("2024-01-01T00:00:00Z"),
    updated: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}
