"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { PrivacyToggle } from "@/components/PrivacyToggle";
import { useResponsive } from "@/lib/hooks/useResponsive";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function DashboardHeader() {
  const { user } = useAuth();
  const { isMobile } = useResponsive();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">
          {getGreeting()}
          {user?.username ? `, ${user.username}` : ""}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{formatToday()}</p>
      </div>
      {!isMobile && <PrivacyToggle />}
    </div>
  );
}
