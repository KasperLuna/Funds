import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { Container, createStyles } from "@mantine/core";
import { HeroSection } from "../components/frontpage/HeroSection";
import ScrollToTop from "../components/frontpage/ScrollToTop";
import FeatureSection from "../components/frontpage/FeatureSection";

const useStyles = createStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
}));

const Home: NextPage = () => {
  const { classes } = useStyles();
  return (
    <>
      <Head>
        <title>Home | Funds</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Container size={"lg"} className={classes.root}>
        <ScrollToTop />
        <HeroSection />
        <FeatureSection />
      </Container>
    </>
  );
};

export default Home;
