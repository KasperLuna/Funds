"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type PrivacyContextValue = {
  masked: boolean;
  toggle: () => void;
};

const PrivacyContext = createContext<PrivacyContextValue>({
  masked: true,
  toggle: () => {},
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [masked, setMasked] = useState(true);
  const toggle = useCallback(() => setMasked((m) => !m), []);
  const value = useMemo(() => ({ masked, toggle }), [masked, toggle]);
  return (
    <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
