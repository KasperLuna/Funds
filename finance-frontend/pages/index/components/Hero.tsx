import React from "react";
import {
  createStyles,
  Title,
  Text,
  Button,
  Container,
  useMantineTheme,
} from "@mantine/core";
import { Dots } from "../styles/Dots";
import Link from "next/link";

const useStyles = createStyles((theme) => ({
  wrapper: {
    position: "relative",
    paddingTop: 120,
    marginTop: 100,
    marginBottom: 100,
    paddingBottom: 120,

    "@media (max-width: 755px)": {
      paddingTop: 80,
      paddingBottom: 60,
    },
  },

  inner: {
    position: "relative",
    zIndex: 1,
  },

  dotsRight: {
    position: "absolute",
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[5]
        : theme.colors.gray[1],

    "@media (max-width: 500px)": {
      display: "none",
    },
  },

  dotsLeft: {
    position: "absolute",
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[5]
        : theme.colors.gray[1],
  },

  title: {
    textAlign: "center",
    fontWeight: 800,
    fontSize: 50,
    letterSpacing: -1,
    color: theme.colorScheme === "dark" ? theme.white : theme.black,
    marginBottom: theme.spacing.xs,
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,

    "@media (max-width: 520px)": {
      fontSize: 32,
      textAlign: "left",
    },
  },

  description: {
    textAlign: "center",

    "@media (max-width: 520px)": {
      textAlign: "left",
      fontSize: theme.fontSizes.md,
    },
  },

  controls: {
    marginTop: theme.spacing.lg,
    display: "flex",
    justifyContent: "center",

    "@media (max-width: 520px)": {
      flexDirection: "column",
    },
  },

  control: {
    "&:not(:first-of-type)": {
      marginLeft: theme.spacing.md,
    },

    "@media (max-width: 520px)": {
      height: 42,
      fontSize: theme.fontSizes.md,

      "&:not(:first-of-type)": {
        marginTop: theme.spacing.md,
        marginLeft: 0,
      },
    },
  },
}));

export function HeroText() {
  const { classes } = useStyles();
  const theme = useMantineTheme();

  return (
    <Container className={classes.wrapper} size={1400}>
      <Dots className={classes.dotsLeft} style={{ left: 0, top: 0 }} />
      <Dots className={classes.dotsLeft} style={{ left: 60, top: 0 }} />
      <Dots className={classes.dotsLeft} style={{ left: 0, top: 300 }} />
      <Dots className={classes.dotsLeft} style={{ left: 0, top: 140 }} />
      <Dots className={classes.dotsRight} style={{ right: 0, top: 60 }} />
      <Dots className={classes.dotsRight} style={{ right: 0, top: 240 }} />
      <Dots className={classes.dotsRight} style={{ right: 0, top: 400 }} />
      <Dots className={classes.dotsRight} style={{ right: 60, top: 400 }} />

      <div className={classes.inner}>
        <Title className={classes.title}>
          Financial{" "}
          <Text component="span" color={theme.primaryColor} inherit>
            freedom
          </Text>{" "}
          at your fingertips
        </Title>

        <Container p={0} size={600}>
          <Text size="lg" color="dimmed" className={classes.description}>
            Manage your assets with ease and grow your value with us – Financhee
            gives you the tools to take control of your finances. Empowering
            finanical responsibility is what we do.
          </Text>
        </Container>

        <div className={classes.controls}>
          <Link href="/account" passHref>
            <Button
              className={classes.control}
              size="lg"
              variant="gradient"
              gradient={{ from: "pink", to: "yellow" }}
            >
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </Container>
  );
}
