import {
  Box,
  createStyles,
  Group,
  Paper,
  SimpleGrid,
  Text,
  Progress,
  rem,
  Stack,
} from "@mantine/core";
import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react";
import React from "react";
import { useBanksCategsContext } from "../banks/BanksCategoryContext";
import { useGetTimePeriodTxns } from "../../firebase/queries";
import { useAuth } from "../config/AuthContext";
import dayjs from "dayjs";
import { usePrivacyMode } from "../../utils/helpers";
import { AppTxTypes } from "../../utils/db";

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
  topGroup: {
    flexWrap: "nowrap",
    [`@media (max-width: ${theme.breakpoints.sm})`]: {
      flexWrap: "wrap",
      justifyContent: "center",
      textAlign: "center",
    },
  },
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
  percentStack: {
    [`@media (max-width: ${theme.breakpoints.sm})`]: {
      alignItems: "center",
    },
  },
}));

function BanksStats() {
  const { user } = useAuth();
  const { classes } = useStyles();
  const { bankData } = useBanksCategsContext();
  const { banks } = bankData || {};
  const { privacyMode } = usePrivacyMode();

  const { transactions: thisMonthTxns } = useGetTimePeriodTxns(
    user?.uid || "",
    dayjs().startOf("month").toDate(),
    dayjs().endOf("month").toDate()
  );
  const { transactions: thisWeekTxns } = useGetTimePeriodTxns(
    user?.uid || "",
    dayjs().startOf("week").toDate(),
    dayjs().endOf("week").toDate()
  );

  const currentBanksTotal =
    banks?.reduce((acc, bank) => {
      return acc + bank.balance;
    }, 0) || 0;
  const currentMonthTransactions = thisMonthTxns?.reduce((acc, transaction) => {
    return acc + transaction.amount;
  }, 0);
  const currentWeekTransactions = thisWeekTxns?.reduce((acc, transaction) => {
    return acc + transaction.amount;
  }, 0);

  const prevMonthTotal = currentBanksTotal - currentMonthTransactions;
  const prevWeekTotal = currentBanksTotal - currentWeekTransactions;

  let monthDiff;
  if (prevMonthTotal !== 0) {
    monthDiff = parseInt(
      (((currentBanksTotal - prevMonthTotal) / prevMonthTotal) * 100).toFixed(0)
    );
  } else {
    monthDiff = 100;
  }

  let weekDiff;
  if (prevWeekTotal !== 0) {
    weekDiff = parseInt(
      (((currentBanksTotal - prevWeekTotal) / prevWeekTotal) * 100).toFixed(0)
    );
  } else {
    weekDiff = 100;
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
        <Text fw={700} size="sm">
          {privacyMode ? "₱••••••" : stat.count}
        </Text>
        <Text c={stat.color} fw={700} size="xs" className={classes.statCount}>
          {stat.part}%
        </Text>
      </Group>
    </Box>
  ));

  const Percentages = ({
    diff,
    txns,
    text,
  }: {
    diff: number;
    txns: AppTxTypes[];
    text: string;
  }) => {
    const icon =
      txns?.length > 0 && diff > 0 ? (
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
      );

    return (
      <Paper p={"xs"} radius={"md"}>
        <Stack spacing={0} className={classes.percentStack}>
          <Text
            c={diff > 0 ? "green" : "red"}
            className={classes.diff}
            fz="sm"
            fw={700}
          >
            {txns?.length > 0 && <Text fz="md">{diff}%</Text>}
            {icon}
          </Text>
          <Text c="dimmed" fz="xs">
            {text}
          </Text>
        </Stack>
      </Paper>
    );
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Group position="apart" className={classes.topGroup}>
        <Stack spacing={0}>
          <Text fz="25px" fw={900}>
            {privacyMode
              ? "₱••••••"
              : currentBanksTotal.toLocaleString(undefined, {
                  style: "currency",
                  currency: "PHP",
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 1,
                })}
          </Text>
          <Text size={"xs"}>Total Banks Balance</Text>
        </Stack>
        <Group noWrap>
          <Percentages
            diff={weekDiff}
            txns={thisWeekTxns}
            text={
              thisWeekTxns?.length > 0
                ? `change since end of last week (${dayjs()
                    .subtract(1, "week")
                    .endOf("week")
                    .format("MMMM D")})`
                : "Add transactions in the banks tab to see your total balance."
            }
          />
          <Percentages
            diff={monthDiff}
            txns={thisMonthTxns}
            text={
              thisMonthTxns?.length > 0
                ? `change since end of last month (${dayjs()
                    .subtract(1, "month")
                    .format("MMMM")})`
                : "Add transactions in the banks tab to see your total balance."
            }
          />
        </Group>
      </Group>

      <Progress
        sections={segments}
        size={40}
        classNames={{ label: classes.progressLabel }}
        mt={10}
      />
      <SimpleGrid cols={3} breakpoints={[{ maxWidth: "xs", cols: 2 }]} mt="xl">
        {descriptions}
      </SimpleGrid>
    </Paper>
  );
}

export default BanksStats;
