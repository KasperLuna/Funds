import { db, Transaction, Transfer } from "../utils/db";
import { Controller, useForm } from "react-hook-form"
import { Button, TextInput, Modal, useMantineTheme, Stack, Space, Group, ActionIcon, Menu, Tabs, Checkbox } from "@mantine/core";
import { IconApps, IconArrowRight, IconBuildingBank, IconCheck, IconChevronDown, IconX } from "@tabler/icons";
import { showNotification } from "@mantine/notifications"
import { useState } from "react";
import { BankInput } from "./formelements/BankInput";
import { CategoryInput } from "./formelements/CategoryInput";
import Datecomponent from "./formelements/Datecomponent";
import AmountInput from "./formelements/AmountInput";
import { useLiveQuery } from "dexie-react-hooks";

type FormProps = {
    description: string,
    amount: number,
    date: Date,
    bank: string,
    category: string,
}

export default function Create() {
    const theme = useMantineTheme();
    const [tabValue, setTabValue] = useState<string | null>("Transaction");
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const banksLength = useLiveQuery(async () => {
        return (await db.banks.toArray()).length
    })
    const hasMoreThanOneBank = parseInt(banksLength?.toString() || "0") > 1;

    return (
        <>
            <Group noWrap spacing={0}>
                <Button onClick={() => setIsOpen(true)} sx={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>Add</Button>
                <Menu transition="pop" position="bottom-end">
                    <Menu.Target>
                        <ActionIcon
                            variant="filled"
                            color={theme.primaryColor}
                            sx={{ borderBottomLeftRadius: 0, borderTopLeftRadius: 0, width: 15, height: 36 }}
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
                onClose={() => { setIsOpen(false) }}
                overlayColor={theme.colorScheme === 'dark' ? theme.colors.dark[9] : theme.colors.gray[2]}
                overlayOpacity={0.55}
                overlayBlur={3}
                title={`Add ${tabValue}`}
            >
                <Tabs radius="md" variant="outline" value={tabValue} onTabChange={setTabValue}>
                    <Tabs.List>
                        <Tabs.Tab value="Transaction">Transaction</Tabs.Tab>
                        <Tabs.Tab disabled={!hasMoreThanOneBank} value="Transfer">Transfer</Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value="Transaction"><TransactionForm setIsOpen={setIsOpen} /></Tabs.Panel>
                    <Tabs.Panel value="Transfer"><TransferForm setIsOpen={setIsOpen} /></Tabs.Panel>
                </Tabs>
            </Modal>
        </>
    )
}

type CreateProps = {
    setIsOpen: (isOpen: boolean) => void,
}

const TransactionForm = ({ setIsOpen }: CreateProps) => {
    const { control, register, setValue, handleSubmit, formState: { errors }, reset } = useForm<Transaction>({ defaultValues: { amount: 0 } });
    const onSubmit = async (data: FormProps) => {
        try {
            await db.transactions.add(data);
            showNotification({ title: "Success", message: "Transaction added.", icon: <IconCheck />, color: "green", autoClose: 2500 });
            setIsOpen(false);
            reset();
        } catch (error) {
            showNotification({ title: "Error", message: "An error cccurred, Try again.", icon: <IconX />, color: "red" });
        }
    };
    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={"sm"}>
                <Datecomponent control={control} setValue={setValue} />

                <AmountInput control={control} />

                <TextInput
                    required
                    type="text"
                    {...register("description")}
                    label="Description"
                    placeholder="Bought groceries"
                />

                <Group position="apart" sx={{ width: "100%" }}>
                    <Controller control={control} name="bank" rules={{ required: true }}
                        render={({ field }) => (
                            <BankInput groupStyle={{ width: "45%" }} {...field} isError={Boolean(errors.bank)} />
                        )}
                    />
                    <Controller control={control} name="category" rules={{ required: true }}
                        render={({ field }) => (
                            <CategoryInput groupStyle={{ width: "45%" }} {...field} isError={Boolean(errors.category)} />
                        )}
                    />
                </Group>

                <Space />
                <Button type="submit" >Submit</Button>
            </Stack>
        </form>
    )
}

const TransferForm = ({ setIsOpen }: CreateProps) => {
    const { control, register, setValue, handleSubmit, watch, formState: { errors }, reset } = useForm<Transfer>({ defaultValues: { destinationAmount: 0, originAmount: 0 } });
    const [isSameAmount, setIsSameAmount] = useState<boolean>(false);
    const onSubmit = async (data: Transfer) => {
        try {
            console.log(data)
            showNotification({ title: "Success", message: "Transaction added.", icon: <IconCheck />, color: "green", autoClose: 2500 });
            setIsOpen(false);
            reset();
        } catch (error) {
            showNotification({ title: "Error", message: "An error cccurred, Try again.", icon: <IconX />, color: "red" });
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
                            <AmountInput control={control} name="originAmount" label="Origin Adjustment: " sx={{ width: "47%" }} />
                            <AmountInput control={control} name="destinationAmount" label="Destination Adjustment: " sx={{ width: "47%" }} />
                        </Group>

                    </>
                )}

                <Checkbox size="xs" checked={isSameAmount} onChange={(event) => setIsSameAmount(event.currentTarget.checked)} label="The amount sent will differ from amount received" sx={{ justifySelf: "center" }} />

                <Group position="apart" spacing={"xs"} sx={{ width: "100%", alignItems: "end" }}>
                    <Controller control={control} name="originBank" rules={{ required: true }}
                        render={({ field }) => (
                            <BankInput groupStyle={{ width: "41%" }} {...field} isError={Boolean(errors.originBank)} label="Origin Bank: " />
                        )}
                    />
                    <IconArrowRight size={20} stroke={2} style={{ alignSelf: "end", marginBottom: 10 }} />
                    <Controller control={control} name="destinationBank" rules={{ required: true }}
                        render={({ field }) => (
                            <BankInput groupStyle={{ width: "41%" }} {...field} isError={Boolean(errors.destinationBank)} label="Destination Bank: " filter={originBank} />
                        )}
                    />
                </Group>

                <TextInput
                    required
                    type="text"
                    {...register("description")}
                    label="Description"
                    placeholder="Bought groceries"
                />



                <Space />
                <Button type="submit" >Submit</Button>
            </Stack>
        </form>
    )
}