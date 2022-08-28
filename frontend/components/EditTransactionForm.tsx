import { TextInput, Group, Anchor, ActionIcon, Button, useMantineTheme, Popover, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { IconTrash, IconEdit, IconCheck, IconX } from "@tabler/icons";
import { db, Transaction } from "../utils/db";
import { showNotification } from "@mantine/notifications";
import { IndexableType } from "dexie";
import { BankInput } from "./formelements/BankInput";
import { CategoryInput } from "./formelements/CategoryInput";
import Datecomponent from "./formelements/Datecomponent";
import AmountInput from "./formelements/AmountInput";

interface UserEditFormProps {
    initialValues: { id?: number, date: Date, description: string, bank: string, amount: number };
    onSubmit(values: { id: number, date: Date, description: string, category: string, bank: string, amount: number }): void;
    onCancel(): void;
}


export function EditTransactionForm(props: Transaction) {
    const [opened, setOpened] = useState<boolean>(false);
    const theme = useMantineTheme();

    const isMobile = useMediaQuery('(max-width: 755px');

    const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<Transaction>({
        defaultValues: props,
    })

    const onSubmit = (data: Transaction) => {
        db.transactions.put(data).then(() => {
            showNotification({ title: "Success", message: "Transaction edited.", icon: <IconCheck />, color: "green", autoClose: 2500 });
            setOpened(false);
        }).catch(() => {
            showNotification({ title: "Error", message: "An error cccurred, Try again.", icon: <IconX />, color: "red" });
        });
    }

    const onClose = () => {
        setOpened(false);
        reset();
    }

    return (
        <Popover
            opened={opened}
            onClose={onClose}
            position="right"
            transition="pop"
            trapFocus
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
                        placeholder="Description"
                        style={{ minWidth: isMobile ? 220 : 300, marginTop: 5 }}
                        {...register('description')}
                        variant="default"
                    />


                    <Group position="apart" sx={{ width: "100%" }}>
                        <Controller control={control} name="bank" rules={{ required: true }}
                            render={({ field }) => (
                                <BankInput groupStyle={{ width: "47%" }} {...field} isError={Boolean(errors.bank)} />
                            )}
                        />
                        <Controller control={control} name="category" rules={{ required: true }}
                            render={({ field }) => (
                                <CategoryInput groupStyle={{ width: "47%" }} {...field} isError={Boolean(errors.category)} />
                            )}
                        />
                    </Group>




                    <Group position="apart" style={{ marginTop: 10 }}>
                        <Anchor component="button" color="teal" size="sm" onClick={onClose}>
                            Cancel
                        </Anchor>

                        <Group spacing={"xs"}>
                            <DeleteTransactionPopover transactionID={props.id} />
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

export function DeleteTransactionPopover({ transactionID }: { transactionID?: IndexableType }) {
    const [opened, setOpened] = useState<boolean>(false);

    const onDelete = () => {
        db.transactions.delete(transactionID!).then(() => {
            showNotification({ title: "Success", message: "Transaction deleted.", icon: <IconCheck />, color: "green", autoClose: 2500 });
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
                    variant='filled'
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
                        <Anchor component="button" color="teal" size="sm" onClick={() => setOpened(false)}>
                            Cancel
                        </Anchor>

                        <Button variant="filled" color={"red"} onClick={() => onDelete()} size="sm">
                            Delete
                        </Button>

                    </Group>
                </Stack>
            </Popover.Dropdown>
        </Popover>
    );
}