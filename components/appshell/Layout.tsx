import React from "react";
import NavHeader from "./NavHeader";
import NextNProgress from "nextjs-progressbar";
import { AppShell, Container, Box, createStyles } from "@mantine/core";
import { IconBuildingBank, IconCoinBitcoin, IconHome } from "@tabler/icons";
import { NavFooter } from "./NavFooter";
import { NavBar } from "./NavBar";
import { useAuth } from "../../components/config/AuthContext";
import router from "next/router";

export const tabs = [
  {
    name: "Home",
    href: "/home",
    icon: <IconHome size={15} />,
  },
  {
    name: "Banks",
    href: "/banks",
    icon: <IconBuildingBank size={15} />,
  },
  {
    name: "Crypto",
    href: "/crypto",
    icon: <IconCoinBitcoin size={15} />,
  },
];

const useStyles = createStyles((theme) => ({
  loadingBox: {
    "@media screen and (display-mode: standalone) and (orientation: portrait)":
      {
        marginTop: theme.spacing.xl * 4.5,
      },
    "@media screen and (display-mode: standalone) and (orientation: landscape)":
      {
        marginTop: theme.spacing.xl * 3,
      },
  },
  container: {
    paddingTop: theme.spacing.sm,
    display: "flex",
    flexDirection: "column",
  },
  appShell: {
    main: {
      paddingTop: 0,
    },
  },
}));

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { classes } = useStyles();

  const isInApp = router.pathname !== "/";

  return (
    <>
      <NextNProgress
        color="rgba(255, 255, 255, 0.4)"
        startPosition={0.3}
        height={3}
        options={{ parent: "#loading-box" }}
        showOnShallow={false}
      />
      <AppShell
        className={classes.appShell}
        navbarOffsetBreakpoint="sm"
        asideOffsetBreakpoint="sm"
        navbar={user && isInApp ? <NavBar /> : <></>}
        footer={user && isInApp ? <NavFooter /> : <></>}
        header={<NavHeader />}
      >
        <Box id="loading-box" className={classes.loadingBox}>
          <Container size={"xl"} className={classes.container}>
            {children}
          </Container>
        </Box>
      </AppShell>
    </>
  );
};

export default Layout;
