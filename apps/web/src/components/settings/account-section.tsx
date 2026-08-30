"use client";

import { UserCard } from "@/components/auth/user-card";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const AccountSection = () => {
  return (
    <>
      <UserCard />
      <SignOutButton />
    </>
  );
};
