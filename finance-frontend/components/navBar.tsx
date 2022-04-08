import React, { RefObject, useEffect, useState } from "react";
import {
  createStyles,
  Header,
  Group,
  Container,
  Burger,
  Text,
  Button,
  Transition,
  Paper,
  Box,
} from "@mantine/core";
import { useBooleanToggle } from "@mantine/hooks";
import { SwitchToggle } from "./colorToggle";
import Link from "next/link";
import useOnScreen from "../utils/useOnScreen";

const HEADER_HEIGHT = 56;

const useStyles = createStyles((theme) => ({
  inner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: 56,

    [theme.fn.smallerThan("sm")]: {
      justifyContent: "flex-start",
    },
  },

  links: {
    width: 260,

    [theme.fn.smallerThan("sm")]: {
      display: "none",
    },
  },

  account: {
    width: 260,

    [theme.fn.smallerThan("sm")]: {
      width: "auto",
      marginLeft: "auto",
    },
  },

  burger: {
    marginRight: theme.spacing.md,

    [theme.fn.largerThan("sm")]: {
      display: "none",
    },
  },

  link: {
    display: "block",
    lineHeight: 1,
    padding: "8px 12px",
    borderRadius: theme.radius.sm,
    textDecoration: "none",
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[0]
        : theme.colors.gray[7],
    fontSize: theme.fontSizes.sm,
    fontWeight: 500,

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[6]
          : theme.colors.gray[0],
    },
  },

  linkActive: {
    "&, &:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.fn.rgba(theme.colors[theme.primaryColor][9], 0.25)
          : theme.colors[theme.primaryColor][0],
      color:
        theme.colors[theme.primaryColor][theme.colorScheme === "dark" ? 3 : 7],
    },
  },

  hideOnSmall: {
    "@media (max-width: 445px)": {
      display: "none",
    },
  },

  dropdown: {
    position: "absolute",
    top: HEADER_HEIGHT,
    left: 0,
    right: 0,
    zIndex: 0,
    borderTopRightRadius: 0,
    borderTopLeftRadius: 0,
    borderTopWidth: 0,
    overflow: "hidden",
    width: "50%",

    [theme.fn.largerThan("sm")]: {
      display: "none",
    },
  },
}));

interface HeaderMiddleProps {
  links: {
    ref: RefObject<HTMLDivElement>;
    label: string;
  }[];
}

export function HeaderMiddle({ links }: HeaderMiddleProps) {
  const { classes, cx } = useStyles();
  const [opened, toggleOpened] = useBooleanToggle(false);
  const [active, setActive] = useState(links[0].label);

  const scrollIntoView = (ref: RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const heroOnScreen = useOnScreen(links[0].ref);
  const featuresOnScreen = useOnScreen(links[1].ref);

  //TODO IMPROVE THIS THING
  useEffect(() => {
    if (heroOnScreen) {
      cx(classes.link, {
        [classes.linkActive]: active === links[0].label,
      });
      setActive(links[0].label);
    }
    if (featuresOnScreen) {
      cx(classes.link, {
        [classes.linkActive]: active === links[1].label,
      });
      setActive(links[1].label);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroOnScreen, featuresOnScreen]);

  const items = links.map((link) => (
    <Text
      key={link.label}
      className={cx(classes.link, {
        [classes.linkActive]: active === link.label,
      })}
      onClick={() => {
        scrollIntoView(link.ref);
        setActive(link.label);
      }}
    >
      {link.label}
    </Text>
  ));

  return (
    <Header fixed={true} height={HEADER_HEIGHT}>
      <Container className={classes.inner}>
        <Burger
          opened={opened}
          onClick={() => toggleOpened()}
          size="sm"
          className={classes.burger}
        />
        <Group className={classes.links} spacing={10}>
          <SwitchToggle />
          {items}
        </Group>

        <Text
          component="span"
          inherit
          variant="gradient"
          gradient={{ from: "red", to: "yellow" }}
        >
          Financhee
        </Text>
        <Group className={classes.account} position="right" noWrap>
          <Link href="/account?login" passHref>
            <Button variant="outline" radius="xl" sx={{ height: 30 }}>
              Log In
            </Button>
          </Link>
          <Link href="/account?signup" passHref>
            <Button
              className={classes.hideOnSmall}
              radius="xl"
              sx={{ height: 30 }}
            >
              Sign Up
            </Button>
          </Link>
        </Group>

        <Transition transition="rotate-right" duration={200} mounted={opened}>
          {(styles) => (
            <Paper className={classes.dropdown} withBorder style={styles}>
              {items}
              <Box draggable={true} mt={-20} mb={-20}>
                <SwitchToggle />
              </Box>
            </Paper>
          )}
        </Transition>
      </Container>
    </Header>
  );
}
