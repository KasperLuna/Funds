import React from "react";
import {
  Box,
  createStyles,
  Group,
  MultiSelect,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { EditTransactionForm } from "./EditTransactionForm";
import dayjs from "dayjs";
import {
  useCategoriesQuery,
  useTransactionsQuery,
} from "../../firebase/queries";
import { useRouter } from "next/router";
import { Category, FirebaseTxTypes } from "../../utils/db";
import { useAuth } from "../config/AuthContext";

const useStyles = createStyles((theme) => ({
  latestTransactionText: { marginTop: "20px" },
  tableContainer: {
    overflowX: "auto",
    height: "100%",
  },
  card: {
    // border: `1px solid ${theme.colors.gray[7]}`,
    padding: theme.spacing.xs,
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    height: "100%",
    borderRadius: theme.radius.md,
    paddingTop: theme.spacing.lg,
  },
  stack: {
    padding: 0,
    alignContent: "center",
    height: "100%",
  },
  dateText: {
    borderBottom: `1px solid ${
      theme.colorScheme === "dark"
        ? "rgba(255, 255, 255, 0.6)"
        : "rgba(0, 0, 0, 0.5)"
    }`,
    whiteSpace: "nowrap",
  },
  bankName: { paddingTop: 5, maxWidth: 55, lineHeight: 1, textAlign: "start" },
  description: {
    paddingBlock: theme.spacing.xs,
  },
  category: {
    marginTop: 5,
    justifySelf: "end",
  },
  tableCategory: {
    maxWidth: 250,
    minWidth: 100,
  },
  cardPesoValue: {
    fontSize: 23,
    lineHeight: 1,
    flexShrink: 1,
    whiteSpace: "nowrap",
  },

  noBanksBox: {
    textAlign: "center",
    border: `1px dashed ${
      theme.colorScheme === "dark" ? theme.colors.gray[8] : theme.colors.gray[4]
    }`,
    color:
      theme.colorScheme === "dark"
        ? theme.colors.gray[5]
        : theme.colors.gray[8],
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    height: "100%",
  },
}));

const headers = ["Date", "Bank", "Amount", "Description", "Categories", ""];

const TransactionList = ({ bank }: { bank?: string | string[] }) => {
  const { user } = useAuth();
  const { transactions, loading } = useTransactionsQuery(user?.uid, bank);
  const { categories } = useCategoriesQuery(user?.uid);
  const { classes } = useStyles();
  const { query } = useRouter();

  return (
    <>
      <Text
        weight={"bolder"}
        size="lg"
        className={classes.latestTransactionText}
      >
        Latest Transactions
      </Text>
      <Box className={classes.tableContainer}>
        <Skeleton visible={loading} radius="md">
          {Boolean(transactions?.length) ? (
            <>
              {query.layout != "table" ? (
                <SimpleGrid
                  cols={4}
                  breakpoints={[
                    { maxWidth: "lg", cols: 3 },
                    { maxWidth: "md", cols: 2 },
                    { maxWidth: "sm", cols: 2 },
                    { maxWidth: "xs", cols: 1 },
                  ]}
                >
                  {transactions?.map((transaction) => {
                    return (
                      <div key={transaction.id}>
                        <TransactionCard
                          data={transaction}
                          categories={categories}
                        />
                      </div>
                    );
                  })}
                </SimpleGrid>
              ) : (
                <Table
                  striped
                  highlightOnHover
                  captionSide="bottom"
                  horizontalSpacing={"sm"}
                >
                  <thead>
                    <tr>
                      {headers.map((header, index) => {
                        return <th key={index}>{header}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {Boolean(!transactions?.length) && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center" }}>
                          No Items. Click &quot;Add&quot; to add a new
                          transaction.
                        </td>
                      </tr>
                    )}
                    {transactions?.map((data) => {
                      return (
                        <tr key={data.id}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {dayjs(data.date?.seconds * 1000).format("MMM D")}
                          </td>
                          <td>
                            <Text color={data.amount > 0 ? "green" : "red"}>
                              {data.amount.toLocaleString(undefined, {
                                style: "currency",
                                currency: "PHP",
                                maximumFractionDigits: 1,
                              })}
                            </Text>
                          </td>
                          <td>{data.bank}</td>
                          <td>{data.description}</td>
                          <td style={{ alignItems: "start" }}>
                            <Box className={classes.tableCategory}>
                              <MultiSelect
                                data={
                                  categories?.map((categ) => ({
                                    value: categ.name,
                                    label: categ.name,
                                  })) || []
                                }
                                size="xs"
                                value={data.category}
                                readOnly
                              />
                            </Box>
                          </td>
                          <td>
                            <EditTransactionForm {...data} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
              ]
            </>
          ) : (
            <Box className={classes.noBanksBox}>
              <Text>
                No transactions exist or match the current filters, Click
                &quot;Add&quot; and add a transaction or change the selected
                filters.
              </Text>
            </Box>
          )}
        </Skeleton>
      </Box>
    </>
  );
};

const TransactionCard = ({
  data,
  categories,
}: {
  data: FirebaseTxTypes;
  categories?: Category[];
}) => {
  const { classes } = useStyles();
  return (
    <>
      <Paper withBorder className={classes.card}>
        <Stack spacing={0} className={classes.stack} justify="space-between">
          <Group position="apart" align="flex-start" noWrap>
            <Stack spacing={0} align="center">
              <Text weight={"bolder"} size="md" className={classes.dateText}>
                {dayjs(data.date.seconds * 1000).format("MMM D")}
              </Text>

              <Text
                weight={"normal"}
                size="xs"
                lineClamp={2}
                className={classes.bankName}
              >
                {data.bank}
              </Text>
            </Stack>
            <Stack spacing={0} align="center">
              <Text
                weight={"bolder"}
                size="xl"
                className={classes.cardPesoValue}
                color={data.amount > 0 ? "green" : "red"}
              >
                {data.amount.toLocaleString(undefined, {
                  style: "currency",
                  currency: "PHP",
                  maximumFractionDigits: 0,
                })}
              </Text>
              <Text size={"xs"}> {data.description}</Text>
            </Stack>
            <EditTransactionForm {...data} />
          </Group>

          <Box className={classes.category}>
            <MultiSelect
              data={
                categories?.map((categ) => ({
                  value: categ.name,
                  label: categ.name,
                })) || []
              }
              size="xs"
              value={data.category}
              className={classes.category}
              readOnly
            />
          </Box>
        </Stack>
      </Paper>
    </>
  );
};
export default TransactionList;
