import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { ActionIcon, Group } from "@mantine/core";
import Create from "../components/Create";
import TransactionList from "../components/TransactionList";
import { IconFilter, IconSettings } from "@tabler/icons";
import { BankStats } from "../components/BankStats";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Home | Funds</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      Homepage, Coming soon!
    </>
  );
};

export default Home;
