"use client";

import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { signInWithGoogle } from "@/lib/auth";
import { pb } from "@/lib/pocketbase/pocketbase";
import { ArrowRight } from "lucide-react";

export const SignInButton = ({ children }: { children?: React.ReactNode }) => {
  const router = useRouter();

  const handleSignIn = async () => {
    const isSignedIn = !!pb.authStore.model;

    if (isSignedIn) {
      router.push("/dashboard");
      return;
    }

    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
    } finally {
      router.push("/dashboard");
    }
  };
  return (
    <Button
      size="lg"
      className="bg-white text-black hover:bg-zinc-200"
      onClick={handleSignIn}
    >
      {children || (
        <>
          Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
};
