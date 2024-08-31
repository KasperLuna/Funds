"use client";
import { LogOutIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";

export const SignOutButton = () => {
  const router = useRouter();
  return (
    <Button
      className="flex gap-2 flex-row  bg-black w-full"
      onClick={async () => {
        signOut();
        router.push("/");
      }}
    >
      <LogOutIcon className="w-4 h-8 " />
      Sign Out
    </Button>
  );
};
