"use client";

import { useRouter } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
} from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

let clientInstance: QueryClient | null = null;
function getClient(): QueryClient {
  if (!clientInstance) {
    clientInstance = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
  }
  return clientInstance;
}

class DemoError extends Error {
  constructor(public code: "rate-limit" | "unknown") {
    super(
      code === "rate-limit"
        ? "Too many attempts"
        : "Something went wrong. Please try again.",
    );
  }
}

async function callDemo(): Promise<void> {
  const res = await fetch("/api/auth/demo");
  if (res.status === 429) throw new DemoError("rate-limit");
  if (!res.ok) throw new DemoError("unknown");
}

const DemoButtonInner = () => {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: callDemo,
    onSuccess: () => {
      router.push("/dashboard");
      router.refresh();
    },
  });

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? "Signing in…" : "Try the demo"}
      </Button>
      {mutation.isError && (
        <p role="alert" className="text-sm text-(--danger)">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
};

export const DemoButton = () => (
  <QueryClientProvider client={getClient()}>
    <DemoButtonInner />
  </QueryClientProvider>
);
