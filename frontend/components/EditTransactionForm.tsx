import { TextInput, NumberInput, Group, Anchor, ActionIcon, Button, useMantineTheme, Popover } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { useMediaQuery } from "@mantine/hooks";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { IconTrash, IconEdit, IconCheck, IconX } from "@tabler/icons";
import { db, Transaction } from "../utils/db";
import { showNotification } from "@mantine/notifications";

interface UserEditFormProps {
    initialValues: { id?: number, date: Date, description: string, bank: string, amount: number };
    onSubmit(values: { id: number, date: Date, description: string, category: string, bank: string, amount: number }): void;
    onCancel(): void;
}


export function EditTransactionForm(props: Transaction) {
    const [opened, setOpened] = useState<boolean>(false);
    const theme = useMantineTheme();

    const isMobile = useMediaQuery('(max-width: 755px');

    const { register, handleSubmit, control } = useForm<Transaction>({
        defaultValues: props,
    })

    const onSubmit = (data: Transaction) => {
        db.transactions.put(data).then(() => {
            showNotification({ title: "Success", message: "Transaction edited.", icon: <IconCheck />, color: "green", autoClose: 1000 });
            setOpened(false);
        }).catch(() => {
            showNotification({ title: "Error", message: "An error cccurred, Try again.", icon: <IconX />, color: "red" });
        });
    }

    return (
        <Popover
            opened={opened}
            onClose={() => setOpened(false)}
            position="right"
            transition="pop"
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
                    <Controller control={control} name="date"
                        render={({
                            field: { onChange, value },
                        }) => (
                            <DatePicker
                                onChange={onChange}
                                value={value}
                                placeholder="Date"
                                label="Date"
                                style={{ minWidth: isMobile ? 220 : 300, marginTop: 5 }}
                                required
                            />
                        )} />

                    <Controller control={control} name="amount"
                        render={({
                            field: { onChange, value },
                        }) => (
                            <NumberInput
                                required
                                label="Balance"
                                placeholder="-100"
                                style={{ minWidth: isMobile ? 220 : 300, marginTop: 5 }}
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
                                stepHoldDelay={500}
                                stepHoldInterval={100}
                                variant="default"
                            />
                        )} />

                    <TextInput
                        required
                        label="Description"
                        placeholder="Description"
                        style={{ minWidth: isMobile ? 220 : 300, marginTop: 5 }}
                        {...register('description')}
                        variant="default"
                    />


                    <Group>
                        <TextInput
                            required
                            label="Category"
                            placeholder="Category"
                            // style={{ minWidth: isMobile ? 220 : 300, marginTop: 5 }}
                            style={{ marginTop: 5 }}
                            {...register('category')}
                            variant="default"
                        />

                        <TextInput
                            required
                            label="Bank"
                            placeholder="Bank"
                            // style={{ minWidth: isMobile ? 220 : 300, marginTop: 5 }}
                            style={{ marginTop: 5 }}
                            {...register('bank')}
                            variant="default"
                        />
                    </Group>




                    <Group position="apart" style={{ marginTop: 10 }}>
                        <Anchor component="button" color="gray" size="sm" onClick={() => setOpened(false)}>
                            Cancel
                        </Anchor>

                        <Group spacing={"xs"}>
                            <ActionIcon variant='filled' color={"red"} size="lg"><IconTrash size="20px" /></ActionIcon>
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