import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  resolveMutations,
  type MutationRow,
  type MutationsBatch,
} from "./mutations.js";

describe("resolveMutations", () => {
  const USER_A = "user-a-ulid";
  const USER_B = "user-b-ulid";
  const NOW = 1700000000000;

  const createRow = (
    overrides: Partial<MutationRow> = {}
  ): MutationRow => ({
    id: "row-1",
    user_id: USER_A,
    created_at: NOW - 1000,
    updated_at: NOW,
    deleted_at: null,
    ...overrides,
  });

  describe("unknown table", () => {
    it("should skip all rows with unknown-table reason", () => {
      const batch: MutationsBatch = {
        table: "unknown_table",
        upserts: [createRow({ id: "r1" }), createRow({ id: "r2" })],
        deletes: [createRow({ id: "r3", deleted_at: NOW })],
      };

      const result = resolveMutations(batch, new Map(), { userId: USER_A });

      expect(result.applied).toEqual([]);
      expect(result.skipped).toHaveLength(3);
      expect(result.skipped).toEqual([
        { id: "r1", reason: "unknown-table" },
        { id: "r2", reason: "unknown-table" },
        { id: "r3", reason: "unknown-table" },
      ]);
    });
  });

  describe("user isolation", () => {
    it("should skip upserts from other users", () => {
      const batch: MutationsBatch = {
        table: "accounts",
        upserts: [createRow({ id: "r1", user_id: USER_B })],
        deletes: [],
      };

      const result = resolveMutations(batch, new Map(), { userId: USER_A });

      expect(result.applied).toEqual([]);
      expect(result.skipped).toEqual([{ id: "r1", reason: "other-user" }]);
    });

    it("should skip deletes from other users", () => {
      const batch: MutationsBatch = {
        table: "accounts",
        upserts: [],
        deletes: [createRow({ id: "r1", user_id: USER_B, deleted_at: NOW })],
      };

      const result = resolveMutations(batch, new Map(), { userId: USER_A });

      expect(result.applied).toEqual([]);
      expect(result.skipped).toEqual([{ id: "r1", reason: "other-user" }]);
    });
  });

  describe("new row insertion", () => {
    it("should apply brand-new rows with no existing record", () => {
      const newRow = createRow({ id: "new-1" });
      const batch: MutationsBatch = {
        table: "accounts",
        upserts: [newRow],
        deletes: [],
      };

      const result = resolveMutations(batch, new Map(), { userId: USER_A });

      expect(result.applied).toEqual([newRow]);
      expect(result.skipped).toEqual([]);
    });
  });

  describe("LWW on updated_at", () => {
    it("should apply newer row (updated_at > existing)", () => {
      const existing = createRow({ id: "r1", updated_at: NOW - 1000 });
      const newer = createRow({ id: "r1", updated_at: NOW });
      const batch: MutationsBatch = {
        table: "accounts",
        upserts: [newer],
        deletes: [],
      };

      const existingById = new Map([["r1", existing]]);
      const result = resolveMutations(batch, existingById, { userId: USER_A });

      expect(result.applied).toEqual([newer]);
      expect(result.skipped).toEqual([]);
    });

    it("should skip older row (updated_at < existing) as stale", () => {
      const existing = createRow({ id: "r1", updated_at: NOW });
      const older = createRow({ id: "r1", updated_at: NOW - 1000 });
      const batch: MutationsBatch = {
        table: "accounts",
        upserts: [older],
        deletes: [],
      };

      const existingById = new Map([["r1", existing]]);
      const result = resolveMutations(batch, existingById, { userId: USER_A });

      expect(result.applied).toEqual([]);
      expect(result.skipped).toEqual([{ id: "r1", reason: "stale" }]);
    });
  });

  describe("idempotent replay detection", () => {
    it("should skip identical re-upload (same updated_at + deep equal) as replay", () => {
      const existing = createRow({
        id: "r1",
        updated_at: NOW,
        name: "Account A",
        balance: 1000,
      });
      const identical = createRow({
        id: "r1",
        updated_at: NOW,
        name: "Account A",
        balance: 1000,
      });
      const batch: MutationsBatch = {
        table: "accounts",
        upserts: [identical],
        deletes: [],
      };

      const existingById = new Map([["r1", existing]]);
      const result = resolveMutations(batch, existingById, { userId: USER_A });

      expect(result.applied).toEqual([]);
      expect(result.skipped).toEqual([{ id: "r1", reason: "replay" }]);
    });

    it("should apply row with same updated_at but different fields (deterministic)", () => {
      const existing = createRow({
        id: "r1",
        updated_at: NOW,
        name: "Account A",
        balance: 1000,
      });
      const different = createRow({
        id: "r1",
        updated_at: NOW,
        name: "Account B",
        balance: 2000,
      });
      const batch: MutationsBatch = {
        table: "accounts",
        upserts: [different],
        deletes: [],
      };

      const existingById = new Map([["r1", existing]]);
      const result = resolveMutations(batch, existingById, { userId: USER_A });

      expect(result.applied).toEqual([different]);
      expect(result.skipped).toEqual([]);
    });
  });

  describe("soft-delete tombstones", () => {
    it("should apply tombstone (deleted_at set) from deletes array", () => {
      const tombstone = createRow({ id: "r1", deleted_at: NOW });
      const batch: MutationsBatch = {
        table: "accounts",
        upserts: [],
        deletes: [tombstone],
      };

      const result = resolveMutations(batch, new Map(), { userId: USER_A });

      expect(result.applied).toEqual([tombstone]);
      expect(result.skipped).toEqual([]);
    });

    it("should skip tombstone if existing tombstone is newer", () => {
      const existing = createRow({ id: "r1", updated_at: NOW, deleted_at: NOW });
      const olderTombstone = createRow({
        id: "r1",
        updated_at: NOW - 1000,
        deleted_at: NOW - 1000,
      });
      const batch: MutationsBatch = {
        table: "accounts",
        upserts: [],
        deletes: [olderTombstone],
      };

      const existingById = new Map([["r1", existing]]);
      const result = resolveMutations(batch, existingById, { userId: USER_A });

      expect(result.applied).toEqual([]);
      expect(result.skipped).toEqual([{ id: "r1", reason: "stale" }]);
    });
  });

  describe("delete-vs-update race", () => {
    it("should process deletes AFTER upserts (tombstone wins)", () => {
      const upsertRow = createRow({ id: "r1", updated_at: NOW, name: "Active" });
      const deleteRow = createRow({
        id: "r1",
        updated_at: NOW,
        deleted_at: NOW,
      });
      const batch: MutationsBatch = {
        table: "accounts",
        upserts: [upsertRow],
        deletes: [deleteRow],
      };

      const result = resolveMutations(batch, new Map(), { userId: USER_A });

      // Both should be applied, but delete comes second
      expect(result.applied).toHaveLength(2);
      expect(result.applied[0]).toEqual(upsertRow);
      expect(result.applied[1]).toEqual(deleteRow);
      expect(result.skipped).toEqual([]);
    });

    it("should handle delete-vs-update when existing row present", () => {
      const existing = createRow({ id: "r1", updated_at: NOW - 2000 });
      const upsertRow = createRow({ id: "r1", updated_at: NOW, name: "Updated" });
      const deleteRow = createRow({
        id: "r1",
        updated_at: NOW + 1,
        deleted_at: NOW + 1,
      });
      const batch: MutationsBatch = {
        table: "accounts",
        upserts: [upsertRow],
        deletes: [deleteRow],
      };

      const existingById = new Map([["r1", existing]]);
      const result = resolveMutations(batch, existingById, { userId: USER_A });

      // Upsert applies, then delete applies (newer)
      expect(result.applied).toHaveLength(2);
      expect(result.applied[0]).toEqual(upsertRow);
      expect(result.applied[1]).toEqual(deleteRow);
    });
  });

  describe("preserves row data verbatim", () => {
    it("should return applied rows unchanged (including created_at)", () => {
      const row = createRow({
        id: "r1",
        created_at: NOW - 5000,
        updated_at: NOW,
        custom_field: "preserved",
      });
      const batch: MutationsBatch = {
        table: "accounts",
        upserts: [row],
        deletes: [],
      };

      const result = resolveMutations(batch, new Map(), { userId: USER_A });

      expect(result.applied[0]).toEqual(row);
      expect(result.applied[0]?.created_at).toBe(NOW - 5000);
    });
  });

  describe("all replicated tables", () => {
    const tables = [
      "accounts",
      "categories",
      "transactions",
      "transfers",
      "trades",
      "templates",
      "scheduled_transactions",
      "push_subscriptions",
    ];

    tables.forEach((table) => {
      it(`should process ${table} table`, () => {
        const row = createRow({ id: `${table}-1` });
        const batch: MutationsBatch = {
          table,
          upserts: [row],
          deletes: [],
        };

        const result = resolveMutations(batch, new Map(), { userId: USER_A });

        expect(result.applied).toEqual([row]);
        expect(result.skipped).toEqual([]);
      });
    });
  });

  describe("complex batch scenarios", () => {
    it("should handle mixed applied and skipped rows", () => {
      const existing = createRow({ id: "r2", updated_at: NOW });
      const batch: MutationsBatch = {
        table: "accounts",
        upserts: [
          createRow({ id: "r1" }), // new -> apply
          createRow({ id: "r2", updated_at: NOW - 1000 }), // stale -> skip
          createRow({ id: "r3", user_id: USER_B }), // other user -> skip
          createRow({ id: "r4", updated_at: NOW + 1000 }), // new, newer -> apply
        ],
        deletes: [],
      };

      const existingById = new Map([["r2", existing]]);
      const result = resolveMutations(batch, existingById, { userId: USER_A });

      expect(result.applied).toHaveLength(2);
      expect(result.applied[0]?.id).toBe("r1");
      expect(result.applied[1]?.id).toBe("r4");
      expect(result.skipped).toHaveLength(2);
      expect(result.skipped).toContainEqual({ id: "r2", reason: "stale" });
      expect(result.skipped).toContainEqual({ id: "r3", reason: "other-user" });
    });
  });

  describe("fast-check property tests", () => {
    it("LWW invariant: applied row has max updated_at among pair", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            user_id: fc.constant(USER_A),
            created_at: fc.integer({ min: 1000000000000, max: 2000000000000 }),
            existing_updated_at: fc.integer({
              min: 1000000000000,
              max: 2000000000000,
            }),
            incoming_updated_at: fc.integer({
              min: 1000000000000,
              max: 2000000000000,
            }),
            deleted_at: fc.constantFrom(null, undefined),
          }),
          ({ id, user_id, created_at, existing_updated_at, incoming_updated_at, deleted_at }) => {
            const existing: MutationRow = {
              id,
              user_id,
              created_at,
              updated_at: existing_updated_at,
              deleted_at,
            };
            const incoming: MutationRow = {
              id,
              user_id,
              created_at,
              updated_at: incoming_updated_at,
              deleted_at,
            };

            const batch: MutationsBatch = {
              table: "accounts",
              upserts: [incoming],
              deletes: [],
            };

            const existingById = new Map([[id, existing]]);
            const result = resolveMutations(batch, existingById, {
              userId: USER_A,
            });

            // If applied, the incoming must have >= updated_at (or be identical replay)
            if (result.applied.length > 0) {
              expect(incoming_updated_at).toBeGreaterThanOrEqual(
                existing_updated_at
              );
            }

            // If skipped as stale, existing must be newer
            if (
              result.skipped.some((s) => s.id === id && s.reason === "stale")
            ) {
              expect(existing_updated_at).toBeGreaterThan(incoming_updated_at);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("LWW invariant: newer always wins or ties deterministically", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            user_id: fc.constant(USER_A),
            created_at: fc.integer({ min: 1000000000000, max: 2000000000000 }),
            updated_at: fc.integer({ min: 1000000000000, max: 2000000000000 }),
            field_a: fc.string(),
            field_b: fc.integer(),
          }),
          fc.record({
            field_a: fc.string(),
            field_b: fc.integer(),
          }),
          (existingData, incomingFields) => {
            const existing: MutationRow = {
              id: existingData.id,
              user_id: existingData.user_id,
              created_at: existingData.created_at,
              updated_at: existingData.updated_at,
              deleted_at: null,
              field_a: existingData.field_a,
              field_b: existingData.field_b,
            };

            const incoming: MutationRow = {
              id: existingData.id,
              user_id: existingData.user_id,
              created_at: existingData.created_at,
              updated_at: existingData.updated_at,
              deleted_at: null,
              field_a: incomingFields.field_a,
              field_b: incomingFields.field_b,
            };

            const batch: MutationsBatch = {
              table: "accounts",
              upserts: [incoming],
              deletes: [],
            };

            const existingById = new Map([[existingData.id, existing]]);
            const result = resolveMutations(batch, existingById, {
              userId: USER_A,
            });

            // Same timestamp with different fields -> applied (deterministic)
            // Same timestamp with identical fields -> replay (skipped)
            const isIdentical =
              existing.field_a === incoming.field_a &&
              existing.field_b === incoming.field_b;

            if (isIdentical) {
              expect(result.skipped.some((s) => s.reason === "replay")).toBe(
                true
              );
            } else {
              expect(result.applied).toHaveLength(1);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
