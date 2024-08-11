"use client";

import { Link, LogOutIcon } from "lucide-react";
import { Button } from "../ui/button";
import { signOut } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";

export const SignOutButton = () => {
  const router = useRouter();
  return (
    <Button
      className="flex gap-2 flex-row  bg-black w-full"
      onClick={() => {
        signOut();
        router.push("/");
      }}
    >
      <LogOutIcon className="w-4 h-8 " />
      Sign Out
    </Button>
  );
};
