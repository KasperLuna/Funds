import {
  ActionIcon,
  Anchor,
  Button,
  Group,
  Popover,
  TextInput,
  useMantineTheme,
  Text,
  Select,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Bank } from "../../utils/db";
import { createBank } from "../../firebase/queries";
import { useAuth } from "../config/AuthContext";
import { showErrorNotif, showSuccessNotif } from "../../utils/notifs";
import { useBanksCategsContext } from "../banks/BanksCategoryContext";

type BankInputProps = {
  onChange: any; //(e: React.ChangeEvent<HTMLSelectElement>) => void;
  value: string;
  groupStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  isError?: boolean;
  label?: string;
  filter?: string;
};

const BankInput = React.forwardRef(
  (
    {
      onChange,
      value,
      groupStyle,
      inputStyle,
      isError,
      label = "Bank: ",
      filter,
    }: BankInputProps,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ref: React.Ref<HTMLSelectElement>
  ): JSX.Element => {
    const { bankData } = useBanksCategsContext();
    const { banks } = bankData || { banks: [] };
    const filteredBanks = banks?.filter(
      (bank) => bank.name.toLowerCase() != filter?.toLowerCase()
    );

    const placeholderItem = [
      {
        label: "Select a bank",
        value: "",
        disabled: true,
      },
    ];

    return (
      <Group noWrap spacing={0} style={{ ...groupStyle }}>
        <Select
          data={
            placeholderItem.concat(
              filteredBanks?.map((bank) => ({
                value: bank.name,
                label: bank.name,
                disabled: false,
              }))
            ) || placeholderItem
          }
          // ref={ref}
          style={{ width: "100%", borderTopRightRadius: 0, ...inputStyle }}
          onChange={onChange}
          value={value}
          label={label}
          radius={0}
          withAsterisk
          error={isError}
        />
        <AddBankButton />
      </Group>
    );
  }
);

export const AddBankButton = ({
  variant = "AddIcon",
}: {
  variant?: "AddIcon" | "Settings";
}) => {
  const { user } = useAuth();
  const [opened, setOpened] = useState<boolean>(false);

  const theme = useMantineTheme();

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<Bank>({
    defaultValues: { balance: 0 },
  });

  const onSubmit = async (data: Bank) => {
    try {
      const newBank = {
        userId: user?.uid || "",
        ...data,
      };
      await createBank(newBank);
      showSuccessNotif(`${data.name} added to banks.`);
      setOpened(false);
      reset();
    } catch {
      showErrorNotif();
    }
  };

  return (
    <Popover
      opened={opened}
      onClose={() => setOpened(false)}
      position={variant == "AddIcon" ? "top-end" : "top-start"}
      withArrow
      transition="pop-bottom-right"
      withinPortal
    >
      <Popover.Target>
        {variant === "AddIcon" ? (
          <ActionIcon
            variant={theme.colorScheme === "dark" ? "default" : "light"}
            style={{
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              width: 15,
              height: 36,
              alignSelf: "end",
            }}
            onClick={() => setOpened((o) => !o)}
          >
            <IconPlus size={16} stroke={1.5} />
          </ActionIcon>
        ) : (
          <Button
            variant="subtle"
            leftIcon={<IconPlus size={"15px"} />}
            color="gray"
            onClick={() => setOpened((o) => !o)}
          >
            <Text size={"sm"}>Add Bank</Text>
          </Button>
        )}
      </Popover.Target>
      <Popover.Dropdown>
        <TextInput
          required
          label="Bank"
          placeholder="BDO"
          sx={{ width: "250px" }}
          description="Add the name of a bank, you can customize this with colors later in bank settings."
          {...register("name", { required: true })}
          variant="default"
          error={errors.name?.message}
        />
        <Group position="apart" style={{ marginTop: 10 }}>
          <Anchor
            component="button"
            color="teal"
            size="sm"
            onClick={() => setOpened(false)}
          >
            Cancel
          </Anchor>

          <Group spacing={"xs"}>
            <Button onClick={() => handleSubmit(onSubmit)()} size="sm">
              Add
            </Button>
          </Group>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
};

export { BankInput };
