import { ActionIcon, Anchor, Button, Group, NativeSelect, Popover, TextInput, useMantineTheme } from "@mantine/core"
import { showNotification } from "@mantine/notifications"
import { IconCheck, IconPlus, IconX } from "@tabler/icons"
import { useLiveQuery } from "dexie-react-hooks"
import { useState } from "react"
import { db } from "../utils/db"

type BankInputProps = {
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
    value: string,
    groupStyle?: React.CSSProperties,
    inputStyle?: React.CSSProperties,
    isError?: boolean,
}

const BankInput = ({ onChange, value, groupStyle, inputStyle, isError }: BankInputProps): JSX.Element => {
    const banks = useLiveQuery(async () => {
        return db.banks.toArray()
    })
    return (
        <Group noWrap spacing={0} style={{ ...groupStyle }}>
            <NativeSelect
                data={banks?.map((bank) => ({ value: bank.name, label: bank.name })) || []}
                placeholder="Pick one"
                style={{ width: "100%", borderTopRightRadius: 0, ...inputStyle }}
                onChange={onChange}
                value={value}
                label="Bank:"
                radius={0}
                withAsterisk
                error={isError}
            />
            <AddBankButton />
        </Group>
    )
}

const AddBankButton = () => {
    const [bankName, setBankName] = useState<string>("")
    const [opened, setOpened] = useState<boolean>(false);
    const theme = useMantineTheme();

    const onSubmit = () => {
        db.banks.put({ name: bankName, balance: 0, primaryColor: "", secondaryColor: "" }).then(() => {
            showNotification({ title: "Success", message: "New bank added.", icon: <IconCheck />, color: "green", autoClose: 2500 });
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
            withinPortal
        >
            <Popover.Target>
                <ActionIcon
                    variant={theme.colorScheme === "dark" ? "default" : "light"}
                    style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, width: 15, height: 36, alignSelf: "end" }}
                    onClick={() => setOpened((o) => !o)}
                >
                    <IconPlus size={16} stroke={1.5} />
                </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
                <TextInput
                    required
                    label="Bank"
                    placeholder="BDO"
                    sx={{ width: "250px" }}
                    description="Add the name of a bank, you can customize this with colors later in app settings."
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    variant="default"
                />
                <Group position="apart" style={{ marginTop: 10 }}>
                    <Anchor component="button" color="gray" size="sm" onClick={() => setOpened(false)}>
                        Cancel
                    </Anchor>

                    <Group spacing={"xs"}>
                        <Button onClick={() => onSubmit()} size="sm">
                            Add
                        </Button>
                    </Group>
                </Group>
            </Popover.Dropdown>
        </Popover>
    )
}

export { BankInput }