import { AppTxTypes, Transfer } from "../../utils/db";
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
import { BankInput } from "../form/BankInput";
import Datecomponent from "../form/Datecomponent";
import AmountInput from "../form/AmountInput";
import { TypeInput } from "../form/TypeInput";
import { CategoryInput } from "../form/CategoryInput";
import {
  createTransaction,
  createTransfer,
  useBanksQuery,
} from "../../firebase/queries";
import { useAuth } from "../config/AuthContext";
import { showSuccessNotif } from "../../utils/notifs";

export default function Create() {
  const { user } = useAuth();
  const theme = useMantineTheme();
  const [tabValue, setTabValue] = useState<string | null>("Transaction");
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const banksLength = useBanksQuery(user?.uid || "")?.banks.length;
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { user } = useAuth();
  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AppTxTypes>();
  const onSubmit = async (data: AppTxTypes) => {
    setIsLoading(true);
    createTransaction({ userId: user?.uid || "", ...data }).then(() => {
      setIsOpen(false);
      setIsLoading(false);
      showSuccessNotif("Transaction created successfully");
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

        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <CategoryInput
              groupStyle={{ width: "100%" }}
              {...field}
              isError={Boolean(errors.category)}
            />
          )}
        />
        <Space />
        <Button loading={isLoading} type="submit">
          Submit
        </Button>
      </Stack>
    </form>
  );
};

const TransferForm = ({ setIsOpen }: CreateProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { user } = useAuth();
  const {
    control,
    register,
    setValue,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<Transfer>({
    defaultValues: { destinationAmount: 0, originAmount: 0 },
  });
  const [isSameAmount, setIsSameAmount] = useState<boolean>(false);
  const onSubmit = async (data: Transfer) => {
    setIsLoading(true);
    const transferProps = {
      userId: user?.uid || "",
      ...data,
    };
    createTransfer(transferProps).then(() => {
      setIsOpen(false);
      setIsLoading(false);
      showSuccessNotif("Transfer created successfully");
      reset();
    });
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
            <Group sx={{ width: "100%", alignItems: "end" }}>
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
          noWrap
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

        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <CategoryInput
              groupStyle={{ width: "100%" }}
              {...field}
              isError={Boolean(errors.category)}
            />
          )}
        />
        <Space />
        <Button loading={isLoading} type="submit">
          Submit
        </Button>
      </Stack>
    </form>
  );
};
