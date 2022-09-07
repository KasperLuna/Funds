import React from "react";
import { Modal } from "@mantine/core";

export const AppSettingsModal = ({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}) => {
  return (
    <>
      <Modal
        opened={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        title="App Settings"
        centered
      >
        Coming Soon!
      </Modal>
    </>
  );
};
