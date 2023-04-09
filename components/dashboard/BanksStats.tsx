import {
  Box,
  createStyles,
  Group,
  Paper,
  SimpleGrid,
  Text,
  Progress,
  rem,
} from "@mantine/core";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconDeviceAnalytics,
} from "@tabler/icons-react";
import React from "react";
import { useBanksCategsContext } from "../banks/BanksCategoryContext";
import { useGetThisMonthTxns } from "../../firebase/queries";
import { useAuth } from "../config/AuthContext";
import dayjs from "dayjs";

export const colorsArray = [
  "green",
  "red",
  "blue",
  "yellow",
  "teal",
  "cyan",
  "violet",
  "indigo",
  "pink",
  "orange",
  "lime",
  "emerald",
  "purple",
  "fuchsia",
  "sky",
];

const useStyles = createStyles((theme) => ({
  progressLabel: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    lineHeight: 1,
    fontSize: theme.fontSizes.xs,
  },

  stat: {
    borderBottom: `${rem(3)} solid`,
    paddingBottom: rem(5),
  },

  statCount: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    lineHeight: 1.3,
  },

  diff: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    display: "flex",
    alignItems: "center",
  },

  icon: {
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[3]
        : theme.colors.gray[4],
  },
}));

function BanksStats() {
  const { user } = useAuth();
  const { classes } = useStyles();
  const { bankData } = useBanksCategsContext();
  const { banks } = bankData || {};

  const { transactions } = useGetThisMonthTxns(user?.uid || "");

  const currentBanksTotal =
    banks?.reduce((acc, bank) => {
      return acc + bank.balance;
    }, 0) || 0;
  const currentMonthTransactions = transactions?.reduce((acc, transaction) => {
    return acc + transaction.amount;
  }, 0);
  const prevMonthTotal = currentBanksTotal - currentMonthTransactions;

  let diff;
  if (prevMonthTotal !== 0) {
    diff = parseInt(
      (((currentBanksTotal - prevMonthTotal) / prevMonthTotal) * 100).toFixed(0)
    );
  } else {
    diff = 100; // set diff to 100% if prevMonthTotal is zero
  }

  const data = banks?.map((bank, index) => ({
    label: bank.name,
    count: bank.balance.toLocaleString(undefined, {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }),
    part: parseFloat(((bank.balance / currentBanksTotal) * 100).toFixed(1)),
    color: colorsArray[index],
  }));

  const segments = data?.map((segment) => ({
    value: segment.part,
    color: segment.color,
    label: segment.part > 10 ? `${segment.part}%` : undefined,
  }));

  const descriptions = data?.map((stat) => (
    <Box
      key={stat.label}
      sx={{ borderBottomColor: stat.color }}
      className={classes.stat}
    >
      <Text tt="uppercase" fz="xs" c="dimmed" fw={700}>
        {stat.label}
      </Text>

      <Group position="apart" align="flex-end" spacing={0}>
        <Text fw={700}>{stat.count}</Text>
        <Text c={stat.color} fw={700} size="sm" className={classes.statCount}>
          {stat.part}%
        </Text>
      </Group>
    </Box>
  ));

  return (
    <Paper withBorder p="md" radius="md">
      <Group position="apart">
        <Group align="flex-end" spacing="xs">
          <Text fz="xl" fw={700}>
            {currentBanksTotal.toLocaleString(undefined, {
              style: "currency",
              currency: "PHP",
              maximumFractionDigits: 2,
              minimumFractionDigits: 1,
            })}
          </Text>
          <Text
            c={diff > 0 ? "green" : "red"}
            className={classes.diff}
            fz="sm"
            fw={700}
          >
            {transactions?.length > 0 && <span>{diff}%</span>}
            {transactions?.length > 0 &&
              (diff > 0 ? (
                <IconArrowUpRight
                  size="1rem"
                  style={{ marginBottom: rem(4) }}
                  stroke={1.5}
                />
              ) : (
                <IconArrowDownRight
                  size="1rem"
                  style={{ marginBottom: rem(4) }}
                  stroke={1.5}
                />
              ))}
          </Text>
        </Group>
        <IconDeviceAnalytics
          size="1.4rem"
          className={classes.icon}
          stroke={1.5}
        />
      </Group>

      <Text c="dimmed" fz="sm">
        {transactions?.length > 0
          ? `Banks total balance compared to last month (${dayjs()
              .subtract(1, "month")
              .format("MMMM")})`
          : "Add transactions in the banks tab to see your total balance."}
      </Text>

      <Progress
        sections={segments}
        size={40}
        classNames={{ label: classes.progressLabel }}
        mt={10}
      />
      <SimpleGrid cols={3} breakpoints={[{ maxWidth: "xs", cols: 1 }]} mt="xl">
        {descriptions}
      </SimpleGrid>
    </Paper>
  );
}

export default BanksStats;
