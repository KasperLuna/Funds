import { createContext } from "react";

export type PrivacyModeContextType = {
  isPrivate: boolean;
  togglePrivacyMode: () => void;
};
export const PrivacyModeContext = createContext<PrivacyModeContextType>({
  isPrivate: false,
  togglePrivacyMode: () => {},
});
