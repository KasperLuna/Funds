import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import clsx from "clsx";
import { EyeOff, Eye } from "lucide-react";
import { Button } from "./ui/button";

interface PrivacyToggleProps {
  showText?: boolean;
}

export const PrivacyToggle = ({ showText = false }: PrivacyToggleProps) => {
  const { isPrivacyModeEnabled, togglePrivacyMode } = usePrivacyMode();
  return (
    <Button
      onClick={() => {
        togglePrivacyMode();
      }}
      className={clsx("px-2 border-2 hover:border-slate-600 rounded-lg", {
        "border-blue-800": isPrivacyModeEnabled,
        "border-red-700": !isPrivacyModeEnabled,
      })}
    >
      {isPrivacyModeEnabled ? <EyeOff /> : <Eye />}
      {showText && (
        <span className="ml-2">
          {isPrivacyModeEnabled ? "Privacy On" : "Privacy Off"}
        </span>
      )}
    </Button>
  );
};
