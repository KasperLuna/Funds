import clsx from "clsx";
import { EyeOff, Eye } from "lucide-react";
import { Button } from "./ui/button";
import { usePrivacy } from "@/hooks/usePrivacy";

interface PrivacyToggleProps {
  showText?: boolean;
}

export const PrivacyToggle = ({ showText = false }: PrivacyToggleProps) => {
  const { isPrivate, togglePrivacy } = usePrivacy();
  return (
    <Button
      onClick={() => {
        togglePrivacy();
      }}
      className={clsx("px-2 border-2 hover:border-slate-600 rounded-lg", {
        "border-blue-800": isPrivate,
        "border-red-700": !isPrivate,
      })}
    >
      {isPrivate ? <EyeOff /> : <Eye />}
      {showText && (
        <span className="ml-2">{isPrivate ? "Privacy On" : "Privacy Off"}</span>
      )}
    </Button>
  );
};
