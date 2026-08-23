import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "./db.js";
import { eq } from "drizzle-orm";
import * as schema from "@funds/db/schema";

// cavetail: demo-only credentials
const DEMO_PASSWORD = "demo123456";
const DEMO_EMAIL = "demo@funds.local";

export const auth = betterAuth({
  // Deterministic callback URLs. Without this, Better Auth infers the base
  // from the request origin, so Google's `redirect_uri` (which must match an
  // Authorized redirect URI exactly) could silently differ from what the
  // Google Cloud Console allows.
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.authSessions,
      account: schema.authAccounts,
      verification: schema.authVerifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  account: {
    // Migrated PocketBase users exist in `users` with no password. Enabling
    // account linking lets a Google sign-in claim the migrated user whose
    // email matches, so the imported data surfaces on that login instead of
    // creating a separate empty account.
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        },
      }
    : {}),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    cookieCache: {
      enabled: true,
      maxAge: 300, // 5 minutes
    },
  },
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me",
  trustedOrigins: process.env.PUBLIC_APP_URL
    ? [process.env.PUBLIC_APP_URL]
    : ["http://localhost:3000"],
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: true,
        defaultValue: "",
      },
      baseAssetId: {
        type: "string",
        required: false,
      },
      timezone: {
        type: "string",
        required: false,
      },
      voiceApiKeyHash: {
        type: "string",
        required: false,
      },
    },
  },
  basePath: "/api/auth",
});

// cavetail: demo sign-in handler (idempotent). Status-based, no message sniffing.
async function attemptSignUp(): Promise<Response | null> {
  try {
    return await auth.api.signUpEmail({
      body: {
        email: DEMO_EMAIL,
        name: "Demo User",
        username: "demo",
        password: DEMO_PASSWORD,
      },
      asResponse: true,
    });
  } catch {
    return null;
  }
}

async function attemptSignIn(): Promise<Response | null> {
  try {
    return await auth.api.signInEmail({
      body: {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      },
      asResponse: true,
    });
  } catch {
    return null;
  }
}

async function demoResult(res: Response | null): Promise<{
  success: boolean;
  userId?: string;
  setCookie?: string;
  error?: string;
}> {
  if (!res || !res.ok) {
    return { success: false, error: "demo sign-in failed" };
  }
  const body = (await res.json()) as { user: { id: string } };
  return {
    success: true,
    userId: body.user.id,
    setCookie: res.headers.get("set-cookie") ?? undefined,
  };
}

export async function handleDemoSignIn(): Promise<{
  success: boolean;
  userId?: string;
  setCookie?: string;
  error?: string;
}> {
  // 1) Try signup (fresh demo user)
  const created = await demoResult(await attemptSignUp());
  if (created.success) return created;

  // 2) Email exists -> sign in (idempotent path)
  const signedIn = await demoResult(await attemptSignIn());
  if (signedIn.success) return signedIn;

  // 3) Sign-in failed (e.g. seeded demo user has no password) -> self-heal: drop demo user rows, retry signup
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, DEMO_EMAIL))
    .limit(1)
    .then((rows) => rows[0]);
  if (existing) {
    await db.delete(schema.authSessions).where(eq(schema.authSessions.userId, existing.id));
    await db.delete(schema.authAccounts).where(eq(schema.authAccounts.userId, existing.id));
    await db.delete(schema.users).where(eq(schema.users.id, existing.id));
  }
  return demoResult(await attemptSignUp());
}
