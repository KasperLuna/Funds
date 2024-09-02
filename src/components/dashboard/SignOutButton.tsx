"use client";
import { LogOutIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const SignOutButton = ({ className }: { className?: string }) => {
  const router = useRouter();
  return (
    <Button
      className={cn("flex gap-2 flex-row  bg-black w-full", className)}
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
