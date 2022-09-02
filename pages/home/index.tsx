import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { Container, Title } from "@mantine/core";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Home | Funds</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Container size={"xl"}>
        <Title>Dashboard Coming soon!</Title>
      </Container>
    </>
  );
};

export default Home;
