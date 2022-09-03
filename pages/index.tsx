import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { Container } from "@mantine/core";
import { AuthForm } from "../components/form/AuthForm";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Home | Funds</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Container size={"xl"}>
        <AuthForm />
        <a href="/home">Home</a>
      </Container>
    </>
  );
};

export default Home;
