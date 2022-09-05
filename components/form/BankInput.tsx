import {
  ActionIcon,
  Anchor,
  Button,
  Group,
  NativeSelect,
  Popover,
  TextInput,
  useMantineTheme,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Bank } from "../../utils/db";
import { createBank, useBanksQuery } from "../../firebase/queries";
import { useAuth } from "../config/AuthContext";
import { showErrorNotif, showSuccessNotif } from "../../utils/notifs";

type BankInputProps = {
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  value: string;
  groupStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  isError?: boolean;
  label?: string;
  filter?: string;
};

const BankInput = ({
  onChange,
  value,
  groupStyle,
  inputStyle,
  isError,
  label = "Bank: ",
  filter,
}: BankInputProps): JSX.Element => {
  const { user } = useAuth();
  const { banks } = useBanksQuery(user?.uid);
  const filteredBanks = banks?.filter(
    (bank) => bank.name.toLowerCase() != filter?.toLowerCase()
  );

  return (
    <Group noWrap spacing={0} style={{ ...groupStyle }}>
      <NativeSelect
        data={
          filteredBanks?.map((bank) => ({
            value: bank.name,
            label: bank.name,
          })) || []
        }
        placeholder="Pick one"
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
};

const AddBankButton = () => {
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
      position="top-end"
      withArrow
      transition="pop-bottom-right"
      withinPortal
    >
      <Popover.Target>
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
      </Popover.Target>
      <Popover.Dropdown>
        <TextInput
          required
          label="Bank"
          placeholder="BDO"
          sx={{ width: "250px" }}
          description="Add the name of a bank, you can customize this with colors later in app settings."
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
