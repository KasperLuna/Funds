import {
  TextInput,
  Group,
  Anchor,
  ActionIcon,
  Button,
  useMantineTheme,
  Modal,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { IconEdit } from "@tabler/icons";
import { BankInput } from "../form/BankInput";
import Datecomponent from "../form/Datecomponent";
import AmountInput from "../form/AmountInput";
import { showErrorNotif, showSuccessNotif } from "../../utils/notifs";
import { TypeInput } from "../form/TypeInput";
import { CategoryInput } from "../form/CategoryInput";
import { updateTransaction } from "../../firebase/queries";
import { AppTxTypes, FirebaseTxTypes } from "../../utils/db";
import { useAuth } from "../config/AuthContext";
import { DeleteTransactionPopover } from "./DeleteTransactionPopover";

export function EditTransactionForm(props: FirebaseTxTypes) {
  const theme = useMantineTheme();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [opened, setOpened] = useState<boolean>(false);

  const isMobile = useMediaQuery("(max-width: 755px");

  const {
    register,
    handleSubmit,
    control,
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
    setIsSubmitting(true);
    const updateVals = {
      userId: user?.uid || "",
      OrigTx: { ...props },
      ...data,
    };
    try {
      await updateTransaction(updateVals);
      setIsSubmitting(false);
      showSuccessNotif("Transaction updated successfully");
      setOpened(false);
    } catch {
      showErrorNotif("Error updating transaction, please try again");
    }
  };

  const onClose = () => {
    setOpened(false);
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
                bank={props.bank}
              />
              <Button loading={isSubmitting} type="submit" size="sm">
                Save
              </Button>
            </Group>
          </Group>
        </form>
      </Modal>
    </>
  );
}
