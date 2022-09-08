import React from "react";
import { ActionIcon, Popover } from "@mantine/core";
import { IconFilter } from "@tabler/icons";

export const Filter = () => {
  return (
    <>
      <Popover position="right" shadow={"lg"}>
        <Popover.Target>
          <ActionIcon>
            <IconFilter />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown>
          <>Filtering Coming Soon!</>
        </Popover.Dropdown>
      </Popover>
    </>
  );
};
