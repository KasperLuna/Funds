import React from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { HeroSection } from "../components/frontpage/HeroSection";
import ScrollToTop from "../components/frontpage/ScrollToTop";
import FeatureSection from "../components/frontpage/FeatureSection";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Home | Funds</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <ScrollToTop />
      <HeroSection />
      <FeatureSection />
    </>
  );
};

export default Home;
