import React, { useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { Anchor, Group } from "@mantine/core";
import Create from "../../components/banks/Create";
import TransactionList from "../../components/banks/TransactionList";
import { BankStats } from "../../components/banks/BankStats";
import { useRouter } from "next/router";
import Link from "next/link";
import { Filter } from "../../components/banks/Filter";
import { TransactionLayoutButton } from "../../components/banks/TransactionLayoutButton";

const Home: NextPage = () => {
  const [categoryFilter, setCategoryFilter] = useState<string[] | undefined>(
    undefined
  );
  const router = useRouter();
  const bank = router.query["bank"];

  const pages = [
    { title: "Banks", href: "/banks" },
    { title: bank, href: `/banks/${bank}` },
  ].map((page) => (
    <Anchor component={Link} href={page.href} key={page.href}>
      {page.title}
    </Anchor>
  ));

  return (
    <>
      <Head>
        <title>Banks | Funds</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <BankStats breadcrumbPages={pages} />
      <Group position="apart">
        <Group>
          <TransactionLayoutButton />
          <Filter
            filterValue={categoryFilter}
            setFilterValue={setCategoryFilter}
          />
        </Group>
        <Create />
      </Group>
      <TransactionList
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
      />
    </>
  );
};

export default Home;
