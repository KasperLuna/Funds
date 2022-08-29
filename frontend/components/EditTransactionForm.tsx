import {
  TextInput,
  Group,
  Anchor,
  ActionIcon,
  Button,
  useMantineTheme,
  Popover,
  Stack,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { IconTrash, IconEdit } from "@tabler/icons";
import { db, Transaction } from "../utils/db";
import { IndexableType } from "dexie";
import { BankInput } from "./form/BankInput";
import { CategoryInput } from "./form/CategoryInput";
import Datecomponent from "./form/Datecomponent";
import AmountInput from "./form/AmountInput";
import { showErrorNotif, showSuccessNotif } from "../utils/notifs";

export function EditTransactionForm(props: Transaction) {
  const [opened, setOpened] = useState<boolean>(false);
  const theme = useMantineTheme();

  const isMobile = useMediaQuery("(max-width: 755px");

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<Transaction>({
    defaultValues: props,
  });

  const onSubmit = (data: Transaction) => {
    db.transactions
      .put(data)
      .then(() => {
        showSuccessNotif("Transaction Edited.");
        setOpened(false);
      })
      .catch(() => {
        showErrorNotif();
      });
  };

  const onClose = () => {
    setOpened(false);
    reset();
  };

  return (
    <Popover
      opened={opened}
      onClose={onClose}
      position="left"
      withArrow
      transition="pop"
      closeOnClickOutside={false}
    >
      <Popover.Target>
        <ActionIcon
          variant={theme.colorScheme === "dark" ? "subtle" : "light"}
          onClick={() => setOpened((o) => !o)}
        >
          <IconEdit size={"20px"} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Datecomponent control={control} setValue={setValue} />

          <AmountInput control={control} />

          <TextInput
            required
            label="Description"
            placeholder="Description: "
            style={{ minWidth: isMobile ? 220 : 300, marginTop: 5 }}
            {...register("description")}
            variant="default"
          />

          <Group position="apart" sx={{ width: "100%" }}>
            <Controller
              control={control}
              name="bank"
              rules={{ required: true }}
              render={({ field }) => (
                <BankInput
                  groupStyle={{ width: "47%" }}
                  {...field}
                  isError={Boolean(errors.bank)}
                />
              )}
            />
            <Controller
              control={control}
              name="category"
              rules={{ required: true }}
              render={({ field }) => (
                <CategoryInput
                  groupStyle={{ width: "47%" }}
                  {...field}
                  isError={Boolean(errors.category)}
                />
              )}
            />
          </Group>

          <Group position="apart" style={{ marginTop: 10 }}>
            <Anchor component="button" color="teal" size="sm" onClick={onClose}>
              Cancel
            </Anchor>

            <Group spacing={"xs"}>
              <DeleteTransactionPopover
                transactionID={props.id}
                closeModal={onClose}
              />
              <Button type="submit" size="sm">
                Save
              </Button>
            </Group>
          </Group>
        </form>
      </Popover.Dropdown>
    </Popover>
  );
}

export function DeleteTransactionPopover({
  transactionID,
  closeModal,
}: {
  transactionID?: IndexableType;
  closeModal: () => void;
}) {
  const [opened, setOpened] = useState<boolean>(false);

  const onDelete = () => {
    if (!transactionID) {
      showErrorNotif();
      return;
    }
    db.transactions
      .delete(transactionID)
      .then(() => {
        closeModal();
        setOpened(false);
        showSuccessNotif("Transaction deleted.");
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
      transition="skew-down"
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
