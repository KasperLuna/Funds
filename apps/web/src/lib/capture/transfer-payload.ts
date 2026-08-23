// cavetail: self-contained ULID-like generator; production ids come from @funds/core ulid
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function newId(): string {
  const now = BigInt(Date.now());
  const buf = new Uint8Array(10);
  crypto.getRandomValues(buf);
  const rand = BigInt(
    "0x" + Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join(""),
  );
  const encode = (value: bigint, chars: number) => {
    let v = value;
    let out = "";
    for (let i = 0; i < chars; i += 1) {
      out = ALPHABET[Number(v & 31n)] + out;
      v >>= 5n;
    }
    return out;
  };
  return encode(now, 10) + encode(rand, 16);
}

export type TransferForm = {
  fromAccountId: string;
  fromAssetId: string;
  toAccountId: string;
  toAssetId: string;
  amountMinor: bigint;
  feeMinor?: bigint;
  userId: string;
  description: string;
  date: Date;
};

export type TransferRows = {
  transfer: Record<string, unknown>;
  fromLeg: Record<string, unknown>;
  toLeg: Record<string, unknown>;
  feeLeg: Record<string, unknown> | null;
};

export function validateTransfer(form: TransferForm): string | null {
  if (form.fromAccountId === form.toAccountId) {
    return "Origin and destination must differ";
  }
  if (form.amountMinor <= 0n) {
    return "Enter an amount";
  }
  return null;
}

/**
 * logic.md 4.3: a transfer decomposes into two opposite transactions with
 * shared description/date/categories. A fee is disclosed as a separate expense
 * on the origin account, linked via transfers.fee_transaction_id (schema has
 * no fee column; origin deduction = amount + fee across two rows).
 */
export function buildTransferRows(
  form: TransferForm,
  now: Date = new Date(),
): TransferRows {
  const ts = now.getTime();
  const transferId = newId();
  const feeMinor = form.feeMinor ?? 0n;

  const leg = (accountId: string, assetId: string, signed: bigint, type: "income" | "expense") => ({
    id: newId(),
    user_id: form.userId,
    account_id: accountId,
    asset_id: assetId,
    amount_minor: Number(signed),
    type,
    description: form.description,
    category_ids: [] as string[],
    date: form.date.getTime(),
    transfer_id: transferId,
    created_at: ts,
    updated_at: ts,
  });

  const feeLeg =
    feeMinor > 0n
      ? {
          ...leg(form.fromAccountId, form.fromAssetId, -feeMinor, "expense"),
          description: form.description
            ? `${form.description} (fee)`
            : "Transfer fee",
        }
      : null;

  return {
    transfer: {
      id: transferId,
      user_id: form.userId,
      fee_transaction_id: feeLeg?.id ?? null,
      created_at: ts,
      updated_at: ts,
    },
    fromLeg: leg(form.fromAccountId, form.fromAssetId, -form.amountMinor, "expense"),
    toLeg: leg(form.toAccountId, form.toAssetId, form.amountMinor, "income"),
    feeLeg,
  };
}
