"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Landmark, Bitcoin, Settings, Menu, X } from "lucide-react";
import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PrivacyToggle } from "@/components/PrivacyToggle";
import { ScreenReaderAnnouncer } from "@/components/ScreenReaderAnnouncer";
import { useResponsive } from "@/lib/hooks/useResponsive";
import { useSessionTimeout } from "@/lib/hooks/useSessionTimeout";
import { useAuth } from "@/lib/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/banks", label: "Banks", icon: Landmark },
  { href: "/dashboard/crypto", label: "Crypto", icon: Bitcoin },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: Readonly<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed?: boolean;
}>) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function DesktopSidebar({ collapsed }: Readonly<{ collapsed: boolean }>) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar md:flex",
        collapsed ? "w-[176px]" : "w-[240px]",
      )}
      aria-label="Main navigation"
    >
      <div className="flex h-[60px] items-center px-4">
        <Link href="/dashboard" className="text-lg font-bold text-sidebar-foreground">
          Funds
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname === item.href}
            collapsed={false}
          />
        ))}
      </nav>
    </aside>
  );
}

function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-40 flex h-[60px] items-center justify-between border-b border-border bg-background px-4 md:hidden"
        role="banner"
      >
        <Link href="/dashboard" className="text-lg font-bold">
          Funds
        </Link>

        <div className="flex items-center gap-2">
          <PrivacyToggle />

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-x-0 top-[60px] z-30 border-b border-border bg-background p-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile menu">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={pathname === item.href}
              />
            ))}
          </nav>
        </div>
      )}
    </>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-[60px] items-center justify-around border-t border-border bg-background md:hidden"
      role="navigation"
      aria-label="Bottom navigation"
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1 text-xs transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <item.icon className="size-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { isMobile, isTablet } = useResponsive();
  const { logout } = useAuth();
  const sidebarCollapsed = isTablet;

  // Auto-logout after 30 minutes of inactivity (Requirement 17.8)
  useSessionTimeout(logout);

  return (
    <ProtectedRoute>
      <ScreenReaderAnnouncer />
      {isMobile ? (
        <>
          <MobileHeader />
          <main className="min-h-screen pt-[60px] pb-[60px]">{children}</main>
          <MobileBottomNav />
        </>
      ) : (
        <>
          <DesktopSidebar collapsed={sidebarCollapsed} />
          <main className={cn("min-h-screen", sidebarCollapsed ? "ml-[176px]" : "ml-[240px]")}>
            {children}
          </main>
        </>
      )}
    </ProtectedRoute>
  );
}
