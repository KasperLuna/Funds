import { describe, it, expect } from "vitest";
import {
  loginSchema,
  bankSchema,
  categorySchema,
  tokenSchema,
  transactionSchema,
  transferSchema,
  plannedTransactionSchema,
} from "./index";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({ email: "", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("bankSchema", () => {
  it("accepts valid bank with name only", () => {
    const result = bankSchema.safeParse({ name: "My Bank" });
    expect(result.success).toBe(true);
  });

  it("accepts bank with optional colors", () => {
    const result = bankSchema.safeParse({
      name: "My Bank",
      primaryColor: "#3b82f6",
      secondaryColor: "#1e40af",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = bankSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 50 characters", () => {
    const result = bankSchema.safeParse({ name: "A".repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe("categorySchema", () => {
  it("accepts valid category with empty-string budget (form default)", () => {
    const result = categorySchema.safeParse({ name: "Food", hideable: false, monthly_budget: "" });
    expect(result.success).toBe(true);
  });

  it("accepts category with numeric budget", () => {
    const result = categorySchema.safeParse({
      name: "Food",
      hideable: false,
      monthly_budget: 500,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = categorySchema.safeParse({ name: "", hideable: false, monthly_budget: "" });
    expect(result.success).toBe(false);
  });

  it("rejects negative budget", () => {
    const result = categorySchema.safeParse({
      name: "Food",
      hideable: false,
      monthly_budget: -10,
    });
    expect(result.success).toBe(false);
  });
});

describe("tokenSchema", () => {
  it("accepts valid token", () => {
    const result = tokenSchema.safeParse({
      name: "Bitcoin",
      symbol: "BTC",
      coingecko_id: "bitcoin",
      total: 1.5,
      costAvg: 30000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = tokenSchema.safeParse({
      name: "",
      symbol: "BTC",
      coingecko_id: "bitcoin",
      total: 1,
      costAvg: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero quantity", () => {
    const result = tokenSchema.safeParse({
      name: "Bitcoin",
      symbol: "BTC",
      coingecko_id: "bitcoin",
      total: 0,
      costAvg: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("barrel re-exports", () => {
  it("re-exports all schemas", () => {
    expect(loginSchema).toBeDefined();
    expect(bankSchema).toBeDefined();
    expect(categorySchema).toBeDefined();
    expect(tokenSchema).toBeDefined();
    expect(transactionSchema).toBeDefined();
    expect(transferSchema).toBeDefined();
    expect(plannedTransactionSchema).toBeDefined();
  });
});
