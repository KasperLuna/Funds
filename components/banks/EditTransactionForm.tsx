import {
  TextInput,
  Group,
  Anchor,
  ActionIcon,
  Button,
  useMantineTheme,
  Popover,
  Stack,
  Modal,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { IconTrash, IconEdit } from "@tabler/icons";
import { BankInput } from "../form/BankInput";
import Datecomponent from "../form/Datecomponent";
import AmountInput from "../form/AmountInput";
import { showErrorNotif } from "../../utils/notifs";
import { TypeInput } from "../form/TypeInput";
import { CategoryInput } from "../form/CategoryInput";
import { deleteTransaction, updateTransaction } from "../../firebase/queries";
import { AppTxTypes, FirebaseTxTypes } from "../../utils/db";
import { useAuth } from "../config/AuthContext";

export function EditTransactionForm(props: FirebaseTxTypes) {
  const { user } = useAuth();
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
  } = useForm<AppTxTypes>({
    defaultValues: {
      amount: Math.abs(props.amount),
      type: props.type,
      date: new Date(props.date.seconds * 1000),
      bank: props.bank,
      description: props.description,
      category: props.category,
    },
  });

  const onSubmit = async (data: AppTxTypes) => {
    const updateVals = {
      userId: user?.uid || "",
      OrigTx: { ...props },
      ...data,
    };
    updateTransaction(updateVals).then(() => setOpened(false));
  };

  const onClose = () => {
    setOpened(false);
    reset();
  };

  return (
    <>
      <ActionIcon
        variant={theme.colorScheme === "dark" ? "subtle" : "light"}
        onClick={() => setOpened((o) => !o)}
        aria-label="Edit transaction"
        role="button"
      >
        <IconEdit size={"20px"} />
      </ActionIcon>
      <Modal
        title="Edit Transaction"
        opened={opened}
        onClose={onClose}
        centered
        withCloseButton={false}
        overlayOpacity={0.7}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Datecomponent control={control} setValue={setValue} />

          <Group spacing={"xs"} noWrap>
            <TypeInput register={register} isError={Boolean(errors.type)} />
            <AmountInput control={control} sx={{ width: "100%" }} />
          </Group>

          <Controller
            control={control}
            name="bank"
            rules={{ required: true }}
            render={({ field }) => (
              <BankInput {...field} isError={Boolean(errors.bank)} />
            )}
          />

          <TextInput
            required
            label="Description"
            placeholder="Description: "
            style={{ minWidth: isMobile ? 220 : 300, marginTop: 5 }}
            {...register("description")}
            variant="default"
          />
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <CategoryInput
                groupStyle={{ width: "100%" }}
                {...field}
                isError={Boolean(errors.bank)}
              />
            )}
          />
          <Group position="apart" style={{ marginTop: 10 }}>
            <Anchor component="button" color="teal" size="sm" onClick={onClose}>
              Cancel
            </Anchor>

            <Group spacing={"xs"}>
              <DeleteTransactionPopover
                transactionID={props.id}
                transactionAmount={props.amount}
                closeModal={onClose}
                bank={props.bank}
              />
              <Button type="submit" size="sm">
                Save
              </Button>
            </Group>
          </Group>
        </form>
      </Modal>
    </>
  );
}

export function DeleteTransactionPopover({
  transactionID,
  transactionAmount,
  closeModal,
  bank,
}: {
  transactionID?: string;
  transactionAmount: number;
  closeModal: () => void;
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
    deleteTransaction(deleteVals).then(() => {
      closeModal();
      setOpened(false);
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
