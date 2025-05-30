"use client";
import { LogOutIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export const SignOutButton = ({ className }: { className?: string }) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  return (
    <Button
      className={cn("flex gap-2 flex-row  bg-black w-full", className)}
      onClick={async () => {
        signOut();
        router.push("/");
        queryClient.clear();
      }}
    >
      <LogOutIcon className="w-4 h-8 " />
      Sign Out
    </Button>
  );
};
