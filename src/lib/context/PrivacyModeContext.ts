import { createContext } from "react";

export type PrivacyModeContextType = {
  isPrivacyModeEnabled: boolean;
  togglePrivacyMode: () => void;
};
export const PrivacyModeContext = createContext<PrivacyModeContextType>({
  isPrivacyModeEnabled: false,
  togglePrivacyMode: () => {},
});
