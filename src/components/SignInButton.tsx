"use client";

import { Button } from "./ui/button";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import React from "react";

export const SignInButton = () => {
  const router = useRouter();
  const handleSignIn = () => {
    signInWithGoogle().then(() => {
      router.push("/dashboard");
    });
  };

  return (
    <Button className="bg-orange-500 w-fit" onClick={handleSignIn}>
      Get Started
    </Button>
  );
};
