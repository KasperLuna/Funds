import React from "react";
import { ActionIcon, Group, MultiSelect, Popover } from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import { useBanksCategsContext } from "./BanksCategoryContext";

export const Filter = ({
  filterValue,
  setFilterValue,
}: {
  filterValue: string[] | undefined;
  setFilterValue: (value: string[] | undefined) => void;
}) => {
  const { categoryData } = useBanksCategsContext();
  const { categories } = categoryData || { categories: [] };

  const data = categories?.map((category) => ({
    label: category.name,
    value: category.name,
  }));

  return (
    <Group>
      <Popover position="right" shadow={"lg"} withArrow arrowSize={15}>
        <Popover.Target>
          <ActionIcon variant={filterValue?.length ? "gradient" : "subtle"}>
            <IconFilter />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown>
          <MultiSelect
            label="Filter by Category:"
            placeholder="Select categories"
            value={filterValue}
            onChange={(value) => setFilterValue(value)}
            clearable={true}
            data={data}
            w={200}
          />
        </Popover.Dropdown>
      </Popover>
    </Group>
  );
};
