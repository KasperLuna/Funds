import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { Anchor, Breadcrumbs, Group } from "@mantine/core";
import Create from "../../components/banks/Create";
import TransactionList from "../../components/banks/TransactionList";
import { BankStats } from "../../components/banks/BankStats";
import { useRouter } from "next/router";
import Link from "next/link";
import { Filter } from "../../components/banks/Filter";
import { TransactionLayoutButton } from "../../components/banks/TransactionLayoutButton";

const Home: NextPage = () => {
  const router = useRouter();
  const bank = router.query["bank"];

  const pages = [
    { title: "Banks", href: "/banks" },
    { title: bank, href: `/banks/${bank}` },
  ].map((page) => (
    <Link href={page.href} key={page.href} passHref>
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
      <BankStats />
      <Group position="apart">
        <Group>
          <TransactionLayoutButton />
          <Filter />
        </Group>
        <Create />
      </Group>
      <TransactionList />
    </>
  );
};

export default Home;
