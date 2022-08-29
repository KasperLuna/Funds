import { showNotification } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons";
import React from "react";

export const showErrorNotif = () =>
  showNotification({
    title: "Error",
    message: "An error cccurred, Try again.",
    icon: <IconX />,
    color: "red",
  });

export const showSuccessNotif = (message: string) =>
  showNotification({
    title: "Success",
    message: message,
    icon: <IconCheck />,
    color: "green",
    autoClose: 2500,
  });
