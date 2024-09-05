import { useState } from "react";
import { PrivacyModeContext } from "../context/PrivacyModeContext";

export function PrivacyModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isPrivacyModeEnabled, setIsPrivacyModeEnabled] = useState(true);
  return (
    <PrivacyModeContext.Provider
      value={{
        isPrivacyModeEnabled,
        togglePrivacyMode: () => setIsPrivacyModeEnabled(!isPrivacyModeEnabled),
      }}
    >
      {children}
    </PrivacyModeContext.Provider>
  );
}
