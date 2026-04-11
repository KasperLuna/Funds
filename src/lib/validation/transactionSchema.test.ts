import { describe, it, expect } from "vitest";
import { transactionSchema, transferSchema } from "./transactionSchema";

describe("transactionSchema", () => {
  const validTransaction = {
    description: "Groceries",
    type: "expense" as const,
    amount: 50,
    bank: "bank-1",
    categories: ["food"],
    date: new Date("2024-01-15"),
  };

  it("accepts a valid transaction", () => {
    const result = transactionSchema.safeParse(validTransaction);
    expect(result.success).toBe(true);
  });

  it("rejects empty description", () => {
    const result = transactionSchema.safeParse({ ...validTransaction, description: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Description is required");
    }
  });

  it("rejects zero amount", () => {
    const result = transactionSchema.safeParse({ ...validTransaction, amount: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Amount must be positive");
    }
  });

  it("rejects negative amount", () => {
    const result = transactionSchema.safeParse({ ...validTransaction, amount: -10 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Amount must be positive");
    }
  });

  it("rejects empty bank", () => {
    const result = transactionSchema.safeParse({ ...validTransaction, bank: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Bank is required");
    }
  });

  it("rejects empty categories array", () => {
    const result = transactionSchema.safeParse({ ...validTransaction, categories: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("At least one category is required");
    }
  });

  it("coerces date strings to Date objects", () => {
    const result = transactionSchema.safeParse({ ...validTransaction, date: "2024-06-01" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date).toBeInstanceOf(Date);
    }
  });

  it("rejects invalid transaction type", () => {
    const result = transactionSchema.safeParse({ ...validTransaction, type: "refund" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid transaction types", () => {
    for (const type of ["income", "expense", "deposit", "withdrawal"]) {
      const result = transactionSchema.safeParse({ ...validTransaction, type });
      expect(result.success).toBe(true);
    }
  });
});

describe("transferSchema", () => {
  const validTransfer = {
    description: "Transfer to savings",
    originAmount: 100,
    destinationAmount: 100,
    originBank: "bank-1",
    destinationBank: "bank-2",
    date: new Date("2024-01-15"),
  };

  it("accepts a valid transfer", () => {
    const result = transferSchema.safeParse(validTransfer);
    expect(result.success).toBe(true);
  });

  it("accepts a transfer with optional category", () => {
    const result = transferSchema.safeParse({ ...validTransfer, category: ["transfer"] });
    expect(result.success).toBe(true);
  });

  it("rejects empty description", () => {
    const result = transferSchema.safeParse({ ...validTransfer, description: "" });
    expect(result.success).toBe(false);
  });

  it("rejects zero origin amount", () => {
    const result = transferSchema.safeParse({ ...validTransfer, originAmount: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects empty origin bank", () => {
    const result = transferSchema.safeParse({ ...validTransfer, originBank: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty destination bank", () => {
    const result = transferSchema.safeParse({ ...validTransfer, destinationBank: "" });
    expect(result.success).toBe(false);
  });
});
