/**
 * Voice API key router: lets a signed-in user provision the bearer credential
 * that external automations (Siri Shortcuts) use on POST /api/voice/webhook.
 * Only the sha256 hash is stored; the plaintext is returned once on generate.
 */
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { users } from "@funds/db/schema";
import { protectedProcedure, router } from "../trpc.js";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export const voiceKeyRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ hash: users.voiceApiKeyHash })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);
    return { configured: Boolean(rows[0]?.hash) };
  }),

  generate: protectedProcedure.mutation(async ({ ctx }) => {
    const apiKey = randomBytes(24).toString("hex");
    await ctx.db
      .update(users)
      .set({ voiceApiKeyHash: hashKey(apiKey) })
      .where(eq(users.id, ctx.user.id));
    return { apiKey };
  }),

  revoke: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(users)
      .set({ voiceApiKeyHash: null })
      .where(eq(users.id, ctx.user.id));
    return { ok: true };
  }),
});
