import React from "react";
import { Modal, Tabs } from "@mantine/core";
import { BanksPanel, CategoriesPanel } from "../banks/BankSettings";

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
        <Tabs orientation="horizontal" defaultValue={"banks"}>
          <Tabs.List grow>
            <Tabs.Tab value="banks">Banks</Tabs.Tab>
            <Tabs.Tab value="categories">Categories</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="banks">
            <BanksPanel />
          </Tabs.Panel>
          <Tabs.Panel value="categories">
            <CategoriesPanel />
          </Tabs.Panel>
        </Tabs>
      </Modal>
    </>
  );
};
