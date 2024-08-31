"use client";

import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { signInWithGoogle } from "@/lib/auth";
import { pb } from "@/lib/pocketbase/pocketbase";

export const SignupCluster = () => {
  const router = useRouter();
  return (
    <Button
      onClick={async () => {
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
      }}
    >
      Login with Google
    </Button>
  );
};
