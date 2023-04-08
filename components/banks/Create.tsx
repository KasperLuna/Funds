import { AppTxTypes, Bank, Category, Transfer } from "../../utils/db";
import { Controller, useForm } from "react-hook-form";
import {
  Button,
  TextInput,
  Modal,
  Stack,
  Space,
  Group,
  ActionIcon,
  Menu,
  Tabs,
  Checkbox,
  Tooltip,
  MultiSelect,
} from "@mantine/core";
import {
  IconApps,
  IconArrowRight,
  IconBuildingBank,
  IconChevronDown,
} from "@tabler/icons-react";
import React, { useState } from "react";
import { BankInput } from "../form/BankInput";
import Datecomponent from "../form/Datecomponent";
import AmountInput from "../form/AmountInput";
import { TypeInput } from "../form/TypeInput";
import { CategoryInput } from "../form/CategoryInput";
import {
  createBank,
  createCategory,
  createTransaction,
  createTransfer,
} from "../../firebase/queries";
import { useAuth } from "../config/AuthContext";
import { showErrorNotif, showSuccessNotif } from "../../utils/notifs";
import { useBanksCategsContext } from "./BanksCategoryContext";

export default function Create() {
  const { bankData } = useBanksCategsContext();
  const { banks } = bankData || { banks: [] };
  const [tabValue, setTabValue] = useState<string | null>("Transaction");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [dropdownModalForm, setDropdownModalForm] = useState<
    "Bank" | "Category" | null
  >(null);

  const closeDropdownModalForm = () => setDropdownModalForm(null);

  const banksLength = banks.length;
  const hasMoreThanOneBank = parseInt(banksLength?.toString() || "0") > 1;
  return (
    <>
      <Group noWrap spacing={0}>
        <Button
          color={"orange"}
          onClick={() => {
            setIsOpen(true);
          }}
          sx={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
        >
          Add
        </Button>
        <Menu
          transitionProps={{ transition: "pop" }}
          position="bottom-end"
          shadow={"lg"}
        >
          <Menu.Target>
            <ActionIcon
              variant="filled"
              color={"gray"}
              sx={{
                borderBottomLeftRadius: 0,
                borderTopLeftRadius: 0,
                width: 15,
                height: 36,
              }}
            >
              <IconChevronDown size={16} stroke={1.5} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              onClick={() => {
                setDropdownModalForm("Bank");
              }}
              icon={<IconBuildingBank size={16} stroke={1.5} />}
            >
              Add Bank
            </Menu.Item>
            <Menu.Item
              onClick={() => {
                setDropdownModalForm("Category");
              }}
              icon={<IconApps size={16} stroke={1.5} />}
            >
              Add Category
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* Transaction / Transfer Form */}
      <Modal
        opened={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        overlayProps={{
          opacity: 0.7,
        }}
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

      {/* Bank / Category Form */}
      <Modal
        centered
        opened={Boolean(dropdownModalForm)}
        onClose={() => setDropdownModalForm(null)}
        title={`Add a ${dropdownModalForm}`}
      >
        {dropdownModalForm === "Bank" ? (
          <BankForm closeModal={closeDropdownModalForm} />
        ) : (
          <CategoryForm closeModal={closeDropdownModalForm} />
        )}
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
  } = useForm<AppTxTypes>({ defaultValues: { bank: "" } });
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
          <Controller
            control={control}
            name="type"
            rules={{ required: true }}
            render={({ field }) => (
              <TypeInput {...field} isError={Boolean(errors.type)} />
            )}
          />
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
    defaultValues: { originBank: "", destinationBank: "" },
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
                label="Origin Deduction: "
                sx={{ width: "47%" }}
              />
              <AmountInput
                control={control}
                name="destinationAmount"
                label="Destination Addition: "
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

const BankForm = ({ closeModal }: { closeModal: () => void }) => {
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Bank>({ defaultValues: { balance: 0 } });
  const { bankData } = useBanksCategsContext();
  const { banks } = bankData || {};

  const onSubmit = (data: Bank) => {
    createBank({ userId: user?.uid || "", ...data })
      .then(() => {
        closeModal();
        showSuccessNotif(`${data.name} successfully added to banks!`);
        reset();
      })
      .catch(() => {
        showErrorNotif("An error occurred, please try again.");
      });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={"sm"}>
        <TextInput
          required
          type="text"
          label="Bank Name: "
          placeholder="Bank Name"
          description="Use the name of the bank you want to add, e.g. Metrobank"
          {...register("name", { required: true })}
          error={errors.name?.message}
        />

        {Boolean(banks?.length) && (
          <MultiSelect
            description="For your reference, here are all your existing banks."
            multiple
            readOnly
            disabled
            data={
              banks?.map((bank, index) => {
                return {
                  label: bank.name,
                  value: index.toString(),
                };
              }) || []
            }
            value={
              (banks && [
                ...banks.map((_category, index) => {
                  return index.toString() || "";
                }),
              ]) ||
              []
            }
          />
        )}
        <Group position="right">
          <Button radius={"xl"} color="orange" type="submit">
            Submit
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

const CategoryForm = ({ closeModal }: { closeModal: () => void }) => {
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Category>();
  const { categoryData } = useBanksCategsContext();
  const { categories } = categoryData || {};

  const onSubmit = (data: Category) => {
    createCategory({ userId: user?.uid || "", ...data })
      .then(() => {
        closeModal();
        showSuccessNotif(`"${data.name}" successfully added to categories!`);
        reset();
      })
      .catch(() => {
        showErrorNotif("An error occurred, please try again.");
      });
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={"sm"}>
          <TextInput
            required
            type="text"
            description="A category is a tag that you can use to group your transactions, each transaction can have up to 3 categories."
            label="Category Name: "
            placeholder="Category Name"
            {...register("name", { required: true })}
            error={errors.name?.message}
          />
          {Boolean(categories?.length) && (
            <MultiSelect
              description="For your reference, here are all your existing categories."
              multiple
              readOnly
              disabled
              data={
                categories?.map((category, index) => {
                  return {
                    label: category.name,
                    value: index.toString(),
                  };
                }) || []
              }
              value={
                (categories && [
                  ...categories.map((_category, index) => {
                    return index.toString() || "";
                  }),
                ]) ||
                []
              }
            />
          )}

          <Group position="right">
            <Button radius={"xl"} color="orange" type="submit">
              Submit
            </Button>
          </Group>
        </Stack>
      </form>
    </>
  );
};
