import { createStyles, Title, Text } from "@mantine/core";
import React from "react";

const useStyles = createStyles((theme) => ({
  root: {
    marginTop: theme.spacing.xl * 4,
    marginBottom: theme.spacing.xl * 4,
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },

  title: {
    textAlign: "center",
    fontSize: 45,

    [`@media (max-width: ${theme.breakpoints.md}px)`]: {
      fontSize: 43,
    },
    [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
      fontSize: 35,
    },
  },

  text: {
    textAlign: "center",
    marginBottom: theme.spacing.xl * 2,
  },

  featureTitleLeft: {
    textAlign: "start",
    fontSize: 30,

    [`@media (max-width: ${theme.breakpoints.md}px)`]: {
      fontSize: 27,
    },
    [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
      fontSize: 22,
    },
  },

  featureTitleRight: {
    textAlign: "end",
    [`@media (max-width: ${theme.breakpoints.md}px)`]: {
      fontSize: 27,
    },
    [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
      fontSize: 22,
    },
  },

  featureDescriptionLeft: {
    textAlign: "start",
    marginBottom: theme.spacing.xl * 2,
    maxWidth: 500,
  },

  featureDescriptionRight: {
    alignSelf: "flex-end",
    textAlign: "end",
    marginBottom: theme.spacing.xl * 2,
    maxWidth: 500,
  },
}));

const FeatureSection = () => {
  const { classes } = useStyles();
  return (
    <>
      <div className={classes.root}>
        <Title className={classes.title}>Features</Title>
        <Text className={classes.text}>
          Here&apos;s some of the things that makes funds ✨Special✨
        </Text>

        <Title className={classes.featureTitleLeft}>Multi-Platform</Title>
        <Text className={classes.featureDescriptionLeft}>
          Connect on your browser or on your mobile device, Funds keeps your
          data synced across all of them.
        </Text>
        <Title className={classes.featureTitleRight}>
          Progressive. Web. App.
        </Title>
        <Text className={classes.featureDescriptionRight}>
          Want a native experience on your iPhone without installing an app? Add
          this page to your homescreen and get the app experience.
        </Text>
        <Title className={classes.featureTitleLeft}>Open Source</Title>
        <Text className={classes.featureDescriptionLeft}>
          Funds is fully open-source so you know what&apos;s going on with your
          data and how its managed.
        </Text>
        <Title className={classes.featureTitleRight}>Free</Title>
        <Text className={classes.featureDescriptionRight}>
          You don&apos;t need to spend a thing! You keep your money while
          managing it.
        </Text>
      </div>
    </>
  );
};

export default FeatureSection;
