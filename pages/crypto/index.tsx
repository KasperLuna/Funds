import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { Anchor, Breadcrumbs, Title, Text } from "@mantine/core";
import Link from "next/link";

const Home: NextPage = () => {
  const pages = [{ title: "Crypto", href: "/banks" }].map((page) => (
    <Link href={page.href} key={page.title} passHref>
      <Anchor>{page.title}</Anchor>
    </Link>
  ));
  return (
    <>
      <Head>
        <title>Crypto | Funds</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Breadcrumbs>{pages}</Breadcrumbs>
      <Title size="h2">Crypto Prices</Title>
      <Text>Coming Soon!</Text>
    </>
  );
};

export default Home;
