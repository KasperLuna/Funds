import React from "react";
import { ActionIcon, Menu } from "@mantine/core";
import { IconLayoutGrid, IconSettings, IconTable } from "@tabler/icons";
import { useRouter } from "next/router";

export const BankSettings = () => {
  const { query, push, pathname } = useRouter();

  const isTableLayout = query.layout === "table";

  const toggleLayoutQuery = () => {
    const newLayout = isTableLayout ? "" : "table";
    push(`${pathname}?layout=${newLayout}`);
  };
  return (
    <Menu withArrow position="bottom-start">
      <Menu.Target>
        <ActionIcon>
          <IconSettings />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          onClick={() => toggleLayoutQuery()}
          icon={
            isTableLayout ? (
              <IconLayoutGrid size={14} stroke={1.5} />
            ) : (
              <IconTable size={14} stroke={1.5} />
            )
          }
        >
          {isTableLayout ? "Toggle Card View" : "Toggle Table View"}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
