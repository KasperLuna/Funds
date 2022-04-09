import React, { useState } from "react";
import {
  Navbar,
  Center,
  Tooltip,
  UnstyledButton,
  createStyles,
  Group,
} from "@mantine/core";
import {
  Icon as TablerIcon,
  Home2,
  DeviceDesktopAnalytics,
  User,
  Settings,
  Logout,
  BuildingBank,
  CurrencyBitcoin,
  LayoutDashboard,
} from "tabler-icons-react";
import { SwitchToggle } from "../colorToggle";
import Link from "next/link";

const useStyles = createStyles((theme) => ({
  link: {
    width: 50,
    height: 50,
    borderRadius: theme.radius.lg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.5,

    "&:hover": {
      opacity: 0.7,
      color: "dodgerblue",
      backgroundColor: theme.colors[theme.primaryColor][1],
    },
  },

  active: {
    opacity: 0.7,
    color: "azure",
    "&, &:hover": {
      backgroundColor: theme.colors[theme.primaryColor][3],
    },
  },
}));

interface NavbarLinkProps {
  icon: TablerIcon;
  label: string;
  active?: boolean;
  onClick?(): void;
}

function NavbarLink({ icon: Icon, label, active, onClick }: NavbarLinkProps) {
  const { classes, cx } = useStyles();
  return (
    <Tooltip label={label} position="right" withArrow transitionDuration={0}>
      <UnstyledButton
        onClick={onClick}
        className={cx(classes.link, { [classes.active]: active })}
      >
        <Icon />
      </UnstyledButton>
    </Tooltip>
  );
}

const mockdata = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: BuildingBank, label: "Banks" },
  { icon: CurrencyBitcoin, label: "Crypto" },
  { icon: DeviceDesktopAnalytics, label: "Stats" },
  { icon: User, label: "Account" },
  { icon: Settings, label: "Settings" },
];

const useNavbarStyles = createStyles((theme) => ({
  navbar: {
    height: "100vh",
  },
}));

export function NavbarMinimalColored() {
  const [active, setActive] = useState(0);
  const { classes } = useNavbarStyles();

  const links = mockdata.map((link, index) => (
    <NavbarLink
      {...link}
      key={link.label}
      active={index === active}
      onClick={() => setActive(index)}
    />
  ));

  return (
    <Navbar width={{ base: 80 }} p="md" className={classes.navbar}>
      <Center>
        <Link href="/" passHref>
          <NavbarLink icon={Home2} label="Home" />
        </Link>
      </Center>
      <Navbar.Section grow mt={50}>
        <Group direction="column" align="center" spacing={0}>
          {links}
        </Group>
      </Navbar.Section>
      <Navbar.Section>
        <Group direction="column" align="center" spacing={0}>
          <SwitchToggle />
          <Link href="/api/auth/logout" passHref>
            <NavbarLink icon={Logout} label="Logout" />
          </Link>
        </Group>
      </Navbar.Section>
    </Navbar>
  );
}
