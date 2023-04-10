import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { Group, Paper, SimpleGrid, Text, Title } from "@mantine/core";
import BanksStats from "../../components/dashboard/BanksStats";
import { PrivacyModeButton } from "../../components/appshell/PrivacyModeButton";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Home | Funds</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Group position="apart" sx={{ paddingBottom: 15, alignItems: "center" }}>
        <Title size="h2">Dashboard</Title>
        <PrivacyModeButton />
      </Group>
      <SimpleGrid
        cols={2}
        breakpoints={[
          { maxWidth: "lg", cols: 1 },
          { maxWidth: "md", cols: 1 },
        ]}
      >
        <BanksStats />
        <Paper
          withBorder
          p="md"
          radius="md"
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text size={"lg"}> Crypto Stats will go here.</Text>
          <Text size={"xs"}> Coming soon!</Text>
        </Paper>
      </SimpleGrid>
    </>
  );
};

export default Home;
