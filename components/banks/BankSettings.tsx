import React, { useEffect, useState } from "react";
import {
  ActionIcon,
  Button,
  ColorInput,
  Divider,
  Group,
  Highlight,
  Menu,
  Modal,
  Popover,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import { IconLayoutGrid, IconSettings, IconTable } from "@tabler/icons";
import { useTxLayout } from "../../utils/helpers";
import { useBanksCategsContext } from "./BanksCategoryContext";
import { Bank } from "../../utils/db";
import {
  deleteBank,
  recomputeBankBalance,
  transferBankTransactions,
} from "../../firebase/queries";
import { useAuth } from "../config/AuthContext";
import { showErrorNotif, showSuccessNotif } from "../../utils/notifs";
import { AddBankButton, BankInput } from "../form/BankInput";

export const BankSettings = () => {
  const [opened, setOpened] = React.useState<boolean>(false);
  const { txLayout, setTxLayout } = useTxLayout();

  const isTableLayout = txLayout === "table";

  const toggleLayoutQuery = () => {
    txLayout === "table" ? setTxLayout("card") : setTxLayout("table");
  };
  return (
    <>
      <Menu withArrow position="bottom-start" shadow={"lg"}>
        <Menu.Target>
          <ActionIcon>
            <IconSettings />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            onClick={() => setOpened(true)}
            icon={<IconSettings size={14} />}
          >
            {"Bank Settings"}
          </Menu.Item>
          <Menu.Item
            onClick={() => toggleLayoutQuery()}
            icon={
              isTableLayout ? (
                <IconLayoutGrid size={14} stroke={1.5} />
              ) : (
                <IconTable size={14} stroke={1.5} />
              )
            }
          >
            {isTableLayout ? "Toggle Card View" : "Toggle Table View"}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Banks Settings"
        centered
      >
        <Tabs orientation="horizontal" defaultValue={"banks"}>
          <Tabs.List grow>
            <Tabs.Tab value="banks">Banks</Tabs.Tab>
            <Tabs.Tab value="categories">Categories</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="banks">
            <BanksPanel />
          </Tabs.Panel>
          <Tabs.Panel value="categories">
            <CategoriesPanel />
          </Tabs.Panel>
        </Tabs>
      </Modal>
    </>
  );
};

const BanksPanel = () => {
  const { bankData } = useBanksCategsContext();
  const { banks } = bankData || {};
  return (
    <Stack sx={{ paddingTop: "20px" }}>
      <Tabs orientation="vertical" defaultValue={banks?.[0]?.name}>
        <Tabs.List>
          {banks?.map((bank) => (
            <Tabs.Tab key={bank.name} value={bank.name}>
              <Text
                sx={{
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "120px",
                }}
              >
                {bank.name}
              </Text>
            </Tabs.Tab>
          ))}
          <AddBankButton variant="Settings" />
        </Tabs.List>

        {banks?.map((bank) => (
          <Tabs.Panel
            key={bank.name}
            value={bank.name}
            sx={(theme) => ({
              padding: theme.spacing.md,
              width: "100%",
            })}
          >
            <Stack spacing={"sm"}>
              <Text size={"md"} weight="bolder">
                {bank.name}
              </Text>
              <ColorInput label="Primary Color: " />
              <ColorInput label="Secondary Color: " />
              <Button>Save</Button>
              <Divider size={"md"} />
              <Text>Danger Zone</Text>
              <RecomputeBalButton bank={bank} />
              <TransferTransactionsButton bank={bank} />
              <DeleteBankButton bank={bank} />
            </Stack>
          </Tabs.Panel>
        ))}
      </Tabs>
    </Stack>
  );
};

const CategoriesPanel = () => {
  const { categoryData } = useBanksCategsContext();
  const { categories } = categoryData || {};
  return (
    <Stack
      spacing="md"
      sx={(theme) => ({
        marginTop: theme.spacing.sm,
      })}
    >
      <Select
        label="Select a category to manage: "
        data={
          categories?.map((category, index) => {
            return {
              label: category.name,
              value: index.toString(),
            };
          }) || []
        }
      />
      <Group position={"center"}>
        <Button>Delete</Button>
        <Button>Rename</Button>
      </Group>
    </Stack>
  );
};

const RecomputeBalButton = ({ bank }: { bank: Bank }) => {
  const { user } = useAuth();
  const [opened, setOpened] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const submitValue = `Recompute ${bank.name}`;

  useEffect(() => {
    if (inputValue === submitValue) {
      recompute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  const recompute = async () => {
    recomputeBankBalance({ userId: user?.uid || "", bankName: bank.name })
      .then(() => {
        setInputValue("");
        showSuccessNotif("Balance Recomputed!");
        setOpened(false);
      })
      .catch(() => {
        showErrorNotif("Failed to transfer transactions, try again.");
      });
  };
  return (
    <Popover
      position="top"
      withArrow
      opened={opened}
      onClose={() => setOpened(false)}
    >
      <Popover.Target>
        <Button
          color="orange"
          radius="lg"
          variant="outline"
          onClick={() => {
            setOpened(!opened);
          }}
        >
          Recompute Balance
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack spacing={0}>
          <Text size="lg" weight={800}>
            {`Recompute ${bank.name} Balance?`}
          </Text>
          <Text size="xs">
            {`Recomputing a bank balance is often unneccessary,
              but may be required if there is potential desync 
              between the transactions you have and the reflected
              balance.`}
          </Text>
          <TextInput
            label={
              <Highlight
                size="xs"
                highlight={`Recompute ${bank.name} `}
                highlightStyles={(theme) => ({
                  backgroundImage: theme.colors.orange[0],
                  fontWeight: 700,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                })}
              >
                {`Type in "Recompute ${bank.name}" to proceed.`}
              </Highlight>
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            disabled={inputValue == submitValue}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};

const TransferTransactionsButton = ({ bank }: { bank: Bank }) => {
  const { user } = useAuth();
  const [opened, setOpened] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<string>("");
  const submitValue = `Transfer ${bank.name} transactions to ${selectedBank}`;

  useEffect(() => {
    if (inputValue === submitValue) {
      transfer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  const transfer = async () => {
    transferBankTransactions({
      userId: user?.uid || "",
      originBank: bank.name,
      destinationBank: selectedBank,
    })
      .then(() => {
        setInputValue("");
        setSelectedBank("");
        showSuccessNotif("Transactions Transferred!");
        setOpened(false);
      })
      .catch(() => {
        showErrorNotif("Failed to transfer transactions, try again.");
      });
  };
  return (
    <Popover
      position="top"
      withArrow
      opened={opened}
      onClose={() => setOpened(false)}
    >
      <Popover.Target>
        <Button
          color="red"
          radius="lg"
          variant="outline"
          onClick={() => {
            setOpened(!opened);
          }}
        >
          Transfer Transactions
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack spacing={0}>
          <Text size="lg" weight={800}>
            {`Transfer ${bank.name} Transactions`}
          </Text>
          <Text size="xs">
            {`Transferring transactions to another bank will typically
            only be performed when you wish to rename the bank the transactions
            are under, or the transactions can be consolidated to another bank.
            This cannot be undone.`}
          </Text>
          <BankInput
            label="Select bank to transfer to: "
            value={selectedBank}
            onChange={(e: any) => setSelectedBank(e.currentTarget.value)}
            filter={bank.name}
          />
          {Boolean(selectedBank) && (
            <TextInput
              label={
                <Highlight
                  size="xs"
                  highlight={`Transfer ${bank.name} transactions to ${selectedBank}`}
                  highlightStyles={(theme) => ({
                    backgroundImage: theme.colors.orange[0],
                    fontWeight: 700,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  })}
                >
                  {`Type in "Transfer ${bank.name} transactions to ${selectedBank}" to proceed.`}
                </Highlight>
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.currentTarget.value)}
              disabled={inputValue == submitValue}
            />
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};

const DeleteBankButton = ({ bank }: { bank: Bank }) => {
  const { user } = useAuth();
  const [opened, setOpened] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const submitValue = `Delete ${bank.name}`;

  useEffect(() => {
    if (inputValue === submitValue) {
      bankDelete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  const bankDelete = async () => {
    deleteBank({ bankName: bank.name, userId: user?.uid || "" })
      .then(() => {
        setInputValue("");
        showSuccessNotif("Bank Deleted!");
        setOpened(false);
      })
      .catch(() => {
        showErrorNotif("Failed to delete bank, try again.");
      });
  };
  return (
    <Popover
      position="top"
      withArrow
      opened={opened}
      onClose={() => setOpened(false)}
    >
      <Popover.Target>
        <Button
          color="red"
          radius="lg"
          variant="outline"
          onClick={() => {
            setOpened(!opened);
          }}
        >
          Delete Bank
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack spacing={0}>
          <Text size="lg" weight={800}>
            {`Delete ${bank.name}?`}
          </Text>
          <Text size="xs">
            {`Deleting a bank means it and all the transactions under
            it will be removed. This cannot be undone. Think carefully
            before proceeding.`}
          </Text>
          <TextInput
            label={
              <Highlight
                size="xs"
                highlight={`Delete ${bank.name} `}
                highlightStyles={(theme) => ({
                  backgroundImage: theme.colors.orange[0],
                  fontWeight: 700,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                })}
              >
                {`Type in "Delete ${bank.name}" to proceed.`}
              </Highlight>
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            disabled={inputValue == submitValue}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
