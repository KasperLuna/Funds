import React from "react";
import { Button } from "@mantine/core";
import { IconEyeOff, IconEye } from "@tabler/icons-react";
import { usePrivacyMode } from "../../utils/helpers";

export const PrivacyModeButton = () => {
  const { privacyMode, setPrivacyMode } = usePrivacyMode();
  return (
    <Button
      variant="outline"
      radius={"xl"}
      size={"xs"}
      onClick={() => {
        setPrivacyMode(!privacyMode);
      }}
      leftIcon={privacyMode ? <IconEyeOff /> : <IconEye />}
    >
      {privacyMode ? "Show" : "Hide"}
    </Button>
  );
};
