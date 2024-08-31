import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import clsx from "clsx";
import { EyeOff, Eye } from "lucide-react";
import { Button } from "./ui/button";

export const PrivacyToggle = () => {
  const { isPrivacyModeEnabled, togglePrivacyMode } = usePrivacyMode();
  return (
    <Button
      onClick={() => {
        togglePrivacyMode();
      }}
      className={clsx("px-2 border-2 hover:border-slate-600 rounded-lg", {
        "border-blue-600": isPrivacyModeEnabled,
        "border-red-500": !isPrivacyModeEnabled,
      })}
    >
      {isPrivacyModeEnabled ? <EyeOff /> : <Eye />}
    </Button>
  );
};
