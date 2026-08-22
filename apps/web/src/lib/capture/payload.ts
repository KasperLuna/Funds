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

export type CaptureForm = {
  type: "income" | "expense";
  amountMinor: bigint;
  accountId: string;
  assetId: string;
  userId: string;
  categoryIds: string[];
  description: string;
  date: Date;
};

export function buildTransactionRow(
  form: CaptureForm,
  now: Date = new Date(),
): Record<string, unknown> {
  const ts = now.getTime();
  const signed = form.type === "expense" ? -form.amountMinor : form.amountMinor;
  return {
    id: newId(),
    user_id: form.userId,
    account_id: form.accountId,
    asset_id: form.assetId,
    amount_minor: Number(signed),
    type: form.type,
    description: form.description,
    category_ids: form.categoryIds,
    date: form.date.getTime(),
    created_at: ts,
    updated_at: ts,
  };
}

export function buildUndoTombstone(
  row: Record<string, unknown>,
  now: Date = new Date(),
): Record<string, unknown> {
  const ts = now.getTime();
  return {
    ...row,
    deleted_at: ts,
    updated_at: ts,
  };
}