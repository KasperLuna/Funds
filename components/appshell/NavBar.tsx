import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  createStyles,
  Divider,
  Navbar,
  Stack,
  Tabs,
  TabsValue,
} from "@mantine/core";
import router from "next/router";
import { tabs } from "./Layout";
import { IconLogout, IconSettings } from "@tabler/icons";
import { ColorToggle } from "./ColorToggle";
import { useAuth } from "../../components/config/AuthContext";
import { useViewportSize } from "@mantine/hooks";

const useStyles = createStyles((theme) => ({
  navBar: {
    borderRight: 0,
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors.dark[6]
        : theme.colors.gray[2],
    overflowY: "auto",
    overflowX: "hidden",
    [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
      display: "none",
    },
  },

  navStack: {
    paddingBlock: theme.spacing.md,
    height: "100%",
  },

  tab: {
    paddingBlock: theme.spacing.md * 1.25,
    fontWeight: "bold",
    marginBottom: 5,
    justifyContent: "center",
    borderTopLeftRadius: theme.radius.lg,
    borderBottomLeftRadius: theme.radius.lg,
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
          ? theme.colors.dark[5]
          : theme.colors.gray[2],
    },
  },

  tabsList: { borderRight: 0 },

  tabs: {
    marginLeft: theme.spacing.md,
    justifyContent: "space-between",
  },
}));

export const NavBar = () => {
  const { height } = useViewportSize();
  const [activeTab, setActiveTab] = useState<TabsValue>(router.pathname || "/");
  useEffect(() => {
    if (router.pathname.includes("/banks")) {
      setActiveTab("/banks");
    } else {
      setActiveTab(router.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.pathname]);

  const { signOut } = useAuth();
  const { classes } = useStyles();
  const items = tabs.map((tab) => (
    <Tabs.Tab
      icon={tab.icon}
      value={tab.href}
      key={tab.href}
      disabled={tab.name == "Crypto" ? true : false}
    >
      {tab.name}
    </Tabs.Tab>
  ));

  return (
    <Navbar
      hiddenBreakpoint="sm"
      height={`calc(${height}px - 66px)`}
      width={{ sm: 140, lg: 200 }}
      className={classes.navBar}
    >
      <Stack justify={"space-between"} className={classes.navStack}>
        <Box>
          <Tabs
            value={activeTab}
            variant="outline"
            onTabChange={(value) => {
              router.push(`${value}`);
              setActiveTab(value);
            }}
            orientation="vertical"
            classNames={{
              root: classes.tabs,
              tabsList: classes.tabsList,
              tab: classes.tab,
            }}
          >
            <Tabs.List position="apart" grow sx={{ width: "100%" }}>
              {items}
            </Tabs.List>
          </Tabs>
        </Box>

        <Button.Group orientation="vertical">
          <ColorToggle />
          <Divider />
          <Button
            leftIcon={<IconSettings size={18} />}
            color="gray"
            variant="subtle"
          >
            Settings
          </Button>
          <Divider />
          <Button
            leftIcon={<IconLogout size={18} />}
            color="gray"
            variant="subtle"
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
          >
            Sign Out
          </Button>
          <Divider />
        </Button.Group>
      </Stack>
    </Navbar>
  );
};
