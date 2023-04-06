import { showNotification } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import React from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AuthErrorNotifHandler = (errorMessage: string | any) => {
  //Login Handlers
  if (errorMessage.includes("email-not-verified")) {
    return;
  } else if (
    errorMessage.includes("user-not-found") ||
    errorMessage.includes("wrong-password")
  ) {
    showNotification({
      title: "Error",
      message: "Incorrect credentials, try again.",
      icon: <IconX />,
      color: "red",
    });
  } else if (errorMessage.includes("too-many-requests")) {
    showNotification({
      title: "Error",
      message: "Too many login attempts, try again later.",
      icon: <IconX />,
      color: "red",
    });
  } else if (errorMessage.includes("user-disabled")) {
    showNotification({
      title: "Error",
      message: "Your account has been disabled.",
      icon: <IconX />,
      color: "red",
    });
  } else if (errorMessage.includes("email-already-in-use")) {
    showNotification({
      title: "Error",
      message: "Email already in use.",
      icon: <IconX />,
      color: "red",
    });
  } else if (errorMessage.includes("invalid-email")) {
    showNotification({
      title: "Error",
      message: "Invalid email.",
      icon: <IconX />,
      color: "red",
    });
  } else {
    showErrorNotif("An unexpected error occured, try again.");
  }
};

export const showErrorNotif = (errorMessage?: string) =>
  showNotification({
    title: "Error",
    message: errorMessage ? errorMessage : "An error cccurred, Try again.",
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
