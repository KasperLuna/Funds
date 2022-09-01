import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { ActionIcon, Group } from "@mantine/core";
import Create from "../../components/banks/Create";
import TransactionList from "../../components/banks/TransactionList";
import { IconFilter } from "@tabler/icons";
import { BankStats } from "../../components/banks/BankStats";
import { BankSettings } from "../../components/banks/BankSettings";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Banks | Funds</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <BankStats />
      <Group position="apart">
        <Group>
          <BankSettings />
          <ActionIcon disabled>
            <IconFilter />
          </ActionIcon>
        </Group>
        <Create />
      </Group>
      <TransactionList />
    </>
  );
};

export default Home;
