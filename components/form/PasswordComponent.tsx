import React, { useEffect, useState } from "react";
import { IconX, IconCheck, IconLock } from "@tabler/icons-react";
import { PasswordInput, Progress, Text, Popover, Box } from "@mantine/core";
import { UseFormRegister } from "react-hook-form";
import { AuthFormProps } from "./AuthForm";

function PasswordRequirement({
  meets,
  label,
}: {
  meets: boolean;
  label: string;
}) {
  return (
    <Text
      color={meets ? "teal" : "red"}
      sx={{ display: "flex", alignItems: "center" }}
      mt={7}
      size="sm"
    >
      {meets ? <IconCheck size={14} /> : <IconX size={14} />}{" "}
      <Box ml={10}>{label}</Box>
    </Text>
  );
}

const requirements = [
  { re: /\d/, label: "Includes number" },
  { re: /[a-z]/, label: "Includes lowercase letter" },
  { re: /[A-Z]/, label: "Includes uppercase letter" },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: "Includes special symbol" },
];

function getStrength(password: string) {
  let multiplier = password.length > 5 ? 0 : 1;

  requirements.forEach((requirement) => {
    if (!requirement.re.test(password)) {
      multiplier += 1;
    }
  });

  return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 10);
}

export default function PasswordComponent({
  register,
  value,
  setStrength,
  passwordError,
}: {
  register: UseFormRegister<AuthFormProps>;
  value: string;
  setStrength: (strength: number) => void;
  passwordError: boolean;
}) {
  const [popoverOpened, setPopoverOpened] = useState(false);
  const checks = requirements.map((requirement) => (
    <PasswordRequirement
      key={requirement.label}
      label={requirement.label}
      meets={requirement.re.test(value)}
    />
  ));

  const strength = getStrength(value);

  useEffect(() => {
    setStrength(strength);
  }, [setStrength, strength]);

  let color;
  if (strength == 100) {
    color = "teal";
  } else if (strength > 50) {
    color = "yellow";
  } else {
    color = "red";
  }

  return (
    <Popover
      opened={popoverOpened}
      position="bottom"
      width="target"
      transitionProps={{
        transition: "scale-y",
      }}
    >
      <Popover.Target>
        <div
          onFocusCapture={() => setPopoverOpened(true)}
          onBlurCapture={() => setPopoverOpened(false)}
        >
          <PasswordInput
            withAsterisk
            autoComplete="new-password"
            label="Password: "
            placeholder="Password"
            value={value}
            icon={<IconLock size={15} />}
            {...register("password")}
            error={
              passwordError ? "Password is not secure enough yet." : undefined
            }
          />
        </div>
      </Popover.Target>
      <Popover.Dropdown>
        <Progress
          color={color}
          value={strength}
          size={5}
          style={{ marginBottom: 10 }}
        />
        <PasswordRequirement
          label="Includes at least 6 characters"
          meets={value.length > 5}
        />
        {checks}
      </Popover.Dropdown>
    </Popover>
  );
}
