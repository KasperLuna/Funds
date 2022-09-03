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
    paddingInline: theme.spacing.md * 1.25,
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
          : theme.colors.gray[1],
    },
    "&[data-active]": {
      backgroundColor:
        theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
    },
  },

  footer: {
    height: 55,
    justifyContent: "center",
    backgroundColor:
      theme.colorScheme === "dark"
        ? "rgba(0, 0, 0, 0.55)"
        : "rgba(200, 200, 200, 0.6)",
    backdropFilter: "blur(10px)",
    paddingInline: theme.spacing.md,

    "@media screen and (display-mode: standalone)": {
      height: 75,
    },
  },
}));

export const NavFooter = () => {
  const [activeTab, setActiveTab] = useState<TabsValue>(router.pathname || "/");
  useEffect(() => {
    setActiveTab(router.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.pathname]);

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
