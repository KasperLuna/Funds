import React, { useEffect, useState } from "react";
import {
  createStyles,
  Footer,
  MediaQuery,
  Tabs,
  TabsValue,
} from "@mantine/core";
import router from "next/router";
import { tabs } from "./Layout";

const useStyles = createStyles((theme) => ({
  tabs: {
    justifyContent: "center",
  },

  tabsList: {
    justifyContent: "space-evenly",
    borderTop: 0,
  },

  tab: {
    paddingInline: theme.spacing.lg,
    height: 45,
    fontWeight: "bold",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderBottomRightRadius: theme.radius.lg,
    borderBottomLeftRadius: theme.radius.lg,
    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[5]
          : theme.colors.gray[0],
    },
    "&[data-active]": {
      backgroundColor:
        theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
      borderBottom: `2px solid ${
        theme.colorScheme === "dark"
          ? theme.colors.gray[1]
          : theme.colors.gray[2]
      }`,
      borderRight: `2px solid ${
        theme.colorScheme === "dark"
          ? theme.colors.gray[1]
          : theme.colors.gray[2]
      }`,
      borderLeft: `2px solid ${
        theme.colorScheme === "dark"
          ? theme.colors.gray[1]
          : theme.colors.gray[2]
      }`,
    },
  },

  footer: {
    height: 55,
    justifyContent: "center",
    backgroundColor:
      theme.colorScheme === "dark"
        ? "rgba(0, 0, 0, 0.9)"
        : theme.colors.gray[2],
    backdropFilter: "blur(10px)",
    paddingInline: theme.spacing.md,

    "@media screen and (display-mode: standalone) and (orientation: portrait)":
      {
        height: 75,
      },
  },
}));

export const NavFooter = () => {
  const [activeTab, setActiveTab] = useState<TabsValue>(router.pathname || "/");
  useEffect(() => {
    if (router.pathname.includes("/banks")) {
      setActiveTab("/banks");
    } else {
      setActiveTab(router.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.pathname]);

  const items = tabs.map((tab) => (
    <Tabs.Tab icon={tab.icon} value={tab.href} key={tab.href}>
      {tab.name}
    </Tabs.Tab>
  ));

  const { classes } = useStyles();
  return (
    <MediaQuery largerThan="sm" styles={{ display: "none" }}>
      <Footer height={80} className={classes.footer}>
        <Tabs
          value={activeTab}
          variant="outline"
          onTabChange={(value) => {
            router.push(`${value}`);
            setActiveTab(value);
          }}
          inverted
          classNames={{
            root: classes.tabs,
            tabsList: classes.tabsList,
            tab: classes.tab,
          }}
        >
          <Tabs.List>{items}</Tabs.List>
        </Tabs>
      </Footer>
    </MediaQuery>
  );
};
