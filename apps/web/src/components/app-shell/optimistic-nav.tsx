"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLinkStatus } from "next/link";

type NavContextValue = {
  pendingHref: string | null;
  setPendingHref: (href: string | null) => void;
};

const NavContext = createContext<NavContextValue>({
  pendingHref: null,
  setPendingHref: () => {},
});

export function NavProvider({ children }: { children: ReactNode }) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (pendingHref == null) return;
    const target = pendingHref.split(/[?#]/)[0]!;
    const current = pathname.split(/[?#]/)[0]!;
    if (target === current) setPendingHref(null);
  }, [pathname, pendingHref]);

  return (
    <NavContext.Provider value={{ pendingHref, setPendingHref }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNavPending() {
  return useContext(NavContext).pendingHref;
}

function pathOf(href: string) {
  return href.split(/[?#]/)[0]!;
}

function isLinkActive(href: string, pathname: string, pending: string | null): boolean {
  const target = pathOf(href);
  const effective = pending ? pathOf(pending) : pathname;
  if (target === "/dashboard") return effective === "/dashboard";
  return effective === target || effective.startsWith(target + "/");
}

export function useLinkActive(href: string): boolean {
  const pathname = usePathname();
  const pending = useNavPending();
  return isLinkActive(href, pathname, pending);
}

export function NavStatusReporter({ href }: { href: string }) {
  const { pending } = useLinkStatus();
  const { setPendingHref } = useContext(NavContext);
  useEffect(() => {
    if (pending) setPendingHref(href);
  }, [pending, href, setPendingHref]);
  return null;
}

export function useOptimisticNavigate() {
  const router = useRouter();
  const { setPendingHref } = useContext(NavContext);
  return useCallback(
    (href: string, opts?: { replace?: boolean; scroll?: boolean }) => {
      setPendingHref(href);
      if (opts?.replace) {
        router.replace(href, { scroll: opts.scroll ?? false });
      } else {
        router.push(href, { scroll: opts?.scroll ?? false });
      }
    },
    [router, setPendingHref],
  );
}
