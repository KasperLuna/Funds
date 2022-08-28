import { db, Transaction } from "../utils/db";
import { Controller, useForm } from "react-hook-form"
import { Button, TextInput, Modal, NumberInput, useMantineTheme, Stack, Space, Group, ActionIcon, Menu } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { IconApps, IconBuildingBank, IconCheck, IconChevronDown, IconX } from "@tabler/icons";
import { showNotification } from "@mantine/notifications"
import { useState } from "react";

type FormProps = {
    description: string,
    amount: number,
    date: Date,
    bank: string,
    category: string,
}

export default function CreateForm() {
    const theme = useMantineTheme();
    const { control, register, handleSubmit, reset } = useForm<Transaction>({ defaultValues: { amount: 0 } });
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const onSubmit = handleSubmit(async (data: FormProps) => {
        try {
            await db.transactions.add(data);
            showNotification({ title: "Success", message: "Transaction added.", icon: <IconCheck />, color: "green", autoClose: 1000 });
            setIsOpen(false);
            reset();
        } catch (error) {
            showNotification({ title: "Error", message: "An error cccurred, Try again.", icon: <IconX />, color: "red" });
        }
    });

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
                <form onSubmit={onSubmit}>
                    <Stack spacing={"sm"}>
                        <Controller control={control} name="date"
                            render={({
                                field: { onChange, value },
                            }) => (
                                <DatePicker
                                    data-autoFocus
                                    onChange={onChange}
                                    value={value}
                                    placeholder="Date"
                                    label="Date"
                                    required
                                />
                            )}
                        />

                        <Controller control={control} name="amount"
                            render={({
                                field: { onChange, value },
                            }) => (
                                <NumberInput
                                    required
                                    label="Amount"
                                    placeholder="100"
                                    onChange={onChange}
                                    value={value}
                                    parser={(val): string => {
                                        return val!.replace(/\$\s?|(,*)/g, '');
                                    }}
                                    formatter={(val): string =>
                                        !Number.isNaN(parseFloat(val!))
                                            ? `₱ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                            : '₱ '
                                    }
                                    // error={form.errors.bank}
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




                        <Group>
                            <TextInput label="Bank" placeholder="BPI" required {...register("bank")} />

                            <TextInput label="Category" placeholder="Expense" required {...register("category")} />
                        </Group>

                        <Space />
                        <Button type="submit" >Submit</Button>
                    </Stack>
                </form>
            </Modal>
        </>
    )
}