import React from "react";
import NavHeader from "./NavHeader";
import { Container } from "@mantine/core";

const Layout = ({ children }) => {
  return (
    <>
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
