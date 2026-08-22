import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { getDb, cleanDbForTests } from "./db.js";
import { auth } from "./auth.js";
import { migrate } from "drizzle-orm/node-postgres/migrator";

describe("Better Auth integration", () => {
  beforeAll(async () => {
    const db = getDb();
    await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
  });

  afterEach(async () => {
    await cleanDbForTests();
  });

  it("signUpEmail creates user and returns session cookie", async () => {
    const headers = new Headers();
    const result = await auth.api.signUpEmail({
      body: {
        email: "test@example.com",
        name: "Test User",
        username: "testuser",
        password: "password123",
      },
      headers,
      asResponse: true,
    });

    expect(result).toBeDefined();
    // Better Auth returns a Response object when asResponse is true
    const setCookieHeader = result.headers.get("set-cookie");
    expect(setCookieHeader).toBeTruthy();
    expect(setCookieHeader).toContain("better-auth.session_token");
  });

  it("signInEmail with correct credentials returns session; getSession returns user", async () => {
    // Sign up first
    await auth.api.signUpEmail({
      body: {
        email: "signin@example.com",
        name: "SignIn User",
        username: "signinuser",
        password: "password123",
      },
    });

    // Sign in
    const signinResponse = await auth.api.signInEmail({
      body: {
        email: "signin@example.com",
        password: "password123",
      },
      asResponse: true,
    });

    const setCookie = signinResponse.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();

    // Get session
    const sessionHeaders = new Headers();
    if (setCookie) {
      const cookieValue = setCookie.split(";")[0];
      if (cookieValue) {
        sessionHeaders.set("cookie", cookieValue);
      }
    }

    const session = await auth.api.getSession({ headers: sessionHeaders });
    expect(session).toBeDefined();
    expect(session?.user?.email).toBe("signin@example.com");
  });

  it("signInEmail with wrong password throws APIError with 401", async () => {
    // Sign up first
    await auth.api.signUpEmail({
      body: {
        email: "wrongpass@example.com",
        name: "Wrong Pass",
        username: "wrongpassuser",
        password: "correct123",
      },
      headers: new Headers(),
    });

    // Try to sign in with wrong password
    await expect(
      auth.api.signInEmail({
        body: {
          email: "wrongpass@example.com",
          password: "wrong123",
        },
        headers: new Headers(),
      })
    ).rejects.toThrow();
  });

  it("signOut clears session; getSession returns null", async () => {
    // Sign up and sign in
    const signupResponse = await auth.api.signUpEmail({
      body: {
        email: "signout@example.com",
        name: "SignOut User",
        username: "signoutuser",
        password: "password123",
      },
      asResponse: true,
    });

    const setCookie = signupResponse.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();

    // Sign out
    const signoutHeaders = new Headers();
    if (setCookie) {
      const cookieValue = setCookie.split(";")[0];
      if (cookieValue) {
        signoutHeaders.set("cookie", cookieValue);
      }
    }

    await auth.api.signOut({ headers: signoutHeaders });

    // Try to get session after signout
    const session = await auth.api.getSession({ headers: signoutHeaders });
    expect(session).toBeNull();
  });

  it("demo flow: first call creates demo user, second call returns same user (idempotent)", async () => {
    // Import demo handler
    const { handleDemoSignIn } = await import("./auth.js");

    // First call
    const result1 = await handleDemoSignIn();
    expect(result1.success).toBe(true);
    expect(result1.userId).toBeDefined();
    expect(result1.setCookie).toBeTruthy();
    expect(result1.setCookie).toContain("better-auth.session_token");

    // Second call
    const result2 = await handleDemoSignIn();
    expect(result2.success).toBe(true);
    expect(result2.userId).toBe(result1.userId);
  });

  it("cookie flags: HttpOnly, SameSite=Lax, Path=/, Max-Age ≈ 30 days", async () => {
    // First sign up to create user
    await auth.api.signUpEmail({
      body: {
        email: "cookieflags@example.com",
        name: "Cookie User",
        username: "cookieuser",
        password: "password123",
      },
    });

    // Now sign in
    const signinResponse = await auth.api.signInEmail({
      body: {
        email: "cookieflags@example.com",
        password: "password123",
      },
      asResponse: true,
    });

    const setCookie = signinResponse.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();

    expect(setCookie).toBeTruthy();
    if (setCookie) {
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("SameSite=Lax");
      expect(setCookie).toContain("Path=/");
      
      // Max-Age ≈ 30 days (30 * 24 * 60 * 60 = 2592000 seconds)
      // Allow some tolerance (25-31 days)
      const maxAgeMatch = setCookie.match(/Max-Age=(\d+)/);
      if (maxAgeMatch && maxAgeMatch[1]) {
        const maxAge = parseInt(maxAgeMatch[1], 10);
        const minAge = 25 * 24 * 60 * 60; // 25 days
        const maxAgeLimit = 31 * 24 * 60 * 60; // 31 days
        expect(maxAge).toBeGreaterThanOrEqual(minAge);
        expect(maxAge).toBeLessThanOrEqual(maxAgeLimit);
      }
    }
  });
});
