import {
  ActionIcon,
  Anchor,
  Button,
  Group,
  NativeSelect,
  Popover,
  TextInput,
  useMantineTheme,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons";
import React, { useState } from "react";
import { addCategory, useCategoriesQuery } from "../../utils/query";

type CategoryInputProps = {
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  value: string;
  groupStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  isError?: boolean;
};

const DEFAULT_CATEGORIES = [
  { name: "Expense", color: "red" },
  { name: "Income", color: "green" },
  { name: "Withdrawal", color: "red" },
  { name: "Deposit", color: "green" },
];

const CategoryInput = ({
  onChange,
  value,
  groupStyle,
  inputStyle,
  isError,
}: CategoryInputProps): JSX.Element => {
  const categories = useCategoriesQuery();
  const compiledCategories = categories?.concat(DEFAULT_CATEGORIES);
  return (
    <Group noWrap spacing={0} style={{ ...groupStyle }}>
      <NativeSelect
        data={
          compiledCategories?.map((categ) => ({
            value: categ.name,
            label: categ.name,
          })) || []
        }
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
  );
};

const AddCategoryButton = () => {
  const [categoryName, setCategoryName] = useState<string>("");
  const [opened, setOpened] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const theme = useMantineTheme();

  const onSubmit = () => {
    if (categoryName.length == 0) {
      setIsError(true);
      return;
    }
    addCategory(categoryName).then(() => setOpened(false));
  };

  return (
    <Popover
      opened={opened}
      onClose={() => setOpened(false)}
      position="top-end"
      withArrow
      transition="skew-down"
      withinPortal
    >
      <Popover.Target>
        <ActionIcon
          variant={theme.colorScheme === "dark" ? "default" : "light"}
          style={{
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            width: 15,
            height: 36,
            alignSelf: "end",
          }}
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
          onChange={(e) => {
            setIsError(false);
            setCategoryName(e.target.value);
          }}
          variant="default"
          error={isError}
        />
        <Group position="apart" style={{ marginTop: 10 }}>
          <Anchor
            component="button"
            color="gray"
            size="sm"
            onClick={() => setOpened(false)}
          >
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
  );
};

export { CategoryInput };
