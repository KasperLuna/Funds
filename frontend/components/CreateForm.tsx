import { db, Transaction } from "../utils/db";
import { Controller, useForm } from "react-hook-form"
import { Button, TextInput, Modal, NumberInput, useMantineTheme, Stack, Space, Group, ActionIcon, Menu } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { IconApps, IconBuildingBank, IconCalendarEvent, IconCalendarMinus, IconCheck, IconChevronDown, IconX } from "@tabler/icons";
import { showNotification } from "@mantine/notifications"
import { useState } from "react";
import { BankInput } from "./BankInput";
import { CategoryInput } from "./CategoryInput";

type FormProps = {
    description: string,
    amount: number,
    date: Date,
    bank: string,
    category: string,
}

export default function CreateForm() {
    const theme = useMantineTheme();
    const { control, register, setValue, handleSubmit, formState: { errors }, reset } = useForm<Transaction>({ defaultValues: { amount: 0 } });
    const [isOpen, setIsOpen] = useState<boolean>(false);

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
        <>
            <Group noWrap spacing={0}>
                <Button onClick={() => setIsOpen(true)} sx={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>Add</Button>
                <Menu transition="pop" position="bottom-end">
                    <Menu.Target>
                        <ActionIcon
                            variant="filled"
                            color={theme.primaryColor}
                            sx={{ borderBottomLeftRadius: 0, borderTopLeftRadius: 0, width: 15, height: 36 }}
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
                title="Add Transaction"
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Stack spacing={"sm"}>
                        <Group noWrap spacing={0} sx={{ width: "100%" }}>
                            <Controller control={control} name="date" rules={{ required: true }}
                                render={({ field }) => (
                                    <DatePicker
                                        {...field}
                                        placeholder="Date"
                                        label="Date"
                                        sx={{ width: "100%" }} radius={0}
                                    />
                                )}
                            />
                            <Menu transition="pop" position="bottom-end">
                                <Menu.Target>
                                    <ActionIcon
                                        variant="default"
                                        color={theme.primaryColor}
                                        sx={{ alignSelf: "end", borderBottomLeftRadius: 0, borderTopLeftRadius: 0, width: 15, height: 36 }}
                                    >
                                        <IconCalendarEvent size={16} stroke={1.5} />
                                    </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Item onClick={() => { setValue("date", new Date()) }} icon={<IconCalendarEvent size={16} stroke={1.5} />}>
                                        Set to Today
                                    </Menu.Item>
                                    <Menu.Item onClick={() => { setValue("date", new Date(Date.now() - 86400000)) }} icon={<IconCalendarMinus size={16} stroke={1.5} />}>
                                        Set to Yesterday
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        </Group>


                        <Controller control={control} name="amount" rules={{ required: true }}
                            render={({ field }) => (
                                <NumberInput
                                    label="Amount"
                                    placeholder="100"
                                    {...field}
                                    parser={(val): string => {
                                        return val!.replace(/\₱\s?|(,*)/g, '');
                                    }}
                                    formatter={(val): string =>
                                        !Number.isNaN(parseFloat(val!))
                                            ? `₱ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                            : '₱ '
                                    }
                                    variant="default"
                                    stepHoldDelay={500}
                                    stepHoldInterval={100}
                                />
                            )}
                        />

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
                                    <BankInput groupStyle={{ width: "48%" }} {...field} isError={Boolean(errors.bank)} />
                                )}
                            />
                            <Controller control={control} name="category" rules={{ required: true }}
                                render={({ field }) => (
                                    <CategoryInput groupStyle={{ width: "48%" }} {...field} isError={Boolean(errors.category)} />
                                )}
                            />
                        </Group>

                        <Space />
                        <Button type="submit" >Submit</Button>
                    </Stack>
                </form>
            </Modal>
        </>
    )
}