import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  createOptimisticCreate,
  createOptimisticUpdate,
  createOptimisticDelete,
} from "./optimistic";

interface TestItem {
  id: string;
  name: string;
}

describe("optimistic update helpers", () => {
  let queryClient: QueryClient;
  const queryKey = ["items", "list"];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  // ── createOptimisticCreate ──────────────────────────────────────────────

  describe("createOptimisticCreate", () => {
    it("prepends a temp item to the cache on onMutate", async () => {
      queryClient.setQueryData<TestItem[]>(queryKey, [{ id: "1", name: "Existing" }]);

      const helpers = createOptimisticCreate<TestItem, { name: string }>(
        queryClient,
        queryKey,
        (input) => ({ id: "temp", name: input.name }),
      );

      const ctx = await helpers.onMutate({ name: "New" });

      const cached = queryClient.getQueryData<TestItem[]>(queryKey);
      expect(cached).toHaveLength(2);
      expect(cached![0]).toEqual({ id: "temp", name: "New" });
      expect(ctx.previous).toEqual([{ id: "1", name: "Existing" }]);
    });

    it("rolls back on error", async () => {
      const original: TestItem[] = [{ id: "1", name: "Existing" }];
      queryClient.setQueryData<TestItem[]>(queryKey, original);

      const helpers = createOptimisticCreate<TestItem, { name: string }>(
        queryClient,
        queryKey,
        (input) => ({ id: "temp", name: input.name }),
      );

      const ctx = await helpers.onMutate({ name: "New" });
      helpers.onError(new Error("fail"), { name: "New" }, ctx);

      const cached = queryClient.getQueryData<TestItem[]>(queryKey);
      expect(cached).toEqual(original);
    });

    it("invalidates queries on settled", async () => {
      const spy = vi.spyOn(queryClient, "invalidateQueries");

      const helpers = createOptimisticCreate<TestItem, { name: string }>(
        queryClient,
        queryKey,
        (input) => ({ id: "temp", name: input.name }),
      );

      helpers.onSettled();

      expect(spy).toHaveBeenCalledWith({ queryKey: ["items"] });
    });

    it("invalidates custom keys when provided", () => {
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      const customKeys = [["items"], ["related"]];

      const helpers = createOptimisticCreate<TestItem, { name: string }>(
        queryClient,
        queryKey,
        (input) => ({ id: "temp", name: input.name }),
        customKeys,
      );

      helpers.onSettled();

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith({ queryKey: ["items"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["related"] });
    });

    it("handles empty cache gracefully", async () => {
      // No initial data set
      const helpers = createOptimisticCreate<TestItem, { name: string }>(
        queryClient,
        queryKey,
        (input) => ({ id: "temp", name: input.name }),
      );

      const ctx = await helpers.onMutate({ name: "First" });

      const cached = queryClient.getQueryData<TestItem[]>(queryKey);
      expect(cached).toEqual([{ id: "temp", name: "First" }]);
      expect(ctx.previous).toBeUndefined();
    });

    it("does not roll back when context is undefined", () => {
      queryClient.setQueryData<TestItem[]>(queryKey, [{ id: "1", name: "A" }]);

      const helpers = createOptimisticCreate<TestItem, { name: string }>(
        queryClient,
        queryKey,
        (input) => ({ id: "temp", name: input.name }),
      );

      // Should not throw
      helpers.onError(new Error("fail"), { name: "X" }, undefined);

      // Cache unchanged from whatever state it was in
      expect(queryClient.getQueryData<TestItem[]>(queryKey)).toEqual([{ id: "1", name: "A" }]);
    });
  });

  // ── createOptimisticUpdate ──────────────────────────────────────────────

  describe("createOptimisticUpdate", () => {
    it("updates the matching item in cache on onMutate", async () => {
      queryClient.setQueryData<TestItem[]>(queryKey, [
        { id: "1", name: "Old" },
        { id: "2", name: "Other" },
      ]);

      const helpers = createOptimisticUpdate<TestItem>(queryClient, queryKey);

      const ctx = await helpers.onMutate({ id: "1", data: { name: "Updated" } });

      const cached = queryClient.getQueryData<TestItem[]>(queryKey);
      expect(cached![0]).toEqual({ id: "1", name: "Updated" });
      expect(cached![1]).toEqual({ id: "2", name: "Other" });
      expect(ctx.previous).toEqual([
        { id: "1", name: "Old" },
        { id: "2", name: "Other" },
      ]);
    });

    it("rolls back on error", async () => {
      const original: TestItem[] = [
        { id: "1", name: "Old" },
        { id: "2", name: "Other" },
      ];
      queryClient.setQueryData<TestItem[]>(queryKey, original);

      const helpers = createOptimisticUpdate<TestItem>(queryClient, queryKey);

      const ctx = await helpers.onMutate({ id: "1", data: { name: "Updated" } });
      helpers.onError(new Error("fail"), { id: "1", data: { name: "Updated" } }, ctx);

      expect(queryClient.getQueryData<TestItem[]>(queryKey)).toEqual(original);
    });

    it("leaves non-matching items unchanged", async () => {
      queryClient.setQueryData<TestItem[]>(queryKey, [
        { id: "1", name: "A" },
        { id: "2", name: "B" },
      ]);

      const helpers = createOptimisticUpdate<TestItem>(queryClient, queryKey);

      await helpers.onMutate({ id: "999", data: { name: "Ghost" } });

      const cached = queryClient.getQueryData<TestItem[]>(queryKey);
      expect(cached).toEqual([
        { id: "1", name: "A" },
        { id: "2", name: "B" },
      ]);
    });

    it("supports custom getId function", async () => {
      interface CustomItem {
        id?: string;
        uid: string;
        name: string;
      }
      const key = ["custom", "list"];
      queryClient.setQueryData<CustomItem[]>(key, [{ uid: "u1", name: "Old" }]);

      const helpers = createOptimisticUpdate<CustomItem>(
        queryClient,
        key,
        undefined,
        (item) => item.uid,
      );

      await helpers.onMutate({ id: "u1", data: { name: "New" } });

      const cached = queryClient.getQueryData<CustomItem[]>(key);
      expect(cached![0]!.name).toBe("New");
    });
  });

  // ── createOptimisticDelete ──────────────────────────────────────────────

  describe("createOptimisticDelete", () => {
    it("removes the matching item from cache on onMutate", async () => {
      queryClient.setQueryData<TestItem[]>(queryKey, [
        { id: "1", name: "A" },
        { id: "2", name: "B" },
      ]);

      const helpers = createOptimisticDelete<TestItem>(queryClient, queryKey);

      const ctx = await helpers.onMutate("1");

      const cached = queryClient.getQueryData<TestItem[]>(queryKey);
      expect(cached).toEqual([{ id: "2", name: "B" }]);
      expect(ctx.previous).toEqual([
        { id: "1", name: "A" },
        { id: "2", name: "B" },
      ]);
    });

    it("rolls back on error", async () => {
      const original: TestItem[] = [
        { id: "1", name: "A" },
        { id: "2", name: "B" },
      ];
      queryClient.setQueryData<TestItem[]>(queryKey, original);

      const helpers = createOptimisticDelete<TestItem>(queryClient, queryKey);

      const ctx = await helpers.onMutate("1");
      helpers.onError(new Error("fail"), "1", ctx);

      expect(queryClient.getQueryData<TestItem[]>(queryKey)).toEqual(original);
    });

    it("does nothing when deleting non-existent id", async () => {
      const original: TestItem[] = [{ id: "1", name: "A" }];
      queryClient.setQueryData<TestItem[]>(queryKey, original);

      const helpers = createOptimisticDelete<TestItem>(queryClient, queryKey);

      await helpers.onMutate("999");

      const cached = queryClient.getQueryData<TestItem[]>(queryKey);
      expect(cached).toEqual(original);
    });

    it("invalidates custom keys on settled", () => {
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      const customKeys = [["items"], ["transactions"]];

      const helpers = createOptimisticDelete<TestItem>(queryClient, queryKey, customKeys);

      helpers.onSettled();

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith({ queryKey: ["items"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["transactions"] });
    });

    it("supports custom getId function", async () => {
      interface CustomItem {
        id?: string;
        uid: string;
        name: string;
      }
      const key = ["custom", "list"];
      queryClient.setQueryData<CustomItem[]>(key, [
        { uid: "u1", name: "A" },
        { uid: "u2", name: "B" },
      ]);

      const helpers = createOptimisticDelete<CustomItem>(
        queryClient,
        key,
        undefined,
        (item) => item.uid,
      );

      await helpers.onMutate("u1");

      const cached = queryClient.getQueryData<CustomItem[]>(key);
      expect(cached).toEqual([{ uid: "u2", name: "B" }]);
    });
  });
});
