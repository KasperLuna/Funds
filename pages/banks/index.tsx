import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { ActionIcon, Anchor, Breadcrumbs, Group, Tooltip } from "@mantine/core";
import Create from "../../components/banks/Create";
import TransactionList from "../../components/banks/TransactionList";
import { BankStats } from "../../components/banks/BankStats";
import Link from "next/link";
import { Filter } from "../../components/banks/Filter";
import { useTxLayout } from "../../utils/helpers";
import { IconLayoutGrid, IconTable } from "@tabler/icons";

const Home: NextPage = () => {
  const { txLayout, setTxLayout } = useTxLayout();

  const isTableLayout = txLayout === "table";

  const toggleLayoutQuery = () => {
    txLayout === "table" ? setTxLayout("card") : setTxLayout("table");
  };

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
          <Tooltip
            label={
              isTableLayout ? "Toggle to Card View" : "Toggle to Table View"
            }
          >
            <ActionIcon onClick={() => toggleLayoutQuery()}>
              {isTableLayout ? (
                <IconLayoutGrid size={24} stroke={1.5} />
              ) : (
                <IconTable size={24} stroke={1.5} />
              )}
            </ActionIcon>
          </Tooltip>
          <Filter />
        </Group>
        <Create />
      </Group>
      <TransactionList />
    </>
  );
};

export default Home;
