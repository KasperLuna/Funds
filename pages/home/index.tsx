import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { Group, SimpleGrid, Title } from "@mantine/core";
import BanksStats from "../../components/dashboard/BanksStats";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Home | Funds</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Group position="apart" sx={{ paddingBottom: 15 }}>
        <Title size="h2">Dashboard</Title>
      </Group>
      <SimpleGrid
        cols={2}
        breakpoints={[
          { maxWidth: "lg", cols: 2 },
          { maxWidth: "md", cols: 1 },
        ]}
      >
        <BanksStats />
        {/* <BanksStats /> */}
      </SimpleGrid>
    </>
  );
};

export default Home;
