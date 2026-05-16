import PocketBase from "pocketbase";

/**
 * Create a voice draft record in PocketBase.
 * If a `pb` instance is provided it will be used; otherwise the function
 * will create a short-lived admin PocketBase client using env creds.
 */
export async function createVoiceDraft(
  draft: any,
  ttlSeconds = 300,
  pb?: PocketBase,
): Promise<string> {
  const token =
    typeof crypto !== "undefined" && (crypto as any).randomUUID
      ? (crypto as any).randomUUID()
      : Math.random().toString(36).slice(2, 10);

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  let localPb = pb;
  let createdLocal = false;
  if (!localPb) {
    localPb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || "");
    await localPb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || "",
      process.env.POCKETBASE_ADMIN_PASSWORD || "",
    );
    createdLocal = true;
  }

  const payload: any = {
    token,
    preview:
      typeof draft.preview === "string"
        ? draft.preview
        : JSON.stringify(draft.preview ?? {}),
    source: draft.source || "shortcut",
    user: draft.userId || draft.user || null,
    createdAt: draft.createdAt || new Date().toISOString(),
    expiresAt,
  };

  await localPb.collection("voice_drafts").create(payload, {
    requestKey: null,
  });

  // don't attempt to explicitly clear auth store here — the short-lived
  // client will be garbage-collected. Return the generated token.
  return token;
}

/**
 * Fetch a draft by token from PocketBase; returns parsed `preview` field.
 */
export async function getVoiceDraft(
  token: string,
  pb?: PocketBase,
): Promise<any | null> {
  let localPb = pb;
  if (!localPb) {
    localPb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || "");
    await localPb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || "",
      process.env.POCKETBASE_ADMIN_PASSWORD || "",
    );
  }

  const resp = await localPb
    .collection("voice_drafts")
    .getList(1, 1, { filter: `token="${token}"` });
  const rec = resp.items?.[0];
  if (!rec) return null;

  // if expired, remove and return null
  if (rec.expiresAt && new Date(rec.expiresAt).getTime() < Date.now()) {
    try {
      await localPb.collection("voice_drafts").delete(rec.id, {
        requestKey: null,
      });
    } catch (e) {
      // ignore delete errors
    }
    return null;
  }

  let preview = rec.preview;
  if (typeof preview === "string") {
    try {
      preview = JSON.parse(preview);
    } catch (e) {
      // leave as string if parse fails
    }
  }

  return {
    id: rec.id,
    token: rec.token,
    preview,
    source: rec.source,
    userId: rec.user,
    createdAt: rec.createdAt,
    expiresAt: rec.expiresAt,
  };
}
