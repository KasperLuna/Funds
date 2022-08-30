import React from "react";
import NavHeader from "./NavHeader";
import NextNProgress from "nextjs-progressbar";
import { Container } from "@mantine/core";

const Layout = ({ children }) => {
  return (
    <>
      <NextNProgress
        color="rgba(255, 255, 255, 0.4)"
        startPosition={0.3}
        stopDelayMs={0}
        height={2}
      />
      <NavHeader />
      <Container
        size={"xl"}
        sx={{
          marginTop: 20,
          display: "flex",
          flexDirection: "column",
          "@media screen and (display-mode: standalone)": {
            paddingTop: "80px",
          },
        }}
      >
        {children}
      </Container>
    </>
  );
};

export default Layout;
