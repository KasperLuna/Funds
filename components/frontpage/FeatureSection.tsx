import {
  createStyles,
  Title,
  Text,
  Stack,
  Group,
  Box,
  Anchor,
} from "@mantine/core";
import {
  IconCashOff,
  IconDeviceMobile,
  IconDevices,
  IconLockOpenOff,
} from "@tabler/icons-react";
import Link from "next/link";
import React from "react";

const useStyles = createStyles((theme) => ({
  root: {
    marginBlock: "7rem",
    display: "flex",
    flexDirection: "column",
    width: "100%",

    [`@media (max-width: ${theme.breakpoints.xl}px)`]: {
      marginTop: "3rem",
      marginBottom: "3rem",
    },

    [`@media (max-width: ${theme.breakpoints.md}px)`]: {
      marginTop: "2rem",
      marginBottom: "2rem",
    },

    [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
      marginTop: "1rem",
      marginBottom: "1rem",
    },
  },

  title: {
    textAlign: "center",
    fontSize: 43,

    [`@media (max-width: ${theme.breakpoints.md}px)`]: {
      fontSize: 38,
    },
    [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
      fontSize: 30,
    },
  },

  text: {
    textAlign: "center",
    marginBottom: "3rem",
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
    marginBottom: "2.5rem",
    maxWidth: 500,
  },

  featureDescriptionRight: {
    alignSelf: "flex-end",
    textAlign: "end",
    marginBottom: "2.5rem",
    maxWidth: 500,
  },

  leftFeatureGroup: {
    justifySelf: "flex-start",
    alignSelf: "flex-start",
    alignItems: "start",
    width: "100%",
  },

  rightFeatureGroup: {
    justifySelf: "flex-end",
    alignSelf: "flex-end",
    alignItems: "start",
    width: "100%",
    maxWidth: 600,
  },

  featureIconBox: {
    width: 100,
    height: 100,
    borderRadius: "25%",
    backgroundImage: "linear-gradient(45deg, #E8580F, #85CB33)",
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[8]
        : theme.colors.gray[0],
    flex: "0 0 auto",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  featuresContainer: {
    display: "flex",
    flexDirection: "column",
    maxWidth: "90%",
    minWidth: "70vw",
    marginInline: "auto",
  },
}));

const FeatureSection = () => {
  const { classes } = useStyles();
  return (
    <>
      <div className={classes.root}>
        <Title className={classes.title}>Why Funds?</Title>
        <Text className={classes.text}>
          Here are some of the things that make Funds ✨Special✨
        </Text>

        <div className={classes.featuresContainer}>
          <Group noWrap className={classes.leftFeatureGroup}>
            <Box className={classes.featureIconBox}>
              <IconDevices size={65} />
            </Box>
            <Stack spacing={2}>
              <Title className={classes.featureTitleLeft}>Multi-Platform</Title>
              <Text className={classes.featureDescriptionLeft}>
                Connect on your browser or on your mobile device, Funds keeps
                your data synced across all of them.
              </Text>
            </Stack>
          </Group>
          <Group noWrap className={classes.rightFeatureGroup}>
            <Stack spacing={2}>
              <Title className={classes.featureTitleRight}>
                Progressive. Web. App.
              </Title>
              <Text className={classes.featureDescriptionRight}>
                Using an iPhone? Use the share sheet in Safari and Add this page
                to your homescreen to get the app experience.
              </Text>
            </Stack>
            <Box className={classes.featureIconBox}>
              <IconDeviceMobile size={65} />
            </Box>
          </Group>
          <Group noWrap className={classes.leftFeatureGroup}>
            <Box className={classes.featureIconBox}>
              <IconLockOpenOff size={65} />
            </Box>
            <Stack spacing={2}>
              <Title className={classes.featureTitleLeft}>Open Source</Title>
              <Text className={classes.featureDescriptionLeft}>
                Funds is{" "}
                <Anchor
                  component={Link}
                  href="https://github.com/KasperLuna/Funds"
                  target={"_blank"}
                >
                  fully open-source
                </Anchor>{" "}
                so you know what&apos;s going on with the site.
              </Text>
            </Stack>
          </Group>
          <Group noWrap className={classes.rightFeatureGroup}>
            <Stack spacing={2}>
              <Title className={classes.featureTitleRight}>Free</Title>
              <Text className={classes.featureDescriptionRight}>
                You don&apos;t need to spend a thing! You keep your money while
                managing it.
              </Text>
            </Stack>
            <Box className={classes.featureIconBox}>
              <IconCashOff size={65} />
            </Box>
          </Group>
        </div>
      </div>
    </>
  );
};

export default FeatureSection;
