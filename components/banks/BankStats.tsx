import React from "react";
import {
  Box,
  createStyles,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Text,
} from "@mantine/core";
import { IconArrowUpRight, IconArrowDownRight } from "@tabler/icons";
// import { useBanksQuery } from "../../firebase/queries";
import { useAuth } from "../config/AuthContext";
import { useBanksQuery } from "../../firebase/queries";

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

  noBanksBox: {
    textAlign: "center",
    border: `1px dashed ${theme.colors.gray[6]}`,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    height: "100%",
  },

  banksText: {
    marginBottom: theme.spacing.md,
  },
  skeleton: {
    minHeight: 70,
    width: "100%",
  },
}));

export function BankStats() {
  const { user } = useAuth();
  const { banks, loading } = useBanksQuery(user?.uid);

  const { classes } = useStyles();
  const stats = banks?.map((bank) => {
    const diff = 1;
    const DiffIcon = diff > 0 ? IconArrowUpRight : IconArrowDownRight;

    return (
      <Paper
        withBorder
        p="md"
        radius="md"
        key={bank.name || ""}
        className={classes.paper}
      >
        <Group position="apart" spacing={0}>
          <Text size="xs" color="dimmed" className={classes.title}>
            {bank.name}
          </Text>
          <Text
            color={diff > 0 ? "teal" : "red"}
            size="xs"
            weight={500}
            className={classes.diff}
          >
            <span>{diff}%</span>
            <DiffIcon size={12} stroke={1.5} />
          </Text>
        </Group>

        <Group sx={{ justifyContent: "center" }} spacing="xs" mt={10}>
          <Text className={classes.value}>
            {bank.balance.toLocaleString(undefined, {
              style: "currency",
              currency: "PHP",
              maximumFractionDigits: 1,
            })}
          </Text>
        </Group>
      </Paper>
    );
  });
  return (
    <div className={classes.root}>
      <Text weight={"bolder"} size="xl" className={classes.banksText}>
        Bank Balances
      </Text>

      <Skeleton visible={loading} className={classes.skeleton}>
        {Boolean(!banks?.length) ? (
          <Box className={classes.noBanksBox}>
            <Text>No Banks! Select the dropdown and add a bank.</Text>
          </Box>
        ) : (
          <SimpleGrid
            cols={5}
            breakpoints={[
              { maxWidth: "lg", cols: 4 },
              { maxWidth: "md", cols: 3 },
              { maxWidth: "xs", cols: 2 },
            ]}
          >
            {stats}
          </SimpleGrid>
        )}
      </Skeleton>
    </div>
  );
}
