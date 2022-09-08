import React from "react";
import { ActionIcon, Menu, Modal } from "@mantine/core";
import { IconLayoutGrid, IconSettings, IconTable } from "@tabler/icons";
import { useRouter } from "next/router";

export const BankSettings = () => {
  const { query, push, pathname } = useRouter();
  const [opened, setOpened] = React.useState<boolean>(false);

  const isTableLayout = query.layout === "table";

  const toggleLayoutQuery = () => {
    const newLayout = isTableLayout ? null : "table";
    push({
      pathname: pathname,
      query: { ...query, layout: newLayout },
    });
  };
  return (
    <>
      <Menu withArrow position="bottom-start" shadow={"lg"}>
        <Menu.Target>
          <ActionIcon>
            <IconSettings />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            onClick={() => setOpened(true)}
            icon={<IconSettings size={14} />}
          >
            {"Bank Settings"}
          </Menu.Item>
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

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Banks Settings"
        centered
      >
        Bank Settings Coming Soon!
      </Modal>
    </>
  );
};
