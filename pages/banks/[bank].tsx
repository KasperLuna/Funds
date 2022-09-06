import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { ActionIcon, Anchor, Breadcrumbs, Group } from "@mantine/core";
import Create from "../../components/banks/Create";
import TransactionList from "../../components/banks/TransactionList";
import { IconFilter } from "@tabler/icons";
import { BankStats } from "../../components/banks/BankStats";
import { BankSettings } from "../../components/banks/BankSettings";
import { useRouter } from "next/router";
import Link from "next/link";

const Home: NextPage = () => {
  const router = useRouter();
  const bank = router.query["bank"];

  const pages = [
    { title: "Banks", href: "/banks" },
    { title: bank, href: `/banks/${bank}` },
  ].map((page, index) => (
    <Link href={page.href} key={index} passHref>
      <Anchor>{page.title}</Anchor>
    </Link>
  ));

  return (
    <>
      <Head>
        <title>Banks | Funds</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Breadcrumbs separator="→">{pages}</Breadcrumbs>
      <BankStats
        bank={typeof bank === "string" ? bank.replace(/%20/g, "") : ""}
      />
      <Group position="apart">
        <Group>
          <BankSettings />
          <ActionIcon disabled>
            <IconFilter />
          </ActionIcon>
        </Group>
        <Create />
      </Group>
      <TransactionList
        bank={typeof bank === "string" ? bank.replace(/%20/g, "") : ""}
      />
    </>
  );
};

export default Home;
