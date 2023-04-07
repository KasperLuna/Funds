import React, { useState } from "react";
import {
  Popover,
  ActionIcon,
  Stack,
  Group,
  Anchor,
  Button,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { deleteTransaction } from "../../firebase/queries";
import { showErrorNotif, showSuccessNotif } from "../../utils/notifs";
import { useAuth } from "../config/AuthContext";

export function DeleteTransactionPopover({
  transactionID,
  transactionAmount,
  bank,
}: {
  transactionID?: string;
  transactionAmount: number;
  bank: string;
}) {
  const { user } = useAuth();
  const [opened, setOpened] = useState<boolean>(false);

  const onDelete = async () => {
    if (!transactionID) {
      showErrorNotif();
      return;
    }
    const deleteVals = {
      userId: user?.uid || "",
      transactionID: transactionID,
      transactionAmount: transactionAmount,
      bank: bank,
    };
    try {
      await deleteTransaction(deleteVals);
      showSuccessNotif("Transaction deleted successfully");
    } catch (error) {
      showErrorNotif("Error deleting transaction, please try again");
    }
  };
  return (
    <Popover
      opened={opened}
      onClose={() => setOpened(false)}
      position="top-end"
      transitionProps={{
        transition: "skew-down",
      }}
      withArrow
    >
      <Popover.Target>
        <ActionIcon
          variant="filled"
          color={"red"}
          onClick={() => setOpened((o) => !o)}
          size="lg"
        >
          <IconTrash size="20px" />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown sx={{ width: "200px" }}>
        <Stack>
          Are you sure you want to delete this transaction?
          <Group position="apart" style={{ marginTop: 10 }}>
            <Anchor
              component="button"
              color="teal"
              size="sm"
              onClick={() => setOpened(false)}
            >
              Cancel
            </Anchor>

            <Button
              variant="filled"
              color={"red"}
              onClick={() => onDelete()}
              size="sm"
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
