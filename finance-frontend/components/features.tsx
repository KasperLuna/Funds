import React from "react";
import {
  createStyles,
  Title,
  SimpleGrid,
  Text,
  Button,
  ThemeIcon,
  Grid,
  Col,
} from "@mantine/core";
import {
  ReceiptOff,
  Flame,
  CircleDotted,
  FileCode,
  ChartAreaLine,
  Eye,
} from "tabler-icons-react";

const useStyles = createStyles((theme) => ({
  wrapper: {
    padding: `${theme.spacing.xl * 2}px ${theme.spacing.xl}px`,
  },

  title: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    fontSize: 36,
    fontWeight: 900,
    lineHeight: 1.1,
    marginBottom: theme.spacing.md,
    color: theme.colorScheme === "dark" ? theme.white : theme.black,
  },
}));

const features = [
  {
    icon: ReceiptOff,
    title: "Free. Forever.",
    description:
      "Financhee will always be free, leaving users' money where it can stay and grow.",
  },
  {
    icon: FileCode,
    title: "Open-Source",
    description:
      "We know you're concerned with where your data goes, so we've made Financhee open-source to let users decide.",
  },
  {
    icon: ChartAreaLine,
    title: "Smart Charts",
    description:
      "Show only what you need and not a pixel more, That's what we believe in and stand by with giving users the control over their visualizations.",
  },
  {
    icon: Eye,
    title: "Flexible",
    description:
      "Giving you control over how the tools look and feel is how we respect you and your eyes, no more blinding webpages at night.",
  },
];

export function FeaturesTitle() {
  const { classes } = useStyles();

  const items = features.map((feature) => (
    <div key={feature.title}>
      <ThemeIcon
        size={44}
        radius="md"
        variant="gradient"
        gradient={{ deg: 133, from: "blue", to: "cyan" }}
      >
        <feature.icon size={26} />
      </ThemeIcon>
      <Text size="lg" mt="sm" weight={500}>
        {feature.title}
      </Text>
      <Text color="dimmed" size="sm">
        {feature.description}
      </Text>
    </div>
  ));

  return (
    <div className={classes.wrapper}>
      <Grid gutter={80} pt={50}>
        <Col span={12} md={5}>
          <Title className={classes.title} order={2}>
            The streamlined approach to managing and controlling your financial
            assets.
          </Title>
          <Text color="dimmed">
            Track and manage your financial assets with ease – Financhee gives
            users the edge in monitoring where their finances go and grow.
          </Text>
        </Col>
        <Col span={12} md={7}>
          <SimpleGrid
            cols={2}
            spacing={30}
            breakpoints={[{ maxWidth: "md", cols: 1 }]}
          >
            {items}
          </SimpleGrid>
        </Col>
      </Grid>
    </div>
  );
}
