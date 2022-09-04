import { createStyles, Title, Text } from "@mantine/core";
import React from "react";
import { AuthForm } from "../form/AuthForm";
import { Dots } from "./Dots";

const useStyles = createStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },

  dots: {
    position: "absolute",
    zIndex: -1,
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[3]
        : theme.colors.gray[4],

    [`@media (max-width: ${theme.breakpoints.xl}px)`]: {
      opacity: 0.3,
    },

    [`@media (max-width: ${theme.breakpoints.md}px)`]: {
      opacity: 0.2,
    },

    [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
      opacity: 0.1,
    },
  },

  title: {
    textAlign: "center",
    fontSize: "6rem",
    textSizeAdjust: "50%",
    fontWeight: 1000,
    flex: "0 1 auto",
    paddingTop: "10%",
    marginBottom: "20px",
    color: theme.colorScheme === "dark" ? theme.colors.gray[0] : theme.black,

    [`@media (max-width: ${theme.breakpoints.md}px)`]: {
      fontSize: "6rem",
      marginBottom: "10px",
    },

    [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
      fontSize: "5rem",
    },
  },

  description: {
    fontSize: 23,
    marginBottom: 20,

    [`@media (max-width: ${theme.breakpoints.md}px)`]: {
      fontSize: 20,
    },

    [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
      fontSize: 18,
    },
  },
}));

export const HeroSection = () => {
  const { classes } = useStyles();
  return (
    <>
      <Dots className={classes.dots} style={{ right: 0, top: 60 }} />
      <Dots className={classes.dots} style={{ right: 0, top: 260 }} />
      <Dots className={classes.dots} style={{ right: 0, top: 460 }} />
      <Dots className={classes.dots} style={{ left: 0, top: 60 }} />
      <Dots className={classes.dots} style={{ left: 0, top: 260 }} />
      <Dots className={classes.dots} style={{ left: 0, top: 460 }} />
      <Title className={classes.title}>
        {`You get the bread 🍞, we'll balance the books. 📚`}
      </Title>
      <Text className={classes.description}>
        {`Keep track of all your financial accounts and transactions in one place. 
          – Funds lets you manage your money, your way.`}
      </Text>
      <AuthForm />
    </>
  );
};
