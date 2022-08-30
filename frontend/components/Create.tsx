import { Transaction, Transfer } from "../utils/db";
import { Controller, useForm } from "react-hook-form";
import {
  Button,
  TextInput,
  Modal,
  useMantineTheme,
  Stack,
  Space,
  Group,
  ActionIcon,
  Menu,
  Tabs,
  Checkbox,
  Tooltip,
} from "@mantine/core";
import {
  IconApps,
  IconArrowRight,
  IconBuildingBank,
  IconChevronDown,
} from "@tabler/icons";
import React, { useState } from "react";
import { BankInput } from "./form/BankInput";
import Datecomponent from "./form/Datecomponent";
import AmountInput from "./form/AmountInput";
import { showErrorNotif, showSuccessNotif } from "../utils/notifs";
import { TypeInput } from "./form/TypeInput";
import { addTransaction, TxFormProps, useBanksQuery } from "../utils/query";

export default function Create() {
  const theme = useMantineTheme();
  const [tabValue, setTabValue] = useState<string | null>("Transaction");
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const banksLength = useBanksQuery()?.length;
  const hasMoreThanOneBank = parseInt(banksLength?.toString() || "0") > 1;

  return (
    <>
      <Group noWrap spacing={0}>
        <Button
          onClick={() => setIsOpen(true)}
          sx={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
        >
          Add
        </Button>
        <Menu transition="pop" position="bottom-end">
          <Menu.Target>
            <ActionIcon
              variant="filled"
              color={theme.primaryColor}
              sx={{
                borderBottomLeftRadius: 0,
                borderTopLeftRadius: 0,
                width: 15,
                height: 36,
              }}
              disabled
            >
              <IconChevronDown size={16} stroke={1.5} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item icon={<IconBuildingBank size={16} stroke={1.5} />}>
              Add Bank
            </Menu.Item>
            <Menu.Item icon={<IconApps size={16} stroke={1.5} />}>
              Add Category
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Modal
        opened={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        overlayOpacity={0.7}
        title={`Add ${tabValue}`}
        centered
      >
        <Tabs
          radius="md"
          variant="outline"
          value={tabValue}
          onTabChange={setTabValue}
        >
          <Tabs.List grow>
            <Tabs.Tab value="Transaction">Transaction</Tabs.Tab>
            <Tooltip
              label="*Transfers are available when more two or more banks have been added."
              position="top"
              withArrow
              arrowSize={7}
              multiline
              openDelay={850}
              events={{ hover: true, focus: true, touch: true }}
            >
              <Tabs.Tab disabled={!hasMoreThanOneBank} value="Transfer">
                Transfer
              </Tabs.Tab>
            </Tooltip>
          </Tabs.List>
          <Tabs.Panel value="Transaction">
            <TransactionForm setIsOpen={setIsOpen} />
          </Tabs.Panel>
          <Tabs.Panel value="Transfer">
            <TransferForm setIsOpen={setIsOpen} />
          </Tabs.Panel>
        </Tabs>
      </Modal>
    </>
  );
}

type CreateProps = {
  setIsOpen: (isOpen: boolean) => void;
};

const TransactionForm = ({ setIsOpen }: CreateProps) => {
  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Transaction>({ defaultValues: { amount: 0 } });
  const onSubmit = async (data: TxFormProps) => {
    addTransaction(data).then(() => {
      setIsOpen(false);
      reset();
    });
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={"sm"}>
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
            <BankInput
              groupStyle={{ width: "100%" }}
              {...field}
              isError={Boolean(errors.bank)}
            />
          )}
        />

        <TextInput
          required
          type="text"
          {...register("description")}
          label="Description: "
          placeholder="Bought groceries"
        />
        <Space />
        <Button type="submit">Submit</Button>
      </Stack>
    </form>
  );
};

const TransferForm = ({ setIsOpen }: CreateProps) => {
  const {
    control,
    register,
    setValue,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<Transfer>({
    defaultValues: { destinationAmount: 0, originAmount: 0 },
  });
  const [isSameAmount, setIsSameAmount] = useState<boolean>(false);
  const onSubmit = async (data: Transfer) => {
    try {
      console.log(data);
      showSuccessNotif("Transaction added.");
      setIsOpen(false);
      reset();
    } catch (error) {
      showErrorNotif();
    }
  };

  const originBank = watch("originBank");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={"sm"}>
        <Datecomponent control={control} setValue={setValue} />

        {!isSameAmount ? (
          <AmountInput control={control} name="originAmount" />
        ) : (
          <>
            <Group sx={{ width: "100%" }}>
              <AmountInput
                control={control}
                name="originAmount"
                label="Origin Adjustment: "
                sx={{ width: "47%" }}
              />
              <AmountInput
                control={control}
                name="destinationAmount"
                label="Destination Adjustment: "
                sx={{ width: "47%" }}
              />
            </Group>
          </>
        )}

        <Checkbox
          size="xs"
          checked={isSameAmount}
          onChange={(event) => setIsSameAmount(event.currentTarget.checked)}
          label="The amount sent will differ from amount received"
          sx={{ justifySelf: "center" }}
        />

        <Group
          position="apart"
          spacing={"xs"}
          sx={{ width: "100%", alignItems: "end" }}
        >
          <Controller
            control={control}
            name="originBank"
            rules={{ required: true }}
            render={({ field }) => (
              <BankInput
                groupStyle={{ width: "41%" }}
                {...field}
                isError={Boolean(errors.originBank)}
                label="Origin Bank: "
              />
            )}
          />
          <IconArrowRight
            size={20}
            stroke={2}
            style={{ alignSelf: "end", marginBottom: 10 }}
          />
          <Controller
            control={control}
            name="destinationBank"
            rules={{ required: true }}
            render={({ field }) => (
              <BankInput
                groupStyle={{ width: "41%" }}
                {...field}
                isError={Boolean(errors.destinationBank)}
                label="Destination Bank: "
                filter={originBank}
              />
            )}
          />
        </Group>

        <TextInput
          required
          type="text"
          {...register("description")}
          label="Description: "
          placeholder="Bought groceries"
        />

        <Space />
        <Button type="submit">Submit</Button>
      </Stack>
    </form>
  );
};
