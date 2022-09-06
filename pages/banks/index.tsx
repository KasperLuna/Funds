import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { ActionIcon, Anchor, Breadcrumbs, Group } from "@mantine/core";
import Create from "../../components/banks/Create";
import TransactionList from "../../components/banks/TransactionList";
import { IconFilter } from "@tabler/icons";
import { BankStats } from "../../components/banks/BankStats";
import { BankSettings } from "../../components/banks/BankSettings";
import Link from "next/link";

const Home: NextPage = () => {
  const pages = [{ title: "Banks", href: "/banks" }].map((page) => (
    <Link href={page.href} key={page.title} passHref>
      <Anchor>{page.title}</Anchor>
    </Link>
  ));

  return (
    <>
      <Head>
        <title>Banks | Funds</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Breadcrumbs>{pages}</Breadcrumbs>
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
