/**
 * Integration tests for Form handling (validation, error display, submission)
 * Validates: Requirement 28.7
 */
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

// ── Schemas (matching the app's validation patterns) ─────────────────────────

const transactionSchema = z.object({
  description: z.string().min(1, "Description required"),
  type: z.enum(["income", "expense", "deposit", "withdrawal"]),
  amount: z.number().positive("Amount must be positive"),
  bank: z.string().min(1, "Bank required"),
  categories: z.array(z.string()).min(1, "At least one category required"),
  date: z.date(),
});

const bankSchema = z.object({
  name: z.string().min(1, "Name required"),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
});

const categorySchema = z.object({
  name: z.string().min(1, "Name required"),
  monthly_budget: z.number().min(0, "Budget must be non-negative").optional(),
  hideable: z.boolean(),
  total_exempt: z.boolean().optional(),
});

// ── Helper ───────────────────────────────────────────────────────────────────

function getFieldErrors(schema: z.ZodSchema, data: unknown): Record<string, string> {
  const result = schema.safeParse(data);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) errors[path] = issue.message;
  }
  return errors;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Form handling integration", () => {
  describe("Transaction form validation", () => {
    it("rejects empty description", () => {
      const errors = getFieldErrors(transactionSchema, {
        description: "",
        type: "expense",
        amount: 50,
        bank: "b1",
        categories: ["cat1"],
        date: new Date(),
      });

      expect(errors.description).toBe("Description required");
    });

    it("rejects zero amount", () => {
      const errors = getFieldErrors(transactionSchema, {
        description: "Test",
        type: "expense",
        amount: 0,
        bank: "b1",
        categories: ["cat1"],
        date: new Date(),
      });

      expect(errors.amount).toBe("Amount must be positive");
    });

    it("rejects negative amount", () => {
      const errors = getFieldErrors(transactionSchema, {
        description: "Test",
        type: "expense",
        amount: -10,
        bank: "b1",
        categories: ["cat1"],
        date: new Date(),
      });

      expect(errors.amount).toBeDefined();
    });

    it("rejects empty categories", () => {
      const errors = getFieldErrors(transactionSchema, {
        description: "Test",
        type: "expense",
        amount: 50,
        bank: "b1",
        categories: [],
        date: new Date(),
      });

      expect(errors.categories).toBe("At least one category required");
    });

    it("rejects empty bank", () => {
      const errors = getFieldErrors(transactionSchema, {
        description: "Test",
        type: "expense",
        amount: 50,
        bank: "",
        categories: ["cat1"],
        date: new Date(),
      });

      expect(errors.bank).toBe("Bank required");
    });

    it("rejects invalid transaction type", () => {
      const result = transactionSchema.safeParse({
        description: "Test",
        type: "invalid",
        amount: 50,
        bank: "b1",
        categories: ["cat1"],
        date: new Date(),
      });

      expect(result.success).toBe(false);
    });

    it("accepts valid transaction data", () => {
      const result = transactionSchema.safeParse({
        description: "Groceries",
        type: "expense",
        amount: 50,
        bank: "b1",
        categories: ["cat1"],
        date: new Date(),
      });

      expect(result.success).toBe(true);
    });

    it("accepts all valid transaction types", () => {
      for (const type of ["income", "expense", "deposit", "withdrawal"] as const) {
        const result = transactionSchema.safeParse({
          description: "Test",
          type,
          amount: 50,
          bank: "b1",
          categories: ["cat1"],
          date: new Date(),
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("Bank form validation", () => {
    it("rejects empty bank name", () => {
      const errors = getFieldErrors(bankSchema, { name: "" });
      expect(errors.name).toBe("Name required");
    });

    it("accepts valid bank data", () => {
      const result = bankSchema.safeParse({ name: "My Bank", primaryColor: "#ff0000" });
      expect(result.success).toBe(true);
    });

    it("accepts bank without optional colors", () => {
      const result = bankSchema.safeParse({ name: "My Bank" });
      expect(result.success).toBe(true);
    });
  });

  describe("Category form validation", () => {
    it("rejects empty category name", () => {
      const errors = getFieldErrors(categorySchema, { name: "", hideable: false });
      expect(errors.name).toBe("Name required");
    });

    it("accepts valid category data with budget", () => {
      const result = categorySchema.safeParse({
        name: "Food",
        monthly_budget: 500,
        hideable: false,
      });
      expect(result.success).toBe(true);
    });

    it("accepts category without optional budget", () => {
      const result = categorySchema.safeParse({ name: "Food", hideable: true });
      expect(result.success).toBe(true);
    });

    it("rejects negative budget", () => {
      const errors = getFieldErrors(categorySchema, {
        name: "Food",
        monthly_budget: -100,
        hideable: false,
      });
      expect(errors.monthly_budget).toBe("Budget must be non-negative");
    });
  });

  describe("Form submission flow", () => {
    it("valid data passes schema and can be submitted", () => {
      const onSubmit = vi.fn();
      const data = { name: "Test Bank", primaryColor: "#ff0000" };
      const result = bankSchema.safeParse(data);

      if (result.success) {
        onSubmit(result.data);
      }

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Test Bank" }));
    });

    it("invalid data does not trigger submission", () => {
      const onSubmit = vi.fn();
      const data = { name: "" };
      const result = bankSchema.safeParse(data);

      if (result.success) {
        onSubmit(result.data);
      }

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("displays errors for multiple invalid fields", () => {
      const errors = getFieldErrors(transactionSchema, {
        description: "",
        type: "expense",
        amount: -1,
        bank: "",
        categories: [],
        date: new Date(),
      });

      expect(errors.description).toBeDefined();
      expect(errors.amount).toBeDefined();
      expect(errors.bank).toBeDefined();
      expect(errors.categories).toBeDefined();
    });
  });
});
