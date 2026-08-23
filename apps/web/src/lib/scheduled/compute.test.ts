import { describe, expect, it } from "vitest";
import {
  dueTodaySet,
  nextOccurrence,
  waiveAdvance,
  shouldNotify,
  type ScheduledTxn,
} from "./compute";

function row(overrides: Partial<ScheduledTxn> = {}): ScheduledTxn {
  return {
    id: "sch-1",
    userId: "user-1",
    name: "Rent",
    description: "Monthly rent",
    type: "expense",
    amountMinor: -120000n,
    accountId: "acc-1",
    categoryIds: [],
    recurrence: { frequency: "monthly", interval: 1 },
    timezone: "UTC",
    invokeDate: Date.UTC(2026, 7, 23, 9, 0, 0), // 2026-08-23T09:00Z
    previousDate: null,
    lastNotifiedAt: null,
    active: true,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    ...overrides,
  };
}

// Fixed "now": 2026-08-23T10:00:00Z
const NOW = Date.UTC(2026, 7, 23, 10, 0, 0);

describe("dueTodaySet", () => {
  it("includes active row whose invokeDate local date is today and instant has passed", () => {
    const due = dueTodaySet([row()], new Date(NOW));
    expect(due.map((r) => r.id)).toEqual(["sch-1"]);
  });

  it("excludes rows whose invokeDate instant has not been reached yet", () => {
    const due = dueTodaySet(
      [row({ invokeDate: Date.UTC(2026, 7, 23, 11, 0, 0) })],
      new Date(NOW),
    );
    expect(due).toEqual([]);
  });

  it("includes overdue rows (invoke local date before today)", () => {
    const due = dueTodaySet(
      [row({ invokeDate: Date.UTC(2026, 7, 20, 9, 0, 0) })],
      new Date(NOW),
    );
    expect(due.map((r) => r.id)).toEqual(["sch-1"]);
  });

  it("excludes rows already logged this cycle (previousDate >= today local)", () => {
    const due = dueTodaySet(
      [row({ previousDate: Date.UTC(2026, 7, 23, 8, 0, 0) })],
      new Date(NOW),
    );
    expect(due).toEqual([]);
  });

  it("includes rows logged on a previous local day", () => {
    const due = dueTodaySet(
      [row({ previousDate: Date.UTC(2026, 7, 22, 8, 0, 0) })],
      new Date(NOW),
    );
    expect(due.map((r) => r.id)).toEqual(["sch-1"]);
  });

  it("excludes inactive, deleted, and no-invokeDate rows", () => {
    const due = dueTodaySet(
      [
        row({ id: "a", active: false }),
        row({ id: "b", deletedAt: NOW }),
        row({ id: "c", invokeDate: null }),
      ],
      new Date(NOW),
    );
    expect(due).toEqual([]);
  });

  it("uses IANA timezone: due in one tz, not yet due in another", () => {
    // invoke 2026-08-23T18:00Z. In Sydney (UTC+10) the local invoke date is
    // already 2026-08-24 while local now is still 2026-08-23 -> not due there.
    const r = row({ invokeDate: Date.UTC(2026, 7, 23, 2, 0, 0) });
    const inUtc = dueTodaySet([r], new Date(NOW));
    const inSydney = dueTodaySet(
      [row({ id: "syd", timezone: "Australia/Sydney", invokeDate: Date.UTC(2026, 7, 23, 18, 0, 0) })],
      new Date(NOW),
    );
    expect(inUtc.map((x) => x.id)).toEqual(["sch-1"]);
    expect(inSydney).toEqual([]);
  });
});

describe("nextOccurrence", () => {
  it("labels a due row as due today", () => {
    const occ = nextOccurrence(row(), new Date(NOW));
    expect(occ.status).toBe("due");
    expect(occ.localDate).toBe("2026-08-23");
  });

  it("labels an overdue row as overdue", () => {
    const occ = nextOccurrence(
      row({ invokeDate: Date.UTC(2026, 7, 20, 9, 0, 0) }),
      new Date(NOW),
    );
    expect(occ.status).toBe("overdue");
    expect(occ.localDate).toBe("2026-08-20");
  });

  it("labels a future row as upcoming with local date", () => {
    const occ = nextOccurrence(
      row({ invokeDate: Date.UTC(2026, 8, 1, 9, 0, 0) }),
      new Date(NOW),
    );
    expect(occ.status).toBe("upcoming");
    expect(occ.localDate).toBe("2026-09-01");
  });

  it("falls back to UTC for unknown timezone", () => {
    const occ = nextOccurrence(
      row({ timezone: "Not/AZone" }),
      new Date(NOW),
    );
    expect(occ.localDate).toBe("2026-08-23");
  });
});

describe("waiveAdvance", () => {
  it("advances invokeDate by one step and records previousDate, no txn side-effect", () => {
    const next = waiveAdvance(row());
    expect(next.previousDate).toEqual(Date.UTC(2026, 7, 23, 9, 0, 0));
    expect(next.invokeDate).toEqual(Date.UTC(2026, 8, 23, 9, 0, 0));
  });

  it("supports weekly with interval 2", () => {
    const next = waiveAdvance(
      row({ recurrence: { frequency: "weekly", interval: 2 }, invokeDate: Date.UTC(2026, 7, 3) }),
    );
    expect(next.invokeDate).toEqual(Date.UTC(2026, 7, 17));
  });

  it("throws when invokeDate is null", () => {
    expect(() => waiveAdvance(row({ invokeDate: null }))).toThrow();
  });
});

describe("shouldNotify", () => {
  it("notifies when due today, instant passed, never notified", () => {
    expect(shouldNotify(row(), new Date(NOW))).toBe(true);
  });

  it("does not notify when the local date is not today (overdue yesterday)", () => {
    expect(
      shouldNotify(
        row({ invokeDate: Date.UTC(2026, 7, 22, 9, 0, 0) }),
        new Date(NOW),
      ),
    ).toBe(false);
  });

  it("does not notify within 3 hours of last notification", () => {
    expect(
      shouldNotify(
        row({ lastNotifiedAt: NOW - 1 * 3600_000 }),
        new Date(NOW),
      ),
    ).toBe(false);
  });

  it("re-notifies when last notification is older than 3 hours", () => {
    expect(
      shouldNotify(
        row({ lastNotifiedAt: NOW - 3 * 3600_000 - 1 }),
        new Date(NOW),
      ),
    ).toBe(true);
  });

  it("re-notifies exactly at 3 hours boundary", () => {
    expect(
      shouldNotify(row({ lastNotifiedAt: NOW - 3 * 3600_000 }), new Date(NOW)),
    ).toBe(true);
  });

  it("does not notify when already logged this cycle", () => {
    expect(
      shouldNotify(
        row({ previousDate: Date.UTC(2026, 7, 23, 8, 0, 0) }),
        new Date(NOW),
      ),
    ).toBe(false);
  });
});
