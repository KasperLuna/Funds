import {
  Box,
  createStyles,
  Group,
  Paper,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons";
import React from "react";
import { useBanksQuery } from "../../firebase/queries";
import { Bank } from "../../utils/db";
import { useAuth } from "../config/AuthContext";

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
}));

const BankRingsTotal = ({ banks }: { banks: Bank[] | undefined }) => {
  const { classes } = useStyles();

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
        maximumFractionDigits: 1,
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
              maximumFractionDigits: 1,
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
  const scale = 1.1 - index * 0.1;
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
          maximumFractionDigits: 1,
        })} (${percentage}%)`}
      </Text>
    </>
  );
};

const BanksStats = () => {
  const { classes } = useStyles();
  const { user } = useAuth();
  const { banks } = useBanksQuery(user?.uid);

  const total =
    banks.reduce((acc, bank) => {
      return acc + bank.balance;
    }, 0) || 0;

  return (
    <>
      {banks.length > 0 && (
        <Paper withBorder radius={"lg"} className={classes.card}>
          <Stack spacing={0}>
            <Group position="apart" sx={{ paddingLeft: 20 }}>
              <Title size={"h3"}>Banks</Title>
              <IconExternalLink />
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
                        key={index}
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
      )}
    </>
  );
};

export default BanksStats;
