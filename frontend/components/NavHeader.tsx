import React, { useState } from "react";
import {
  createStyles,
  Container,
  Avatar,
  UnstyledButton,
  Group,
  Text,
  Menu,
  Tabs,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconLogout,
  IconSettings,
  IconChevronDown,
  IconMoonStars,
  IconSun,
} from "@tabler/icons";

const useStyles = createStyles((theme) => ({
  header: {
    zIndex: 11,
    width: "100%",
    position: "sticky",
    top: 0,
    paddingTop: theme.spacing.md,
    background:
      theme.colorScheme === "dark"
        ? "rgba(0, 0, 0, 0.6)"
        : "rgba(240, 240, 240, 0.8)",
    backdropFilter: "blur(10px)",

    "@media screen and (display-mode: standalone)": {
      position: "fixed",
      paddingTop: "45px",
    },
  },

  logoText: {
    paddingBottom: 10,
    paddingLeft: 1,
    [theme.fn.smallerThan("xs")]: {
      display: "none",
    },
  },

  user: {
    marginBottom: 10,
    color: theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.black,
    padding: `5px 7px`,
    borderRadius: theme.radius.sm,
    transition: "background-color 100ms ease",

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark" ? theme.colors.dark[8] : theme.white,
    },

    "@media screen and (display-mode: standalone)": {
      marginBottom: 0,
    },
  },

  userName: {
    lineHeight: 1,
    [theme.fn.smallerThan("xs")]: {
      display: "none",
    },
  },

  userActive: {
    backgroundColor:
      theme.colorScheme === "dark" ? theme.colors.dark[8] : theme.white,
  },

  tabs: {
    alignSelf: "end",
  },

  tabsList: {
    borderBottom: "0 !important",
  },

  tab: {
    fontWeight: 500,
    height: 35,
    backgroundColor: "transparent",

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[5]
          : theme.colors.gray[1],
    },

    "&[data-active]": {
      backgroundColor:
        theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
      borderColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[7]
          : theme.colors.gray[2],
    },
  },
}));

const data = {
  user: {
    name: "Kasper",
    email: "mail@kasperluna.com",
    image: "https://kasperluna.com/face.webp",
  },
  tabs: ["Home", "Banks"],
};

export function NavHeader() {
  const { classes, cx } = useStyles();
  const [userMenuOpened, setUserMenuOpened] = useState(false);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const { user, tabs } = data;

  const items = tabs.map((tab) => (
    <Tabs.Tab value={tab} key={tab} disabled={tab == "Crypto" ? true : false}>
      {tab}
    </Tabs.Tab>
  ));

  return (
    <div className={classes.header}>
      <Container size={"xl"}>
        <Group position="apart">
          <Text className={classes.logoText}>Funds</Text>

          <Tabs
            defaultValue="Home"
            variant="outline"
            classNames={{
              root: classes.tabs,
              tabsList: classes.tabsList,
              tab: classes.tab,
            }}
          >
            <Tabs.List>{items}</Tabs.List>
          </Tabs>
          <Menu
            width={210}
            position="bottom-end"
            transition="pop-top-right"
            onClose={() => setUserMenuOpened(false)}
            onOpen={() => setUserMenuOpened(true)}
            withArrow
          >
            <Menu.Target>
              <UnstyledButton
                className={cx(classes.user, {
                  [classes.userActive]: userMenuOpened,
                })}
              >
                <Group spacing={7}>
                  <Avatar
                    src={user.image}
                    alt={user.name}
                    radius="xl"
                    size={20}
                  />
                  <Text weight={500} className={classes.userName} size="sm">
                    {user.name}
                  </Text>
                  <IconChevronDown size={12} stroke={1.5} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item icon={<IconSettings size={14} stroke={1.5} />}>
                Settings
              </Menu.Item>
              <Menu.Item
                onClick={() => {
                  toggleColorScheme();
                }}
                icon={
                  colorScheme === "dark" ? (
                    <IconSun size={14} stroke={1.5} />
                  ) : (
                    <IconMoonStars size={14} stroke={1.5} />
                  )
                }
              >
                Toggle Color Scheme
              </Menu.Item>
              <Menu.Item icon={<IconLogout size={14} stroke={1.5} />}>
                Logout
              </Menu.Item>
              {/* <Menu.Divider /> */}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Container>
    </div>
  );
}
