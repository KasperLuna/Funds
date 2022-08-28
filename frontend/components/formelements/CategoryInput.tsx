import { ActionIcon, Anchor, Button, Group, NativeSelect, Popover, TextInput, useMantineTheme } from "@mantine/core"
import { showNotification } from "@mantine/notifications"
import { IconCheck, IconPlus, IconX } from "@tabler/icons"
import { useLiveQuery } from "dexie-react-hooks"
import { useState } from "react"
import { db } from "../../utils/db"

type CategoryInputProps = {
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
    value: string,
    groupStyle?: React.CSSProperties,
    inputStyle?: React.CSSProperties,
    isError?: boolean,
}

const CategoryInput = ({ onChange, value, groupStyle, inputStyle, isError }: CategoryInputProps): JSX.Element => {
    const categories = useLiveQuery(async () => {
        return db.categories.toArray()
    })
    return (
        <Group noWrap spacing={0} style={{ ...groupStyle }}>
            <NativeSelect
                data={categories?.map((categ) => ({ value: categ.name, label: categ.name })) || []}
                placeholder="Pick one"
                style={{ width: "100%", borderTopRightRadius: 0, ...inputStyle }}
                onChange={onChange}
                value={value}
                label="Category: "
                radius={0}
                withAsterisk
                error={isError}
            />
            <AddCategoryButton />
        </Group>
    )
}

const AddCategoryButton = () => {
    const [categoryName, setCategoryName] = useState<string>("")
    const [opened, setOpened] = useState<boolean>(false);
    const [isError, setIsError] = useState<boolean>(false);
    const theme = useMantineTheme();

    const onSubmit = () => {
        if (categoryName.length == 0) {
            setIsError(true)
            return
        }
        db.categories.put({ name: categoryName, color: "" }).then(() => {
            showNotification({ title: "Success", message: "New Category added.", icon: <IconCheck />, color: "green", autoClose: 2500 });
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
                    label="Category:"
                    placeholder="Expense"
                    sx={{ width: "250px" }}
                    description="Add the name of a new category, you can customize this with a color later in app settings."
                    value={categoryName}
                    onChange={(e) => { setIsError(false); setCategoryName(e.target.value); }}
                    variant="default"
                    error={isError}
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

export { CategoryInput }