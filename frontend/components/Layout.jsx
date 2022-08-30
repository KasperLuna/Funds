import React from "react";
import NavHeader from "./NavHeader";
import NextNProgress from "nextjs-progressbar";
import { Container, Box, createStyles } from "@mantine/core";

const useStyles = createStyles((theme) => ({
  loadingBox: {
    "@media screen and (display-mode: standalone)": {
      marginTop: theme.spacing.md * 6,
    },
  },
  container: {
    paddingTop: theme.spacing.sm,
    marginBottom: 1000,
    display: "flex",
    flexDirection: "column",
  },
}));

const Layout = ({ children }) => {
  const { classes } = useStyles();
  return (
    <>
      <NextNProgress
        color="rgba(255, 255, 255, 0.4)"
        startPosition={0.3}
        height={3}
        options={{ parent: "#loading-box" }}
      />
      <NavHeader />
      <Box id="loading-box" className={classes.loadingBox}>
        <Container size={"xl"} className={classes.container}>
          {children}
        </Container>
      </Box>
    </>
  );
};

export default Layout;
