import React, { useEffect, useState } from "react";
import {
  Button,
  ColorInput,
  Divider,
  Group,
  Highlight,
  Popover,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useBanksCategsContext } from "./BanksCategoryContext";
import { Bank, Category } from "../../utils/db";
import {
  deleteBank,
  updateCategory,
  recomputeBankBalance,
  transferBankTransactions,
  deleteCategory,
} from "../../firebase/queries";
import { useAuth } from "../config/AuthContext";
import { showErrorNotif, showSuccessNotif } from "../../utils/notifs";
import { BankInput } from "../form/BankInput";

export const BanksPanel = () => {
  const { bankData } = useBanksCategsContext();
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const { banks } = bankData || { banks: [] };

  const bankSelection = banks?.find((bank) => bank.name === selectedBank);

  const clearSelection = () => {
    setSelectedBank(null);
  };

  return (
    <Stack sx={{ paddingTop: "20px" }}>
      <BankInput
        value={selectedBank || ""}
        onChange={(bank) => {
          setSelectedBank(bank);
        }}
      />
      {bankSelection && (
        <Stack spacing={"sm"}>
          <Divider size={"md"} />
          <Text>Customize {bankSelection.name}</Text>
          <ColorInput label="Primary Color: " />
          <ColorInput label="Secondary Color: " />
          <Button>Save</Button>
          <Divider size={"md"} />
          <Text>Danger Zone</Text>
          <RecomputeBalButton bank={bankSelection} />
          <TransferTransactionsButton bank={bankSelection} />
          <DeleteBankButton bank={bankSelection} onSubmit={clearSelection} />
        </Stack>
      )}
    </Stack>
  );
};

export const CategoriesPanel = () => {
  const { categoryData } = useBanksCategsContext();
  const { categories } = categoryData || {};
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categorySelection = categories?.find(
    (category) => category.name === selectedCategory
  );

  const clearSelection = () => {
    setSelectedCategory(null);
  };

  return (
    <Stack
      spacing="md"
      sx={(theme) => ({
        marginTop: theme.spacing.sm,
      })}
    >
      <Select
        placeholder="Select a category to manage:"
        value={selectedCategory || ""}
        onChange={(category) => {
          setSelectedCategory(category);
        }}
        label="Select a category to manage: "
        data={
          categories?.map((category) => {
            return {
              label: category.name,
              value: category.name,
            };
          }) || []
        }
        withinPortal={true}
      />
      {categorySelection && (
        <Group position={"center"}>
          <DeleteCategoryButton
            category={categorySelection}
            onSubmit={clearSelection}
          />
          <RenameCategoryButton
            category={categorySelection}
            onSubmit={clearSelection}
          />
        </Group>
      )}
    </Stack>
  );
};

const RenameCategoryButton = ({
  category,
  onSubmit,
}: {
  category: Category;
  onSubmit: () => void;
}) => {
  const { user } = useAuth();
  const [opened, setOpened] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [newNameValue, setNewNameValue] = useState<string>("");
  const submitValue = `Rename ${category.name}`;

  useEffect(() => {
    if (inputValue === submitValue) {
      renameCategory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  const renameCategory = async () => {
    if (!category) return;
    updateCategory({
      userId: user?.uid || "",
      categoryName: category.name,
      newCategoryName: newNameValue,
    })
      .then(() => {
        setInputValue("");
        showSuccessNotif("Bank Deleted!");
        setOpened(false);
        onSubmit();
      })
      .catch(() => {
        showErrorNotif("Failed to delete bank, try again.");
      });
  };

  return (
    <Popover
      withArrow
      opened={opened}
      onClose={() => setOpened(false)}
      withinPortal
    >
      <Popover.Target>
        <Button onClick={() => setOpened(!opened)}>Rename</Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack spacing={0}>
          <Text size="lg" weight={800} w={300}>
            {`Rename ${category.name}?`}
          </Text>
          <Text size="xs" w={300}>
            {`Renaming a category will update all transactions that use it.
             This cannot be undone. Consider carefully before proceeding.`}
          </Text>
          <TextInput
            label={
              <Highlight
                size="xs"
                highlight={`new category name:`}
                highlightStyles={(theme) => ({
                  backgroundImage: theme.colors.orange[0],
                  fontWeight: 700,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                })}
              >
                {`Type in your new category name:`}
              </Highlight>
            }
            value={newNameValue}
            onChange={(e) => setNewNameValue(e.currentTarget.value)}
            w={300}
          />
          <TextInput
            label={
              <Highlight
                size="xs"
                highlight={`Rename ${category.name} `}
                highlightStyles={(theme) => ({
                  backgroundImage: theme.colors.orange[0],
                  fontWeight: 700,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                })}
              >
                {`Type in "Rename ${category.name}" to confirm this change.`}
              </Highlight>
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            disabled={inputValue == submitValue}
            w={300}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};

const DeleteCategoryButton = ({
  category,
  onSubmit,
}: {
  category: Category;
  onSubmit: () => void;
}) => {
  const { user } = useAuth();
  const [opened, setOpened] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const submitValue = `Delete ${category.name}`;

  useEffect(() => {
    if (inputValue === submitValue) {
      categoryDelete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  const categoryDelete = async () => {
    deleteCategory({ userId: user?.uid || "", categoryName: category.name })
      .then(() => {
        setInputValue("");
        showSuccessNotif("Bank Deleted!");
        setOpened(false);
        onSubmit();
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
      withinPortal={true}
    >
      <Popover.Target>
        <Button
          color="red"
          onClick={() => {
            setOpened(!opened);
          }}
        >
          Delete
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack spacing={0}>
          <Text size="lg" weight={800} w={300}>
            {`Delete ${category.name}?`}
          </Text>
          <Text size="xs" w={300}>
            {`Deleting a category means it will be removed from all transactions using it.
             This cannot be undone. Consider carefully before proceeding.`}
          </Text>
          <TextInput
            label={
              <Highlight
                size="xs"
                highlight={`Delete ${category.name} `}
                highlightStyles={(theme) => ({
                  backgroundImage: theme.colors.orange[0],
                  fontWeight: 700,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                })}
              >
                {`Type in "Delete ${category.name}" to proceed.`}
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

export const RecomputeBalButton = ({ bank }: { bank: Bank }) => {
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
      withinPortal={true}
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
          <Text size="lg" weight={800} w={300}>
            {`Recompute ${bank.name} Balance?`}
          </Text>
          <Text size="xs" w={300}>
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

export const TransferTransactionsButton = ({ bank }: { bank: Bank }) => {
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
      withinPortal={true}
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
          <Text size="lg" weight={800} w={300}>
            {`Transfer ${bank.name} Transactions`}
          </Text>
          <Text size="xs" w={300}>
            {`Transferring transactions to another bank will typically
            only be performed when you wish to rename the bank the transactions
            are under, or the transactions can be consolidated to another bank.
            This cannot be undone.`}
          </Text>
          <BankInput
            label="Select bank to transfer to: "
            value={selectedBank}
            onChange={(e) => e && setSelectedBank(e)}
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
                  w={300}
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

export const DeleteBankButton = ({
  bank,
  onSubmit,
}: {
  bank: Bank;
  onSubmit: () => void;
}) => {
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
        onSubmit();
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
      withinPortal={true}
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
          <Text size="lg" weight={800} w={300}>
            {`Delete ${bank.name}?`}
          </Text>
          <Text size="xs" w={300}>
            {`Deleting a bank means it and all the transactions under
            it will be removed. This cannot be undone. Consider carefully
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
