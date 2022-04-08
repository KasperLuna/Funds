import type { NextPage } from "next";
import Head from "next/head";
import { RefObject, useRef } from "react";
import { FeaturesTitle } from "../components/features";
import { FooterSimple } from "../components/footer";
import { HeroText } from "../components/hero";
import { HeaderMiddle } from "../components/navBar";
import styles from "../styles/Home.module.css";
import useOnScreen from "../utils/useOnScreen";

const footerLinks = [
  {
    link: "about",
    label: "About",
  },
  {
    link: "team",
    label: "Team",
  },
  {
    link: "contact",
    label: "Contact",
  },
];

const Home: NextPage = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  const headerLinks = [
    {
      ref: heroRef,
      label: "Overview",
    },
    {
      ref: featuresRef,
      label: "Features",
    },
  ];

  return (
    <>
      <div className={styles.container}>
        <Head>
          <title>Finance</title>
          <meta name="description" content="Generated by create next app" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <HeaderMiddle links={headerLinks} />
        <div ref={heroRef}>
          <HeroText />
        </div>
        <div ref={featuresRef}>
          <FeaturesTitle />
        </div>

        <FooterSimple links={footerLinks} />
      </div>
    </>
  );
};

export default Home;
