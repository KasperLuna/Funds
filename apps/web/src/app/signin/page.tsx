import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/signin-form";
import { DemoButton } from "@/components/auth/demo-button";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  const googleEnabled = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="guilloche absolute inset-0 opacity-40" aria-hidden />
      <div className="relative w-full max-w-sm rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-7">
        <h1 className="font-display text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-1 mb-5 text-sm text-zinc-500">Welcome back</p>
        <SignInForm googleEnabled={googleEnabled} />
        <div className="mt-5 flex items-center gap-3 text-xs text-zinc-500">
          <span className="h-px flex-1 bg-(--border)" aria-hidden />
          or try the demo
          <span className="h-px flex-1 bg-(--border)" aria-hidden />
        </div>
        <div className="mt-4">
          <DemoButton />
        </div>
      </div>
    </main>
  );
}
