import { describe, it, expect } from "vitest";
import {
  expectCurrencyEqual,
  expectNonNegative,
  expectValidPercentage,
  createMockPBCollection,
  createMockPB,
  flushPromises,
  waitForCondition,
} from "./helpers";

describe("Test Helpers", () => {
  describe("expectCurrencyEqual", () => {
    it("treats 10.005 and 10.01 as equal after rounding", () => {
      expectCurrencyEqual(10.005, 10.01);
    });

    it("treats exact values as equal", () => {
      expectCurrencyEqual(99.99, 99.99);
    });
  });

  describe("expectNonNegative", () => {
    it("passes for zero", () => {
      expectNonNegative(0);
    });

    it("passes for positive values", () => {
      expectNonNegative(100.5);
    });
  });

  describe("expectValidPercentage", () => {
    it("passes for 0", () => {
      expectValidPercentage(0);
    });

    it("passes for values over 100 (overspending)", () => {
      expectValidPercentage(150);
    });
  });

  describe("createMockPBCollection", () => {
    it("returns an object with all CRUD methods", () => {
      const col = createMockPBCollection();
      expect(col.getFullList).toBeDefined();
      expect(col.create).toBeDefined();
      expect(col.update).toBeDefined();
      expect(col.delete).toBeDefined();
    });

    it("accepts overrides", async () => {
      const col = createMockPBCollection({
        getFullList: expect.any(Function) as never,
      });
      expect(col.getFullList).toBeDefined();
    });
  });

  describe("createMockPB", () => {
    it("returns a mock PB instance with collection routing", () => {
      const pb = createMockPB({ banks: { getFullList: expect.any(Function) as never } });
      expect(pb.collection).toBeDefined();
      expect(pb.authStore.record.id).toBe("test-user");
    });

    it("creates default collection if not provided", () => {
      const pb = createMockPB();
      const col = pb.collection("transactions");
      expect(col.getFullList).toBeDefined();
    });
  });

  describe("flushPromises", () => {
    it("resolves after microtask queue drains", async () => {
      let resolved = false;
      Promise.resolve().then(() => {
        resolved = true;
      });
      await flushPromises();
      expect(resolved).toBe(true);
    });
  });

  describe("waitForCondition", () => {
    it("resolves when condition becomes true", async () => {
      let flag = false;
      setTimeout(() => {
        flag = true;
      }, 50);
      await waitForCondition(() => flag, { timeout: 1000 });
      expect(flag).toBe(true);
    });

    it("throws on timeout", async () => {
      await expect(waitForCondition(() => false, { timeout: 100 })).rejects.toThrow("timed out");
    });
  });
});
