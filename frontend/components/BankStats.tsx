import React from "react";
import { createStyles, Group, Paper, SimpleGrid, Text } from "@mantine/core";
import { IconArrowUpRight, IconArrowDownRight } from "@tabler/icons";

const useStyles = createStyles((theme) => ({
  root: {
    paddingBottom: "20px",
  },

  value: {
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1,
  },

  diff: {
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    padding: 0,
    margin: 0,
  },

  icon: {
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[3]
        : theme.colors.gray[4],
  },

  title: {
    fontWeight: 700,
    textTransform: "uppercase",
    maxWidth: "65%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  paper: {
    paddingLeft: 0,
  },
}));

const data = [
  {
    title: "BPI",
    value: "13,456",
    diff: 34,
  },
  {
    title: "BDO",
    value: "4,145",
    diff: -13,
  },
  {
    title: "CIMB",
    value: "745",
    diff: 18,
  },
  {
    title: "Cash",
    value: "188",
    diff: -30,
  },
];

export function BankStats() {
  const { classes } = useStyles();
  const stats = data.map((stat) => {
    const DiffIcon = stat.diff > 0 ? IconArrowUpRight : IconArrowDownRight;

    return (
      <Paper
        withBorder
        p="md"
        radius="md"
        key={stat.title}
        className={classes.paper}
      >
        <Group position="apart" spacing={0}>
          <Text size="xs" color="dimmed" className={classes.title}>
            {stat.title}
          </Text>
          <Text
            color={stat.diff > 0 ? "teal" : "red"}
            size="xs"
            weight={500}
            className={classes.diff}
          >
            <span>{stat.diff}%</span>
            <DiffIcon size={12} stroke={1.5} />
          </Text>
        </Group>

        <Group sx={{ justifyContent: "center" }} spacing="xs" mt={10}>
          <Text className={classes.value}>₱ {stat.value}</Text>
        </Group>
      </Paper>
    );
  });
  return (
    <div className={classes.root}>
      <SimpleGrid
        cols={4}
        breakpoints={[
          { maxWidth: "md", cols: 3 },
          { maxWidth: "xs", cols: 2 },
        ]}
      >
        {stats}
      </SimpleGrid>
    </div>
  );
}
