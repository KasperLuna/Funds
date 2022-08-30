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
import { useLiveQuery } from "dexie-react-hooks";
import React, { useState } from "react";
import { db } from "../../utils/db";
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
  const banks = useLiveQuery(async () => {
    return db.banks.toArray();
  });

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
  const [bankName, setBankName] = useState<string>("");
  const [opened, setOpened] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const theme = useMantineTheme();

  const onSubmit = () => {
    if (bankName.length == 0) {
      setIsError(true);
      return;
    }
    db.banks
      .put({ name: bankName, balance: 0, primaryColor: "", secondaryColor: "" })
      .then(() => {
        showSuccessNotif("New bank added.");
        setOpened(false);
      })
      .catch(() => {
        showErrorNotif();
      });
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
          value={bankName}
          onChange={(e) => {
            setIsError(false);
            setBankName(e.target.value);
          }}
          variant="default"
          error={isError}
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
            <Button onClick={() => onSubmit()} size="sm">
              Add
            </Button>
          </Group>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
};

export { BankInput };
