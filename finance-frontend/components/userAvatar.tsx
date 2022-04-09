import React from "react";
import { Avatar, Button, Menu, Text, useMantineTheme } from "@mantine/core";
import { Calendar, Logout } from "tabler-icons-react";
import Link from "next/link";
import { UserProfile } from "@auth0/nextjs-auth0";

type AvatarProps = {
  user: UserProfile;
};

export function ButtonMenu(props: AvatarProps) {
  const theme = useMantineTheme();
  return (
    <Menu
      control={
        <Button variant="outline" radius="xl" sx={{ height: 30 }}>
          Account
        </Button>
      }
      transition="pop-top-right"
      placement="end"
      size="auto"
    >
      <Menu.Item
        icon={
          <Avatar
            src={props.user.picture}
            alt={props.user.nickname || ""}
            radius="xl"
          />
        }
      >
        <Text> {props.user.nickname}</Text>
      </Menu.Item>

      <Menu.Item
        component="a"
        href="/api/auth/logout"
        icon={<Logout size={16} color={theme.colors.violet[6]} />}
      >
        Logout
      </Menu.Item>
    </Menu>
  );
}
