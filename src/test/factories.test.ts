import { describe, it, expect, beforeEach } from "vitest";
import {
  createMockUser,
  createMockBank,
  createMockCategory,
  createMockTransaction,
  createMockPlannedTransaction,
  createMockToken,
  resetFactoryIds,
} from "./factories";

describe("Mock Data Factories", () => {
  beforeEach(() => {
    resetFactoryIds();
  });

  it("createMockUser returns a valid user with unique ID", () => {
    const user1 = createMockUser();
    const user2 = createMockUser();
    expect(user1.id).not.toBe(user2.id);
    expect(user1.email).toContain("@test.com");
    expect(user1.currency.code).toBe("USD");
    expect(user1.verified).toBe(true);
  });

  it("createMockUser accepts overrides", () => {
    const user = createMockUser({ email: "custom@example.com", verified: false });
    expect(user.email).toBe("custom@example.com");
    expect(user.verified).toBe(false);
  });

  it("createMockBank returns a valid bank with unique ID", () => {
    const bank1 = createMockBank();
    const bank2 = createMockBank();
    expect(bank1.id).not.toBe(bank2.id);
    expect(bank1.balance).toBe(1000);
    expect(bank1.primaryColor).toBeDefined();
  });

  it("createMockBank accepts overrides", () => {
    const bank = createMockBank({ name: "Savings", balance: 5000 });
    expect(bank.name).toBe("Savings");
    expect(bank.balance).toBe(5000);
  });

  it("createMockCategory returns a valid category", () => {
    const cat = createMockCategory();
    expect(cat.id).toContain("cat_");
    expect(cat.hideable).toBe(false);
    expect(cat.monthly_budget).toBe(500);
  });

  it("createMockTransaction returns a valid transaction", () => {
    const txn = createMockTransaction();
    expect(txn.id).toContain("txn_");
    expect(txn.type).toBe("expense");
    expect(txn.amount).toBe(50);
    expect(txn.categories).toHaveLength(1);
  });

  it("createMockPlannedTransaction returns a valid planned transaction", () => {
    const planned = createMockPlannedTransaction();
    expect(planned.id).toContain("planned_");
    expect(planned.recurrence.frequency).toBe("monthly");
    expect(planned.active).toBe(true);
    expect(planned.previousDate).toBeNull();
  });

  it("createMockToken returns a valid token", () => {
    const token = createMockToken();
    expect(token.id).toContain("token_");
    expect(token.symbol).toBe("BTC");
    expect(token.total).toBe(0.5);
    expect(token.costAvg).toBe(30000);
  });

  it("createMockToken accepts overrides", () => {
    const token = createMockToken({ name: "Ethereum", symbol: "ETH", coingecko_id: "ethereum" });
    expect(token.name).toBe("Ethereum");
    expect(token.symbol).toBe("ETH");
  });

  it("resetFactoryIds resets the counter", () => {
    const first = createMockBank();
    resetFactoryIds();
    const afterReset = createMockBank();
    expect(first.id).toBe(afterReset.id);
  });
});
