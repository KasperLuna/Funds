import { useState, useEffect, useCallback } from "react";

type Breakpoint = "mobile" | "tablet" | "desktop";

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: Breakpoint;
}

const MOBILE_QUERY = "(max-width: 767px)";
const TABLET_QUERY = "(min-width: 768px) and (max-width: 1024px)";
const DESKTOP_QUERY = "(min-width: 1025px)";

function getBreakpoint(mobile: boolean, tablet: boolean): Breakpoint {
  if (mobile) return "mobile";
  if (tablet) return "tablet";
  return "desktop";
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === "undefined") {
      return { isMobile: false, isTablet: false, isDesktop: true, breakpoint: "desktop" };
    }

    const mobile = window.matchMedia(MOBILE_QUERY).matches;
    const tablet = window.matchMedia(TABLET_QUERY).matches;
    const breakpoint = getBreakpoint(mobile, tablet);

    return {
      isMobile: mobile,
      isTablet: tablet,
      isDesktop: !mobile && !tablet,
      breakpoint,
    };
  });

  const update = useCallback(() => {
    const mobile = window.matchMedia(MOBILE_QUERY).matches;
    const tablet = window.matchMedia(TABLET_QUERY).matches;
    const breakpoint = getBreakpoint(mobile, tablet);

    setState({
      isMobile: mobile,
      isTablet: tablet,
      isDesktop: !mobile && !tablet,
      breakpoint,
    });
  }, []);

  useEffect(() => {
    const mobileMql = window.matchMedia(MOBILE_QUERY);
    const tabletMql = window.matchMedia(TABLET_QUERY);
    const desktopMql = window.matchMedia(DESKTOP_QUERY);

    const handler = () => update();

    mobileMql.addEventListener("change", handler);
    tabletMql.addEventListener("change", handler);
    desktopMql.addEventListener("change", handler);

    return () => {
      mobileMql.removeEventListener("change", handler);
      tabletMql.removeEventListener("change", handler);
      desktopMql.removeEventListener("change", handler);
    };
  }, [update]);

  return state;
}
