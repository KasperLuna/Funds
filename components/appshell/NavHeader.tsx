import React, { useState } from "react";
import {
  createStyles,
  Container,
  Avatar,
  UnstyledButton,
  Group,
  Text,
  Menu,
  useMantineColorScheme,
  Box,
} from "@mantine/core";
import {
  IconLogout,
  IconSettings,
  IconChevronDown,
  IconMoonStars,
  IconSun,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../../components/config/AuthContext";
import { Logo } from "./Logo";
import { AppSettingsModal } from "../config/AppSettingsModal";

const useStyles = createStyles((theme) => ({
  header: {
    zIndex: 11,
    width: "100%",
    position: "sticky",
    top: 0,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    background:
      theme.colorScheme === "dark"
        ? "rgba(0, 0, 0, 0.6)"
        : "rgba(180, 208, 226, 0.1)",
    borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
    backdropFilter: "blur(15px)",

    "@media screen and (display-mode: standalone) and (orientation: portrait)":
      {
        position: "fixed",
        paddingTop: "3.5rem",
        paddingBottom: theme.spacing.xs,
      },

    "@media screen and (display-mode: standalone) and (orientation: landscape)":
      {
        position: "fixed",
      },
  },

  logoText: {
    paddingLeft: 1,
    maxWidth: 90,
    [`@media (max-width: ${theme.breakpoints.sm})`]: {
      maxWidth: 80,
    },
  },

  user: {
    color: theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.black,
    borderRadius: theme.radius.sm,
    transition: "background-color 100ms ease",

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark" ? theme.colors.dark[8] : theme.white,
    },

    [theme.fn.largerThan("sm")]: {
      pointerEvents: "none",
    },
  },

  userName: {
    lineHeight: 1,
  },

  userActive: {
    backgroundColor:
      theme.colorScheme === "dark" ? theme.colors.dark[8] : theme.white,
  },

  chevron: {
    [theme.fn.largerThan("sm")]: {
      display: "none",
    },
  },
}));

export default function NavHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { classes, cx } = useStyles();
  const [userMenuOpened, setUserMenuOpened] = useState(false);
  const [settingsIsOpen, setSettingsIsOpen] = useState<boolean>(false);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  return (
    <div className={classes.header}>
      <Container size={"xl"}>
        <Group position={user ? "apart" : "center"}>
          <Box component={Link} href="/" className={classes.logoText}>
            <Logo />
          </Box>
          {user ? (
            <>
              <Menu
                width={210}
                position="bottom-end"
                transitionProps={{ transition: "pop-top-right" }}
                onClose={() => setUserMenuOpened(false)}
                onOpen={() => setUserMenuOpened(true)}
                withArrow
                shadow={"lg"}
              >
                <Menu.Target>
                  <UnstyledButton
                    className={cx(classes.user, {
                      [classes.userActive]: userMenuOpened,
                    })}
                  >
                    <Group spacing={7}>
                      <Avatar
                        src={(user && user.photoURL) || ""}
                        alt={(user && user.displayName) || ""}
                        radius="xl"
                        size={30}
                      />
                      <Text weight={500} className={classes.userName} size="sm">
                        {user.displayName ||
                          user.email?.split("@")[0] ||
                          "Anonymous"}
                      </Text>

                      <IconChevronDown
                        className={classes.chevron}
                        size={12}
                        stroke={1.5}
                      />
                    </Group>
                  </UnstyledButton>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    icon={<IconSettings size={14} stroke={1.5} />}
                    onClick={() => setSettingsIsOpen(true)}
                  >
                    Settings
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => {
                      toggleColorScheme();
                    }}
                    icon={
                      colorScheme === "dark" ? (
                        <IconSun size={14} stroke={1.5} />
                      ) : (
                        <IconMoonStars size={14} stroke={1.5} />
                      )
                    }
                  >
                    Toggle Site Colors
                  </Menu.Item>
                  <Menu.Item
                    onClick={async () => {
                      await signOut();
                      router.push("/");
                    }}
                    icon={<IconLogout size={14} stroke={1.5} />}
                  >
                    Logout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </>
          ) : (
            <></>
          )}
        </Group>
      </Container>
      <AppSettingsModal isOpen={settingsIsOpen} setIsOpen={setSettingsIsOpen} />
    </div>
  );
}
