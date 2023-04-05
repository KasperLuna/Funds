import {
  Anchor,
  Box,
  createStyles,
  Group,
  Paper,
  RingProgress,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons";
import Link from "next/link";
import React from "react";
import { Bank } from "../../utils/db";
import { useBanksCategsContext } from "../banks/BanksCategoryContext";

export const colorsArray = [
  "red",
  "green",
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
  card: {
    paddingRight: theme.spacing.xs,
    paddingBlock: theme.spacing.xs,
  },
  emptyPageCard: {
    padding: theme.spacing.xl,
  },
}));

const BankRingsTotal = ({ banks }: { banks: Bank[] | undefined }) => {
  if (!banks) return null;
  const total =
    banks.reduce((acc, bank) => {
      return acc + bank.balance;
    }, 0) || 0;
  const banksPercentages = banks.map((bank, index) => {
    return {
      name: bank.name,
      value: (bank.balance / total || 0) * 100,
      color: colorsArray[index],
      tooltip: `${bank.name} bal: ${bank.balance.toLocaleString(undefined, {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 2,
        minimumFractionDigits: 1,
      })}`,
    };
  });

  return (
    <>
      <RingProgress
        size={200}
        thickness={25}
        label={
          <Text size="xs" align="center" px="xs" sx={{ pointerEvents: "none" }}>
            Total:
            {total.toLocaleString(undefined, {
              style: "currency",
              currency: "PHP",
              maximumFractionDigits: 2,
              minimumFractionDigits: 1,
            })}
          </Text>
        }
        sections={banksPercentages}
        sx={{ justifySelf: "center", flexShrink: 1 }}
      />
    </>
  );
};

const TopLeaderRow = ({
  index,
  name,
  balance,
  percentage,
  color,
}: {
  index: number;
  name: string;
  balance: number;
  percentage: string;
  color: string;
}) => {
  const scale = 1;
  return (
    <>
      <Text
        sx={{
          transform: `scale(${scale})`,
          whiteSpace: "nowrap",
          display: "flex",
        }}
      >
        <Box
          sx={{
            backgroundColor: color,
            width: 6,
            height: 12,
            borderRadius: 5,
            marginRight: 5,
            alignSelf: "center",
          }}
        />
        {`${index + 1}. ${name} ${balance.toLocaleString(undefined, {
          style: "currency",
          currency: "PHP",
          maximumFractionDigits: 2,
          minimumFractionDigits: 1,
        })} (${percentage}%)`}
      </Text>
    </>
  );
};

const BanksStats = () => {
  const { classes } = useStyles();
  const { bankData } = useBanksCategsContext();
  const { banks, loading } = bankData || {};

  const total =
    banks?.reduce((acc, bank) => {
      return acc + bank.balance;
    }, 0) || 0;

  return (
    <>
      <Skeleton visible={loading} radius="md">
        {banks && banks.length > 0 ? (
          <Paper withBorder radius={"lg"} className={classes.card}>
            <Stack spacing={0}>
              <Group position="apart" sx={{ paddingLeft: 20 }}>
                <Title size={"h3"}>Banks</Title>
                <Link href="/banks" passHref>
                  <Anchor>
                    <IconExternalLink />
                  </Anchor>
                </Link>
              </Group>

              <SimpleGrid
                cols={2}
                breakpoints={[
                  { maxWidth: "lg", cols: 2 },
                  { maxWidth: "md", cols: 2 },
                  { maxWidth: "sm", cols: 1 },
                  { maxWidth: "xs", cols: 1 },
                ]}
              >
                <BankRingsTotal banks={banks} />
                <Stack
                  justify={"center"}
                  align="center"
                  sx={{ marginInline: 30, flexShrink: 0 }}
                >
                  <Title size={"h4"} sx={{ whiteSpace: "nowrap" }}>
                    Highest Value Accounts
                  </Title>
                  <Stack spacing={5}>
                    {banks.slice(0, 4).map((bank, index) => {
                      return (
                        <TopLeaderRow
                          key={bank.name}
                          index={index}
                          name={bank.name}
                          balance={bank.balance}
                          color={colorsArray[index]}
                          percentage={((bank.balance / total) * 100).toFixed(0)}
                        />
                      );
                    })}
                  </Stack>
                </Stack>
              </SimpleGrid>
            </Stack>
          </Paper>
        ) : (
          <Paper withBorder radius={"lg"} className={classes.emptyPageCard}>
            <Title size={"h3"}>Banks</Title>
            You don&apos;t seem to have any banks yet. Head over to the{" "}
            <Link href="/banks" passHref>
              <Anchor>Banks Tab</Anchor>
            </Link>{" "}
            and add a couple along with your transactions to see your stats!
          </Paper>
        )}
      </Skeleton>
    </>
  );
};

export default BanksStats;
