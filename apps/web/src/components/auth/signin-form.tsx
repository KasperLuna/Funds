"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const inputCls =
  "h-11 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus-visible:ring-2 focus-visible:ring-(--accent)";

export function SignInForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleGoogle() {
    setError(null);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Invalid email or password");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-500">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-500">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className={inputCls}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-(--danger)">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
      {googleEnabled && (
        <Button type="button" variant="outline" onClick={() => void handleGoogle()}>
          <GoogleG aria-hidden />
          Continue with Google
        </Button>
      )}
    </form>
  );
}

function GoogleG({ ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}