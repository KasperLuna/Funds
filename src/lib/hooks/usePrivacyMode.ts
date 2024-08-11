import { useContext } from "react";
import { PrivacyModeContext } from "../context/PrivacyModeContext";

export const usePrivacyMode = () => useContext(PrivacyModeContext);
