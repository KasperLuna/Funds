import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/signin-form";
import { DemoButton } from "@/components/auth/demo-button";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 mb-4 text-sm text-slate-400">Welcome back</p>
        <SignInForm />
        <div className="mt-5 flex items-center gap-3 text-xs text-slate-400">
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