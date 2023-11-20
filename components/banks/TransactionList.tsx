import React, { useEffect, useState } from "react";
import {
  ActionIcon,
  Box,
  createStyles,
  Group,
  MultiSelect,
  Paper,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { EditTransactionForm } from "./EditTransactionForm";
import dayjs from "dayjs";
import { useTransactionsQuery } from "../../firebase/queries";
import { useRouter } from "next/router";
import { Category, FirebaseTxTypes } from "../../utils/db";
import { useAuth } from "../config/AuthContext";
import { useBanksCategsContext } from "./BanksCategoryContext";
import { usePrivacyMode, useTxLayout } from "../../utils/helpers";
import { MonthPickerInput } from "@mantine/dates";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCalendar,
} from "@tabler/icons-react";

const useStyles = createStyles((theme) => ({
  latestTransactionText: { marginTop: "10px" },
  tableContainer: {
    height: "65vh",

    [`@media (max-width: ${theme.breakpoints.sm})`]: {
      height: "calc(60vh - 3.5rem)",
    },
  },
  table: {
    // overflowX: "auto",
    // whiteSpace: "normal",
  },
  tableHeader: {
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors.dark[7]
        : theme.colors.gray[1],
    position: "sticky",
    top: 0,
    zIndex: 5,
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
  selectorGroup: {
    marginBottom: theme.spacing.lg,
  },
  controlGroupLabel: {
    minWidth: "120px",
  },
  monthInput: {
    minWidth: "125px",
    borderRadius: "0px",
  },
}));

const headers = ["Date", "Bank", "Amount", "Description", "Categories", ""];

const TransactionList = ({
  categoryFilter,
  setCategoryFilter,
}: {
  categoryFilter?: string[];
  setCategoryFilter: (value: string[]) => void;
}) => {
  const [txFilter, setTxFilter] = useState("latest");
  const [monthValue, setMonthValue] = useState<Date | null>(
    dayjs().startOf("month").toDate(),
  );
  const filterByValue = txFilter == "latest" ? "latest" : monthValue;
  const { query } = useRouter();
  const { user } = useAuth();
  const bank = query["bank"];
  const { transactions: rawTransactions, loading } = useTransactionsQuery(
    filterByValue,
    user?.uid,
    bank,
    categoryFilter,
  );
  const { privacyMode } = usePrivacyMode();

  useEffect(() => {
    if (categoryFilter?.length) setTxFilter("latest");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  const transactions = rawTransactions?.filter((tx) =>
    bank ? tx.bank == bank : true,
  );
  const { categoryData } = useBanksCategsContext();
  const { categories } = categoryData || {};
  const { classes } = useStyles();
  const { txLayout } = useTxLayout();

  const transactionTotal = transactions?.reduce(
    (acc, tx) => acc + tx.amount,
    0,
  );

  // Create a string array of category names that have hideable set to true
  const categoriesString = categories
    ?.filter((categ) => categ.hideable)
    .map((categ) => categ.name);

  return (
    <>
      <Text
        weight={"bolder"}
        size="lg"
        className={classes.latestTransactionText}
      >
        Transactions
      </Text>
      <Group className={classes.selectorGroup}>
        <SegmentedControl
          value={txFilter}
          onChange={(value) => {
            setTxFilter(value);
            setCategoryFilter([]);
          }}
          classNames={{ label: classes.controlGroupLabel }}
          data={[
            { label: "Latest", value: "latest" },
            {
              label: "By Month",
              value: "monthly",
            },
          ]}
        />
        {txFilter == "monthly" && (
          <Group spacing={0}>
            <ActionIcon
              variant="default"
              size={"36px"}
              style={{
                borderRight: 0,
                borderRadius: 0,
                borderBottomLeftRadius: "4px",
                borderTopLeftRadius: "4px",
              }}
              onClick={(event) => {
                event.preventDefault();
                setMonthValue(dayjs(monthValue).subtract(1, "month").toDate());
              }}
            >
              <IconArrowLeft />
            </ActionIcon>
            <MonthPickerInput
              icon={<IconCalendar size="20px" stroke={1.5} />}
              placeholder="Select Month"
              value={monthValue}
              onChange={setMonthValue}
              classNames={{ input: classes.monthInput }}
              valueFormat="MMM YYYY"
            />
            <ActionIcon
              variant="default"
              size={"36px"}
              style={{
                borderLeft: 0,
                borderRadius: 0,
                borderBottomRightRadius: "4px",
                borderTopRightRadius: "4px",
              }}
              onClick={(event) => {
                event.preventDefault();
                setMonthValue(dayjs(monthValue).add(1, "month").toDate());
              }}
            >
              <IconArrowRight />
            </ActionIcon>
          </Group>
        )}
      </Group>
      <ScrollArea
        className={classes.tableContainer}
        type="auto"
        offsetScrollbars={true}
      >
        {Boolean(transactions?.length) ? (
          <>
            {txLayout != "table" ? (
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
                  const isHideable = categoriesString?.some((categ) => {
                    return transaction.category?.includes(categ);
                  });
                  return (
                    <div key={transaction.id}>
                      <TransactionCard
                        data={transaction}
                        categories={categories}
                        hideable={isHideable}
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
                horizontalSpacing={"xs"}
                className={classes.table}
              >
                <thead className={classes.tableHeader}>
                  <tr>
                    {headers.map((header) => {
                      return <th key={header}>{header}</th>;
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
                  {transactions?.map((transaction) => {
                    const isHideable = categoriesString?.some((categ) => {
                      return transaction.category?.includes(categ);
                    });
                    return (
                      <tr key={transaction.id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {dayjs(transaction.date?.seconds * 1000).format(
                            "MMM D",
                          )}
                        </td>
                        <td>{transaction.bank}</td>
                        <td>
                          {privacyMode && isHideable ? (
                            "₱••••••"
                          ) : (
                            <Text
                              color={transaction.amount > 0 ? "green" : "red"}
                            >
                              {transaction.amount.toLocaleString(undefined, {
                                style: "currency",
                                currency: "PHP",
                                maximumFractionDigits: 2,
                                minimumFractionDigits: 0,
                              })}
                            </Text>
                          )}
                        </td>
                        <td>{transaction.description}</td>
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
                              value={transaction.category}
                              readOnly
                              zIndex={1}
                            />
                          </Box>
                        </td>
                        <td>
                          <EditTransactionForm {...transaction} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </>
        ) : (
          <Skeleton visible={loading} radius="md">
            <Box className={classes.noBanksBox}>
              <Text>
                No transactions exist or match the current filters, Click
                &quot;Add&quot; and add a transaction or change the selected
                filters.
              </Text>
            </Box>
          </Skeleton>
        )}
      </ScrollArea>
      <Text
        size={"xs"}
        italic
        color={transactionTotal > 0 ? "green" : "red"}
        sx={{ marginTop: "10px", width: "fit-content", alignSelf: "center" }}
      >
        Total for current filters:{" "}
        {transactionTotal.toLocaleString(undefined, {
          style: "currency",
          currency: "PHP",
          maximumFractionDigits: 2,
          minimumFractionDigits: 0,
        })}
      </Text>
    </>
  );
};

const TransactionCard = ({
  data,
  categories,
  hideable,
}: {
  data: FirebaseTxTypes;
  categories?: Category[];
  hideable?: boolean;
}) => {
  const { classes } = useStyles();
  const { privacyMode } = usePrivacyMode();
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
                {privacyMode && hideable
                  ? "₱••••••"
                  : data.amount.toLocaleString(undefined, {
                      style: "currency",
                      currency: "PHP",
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 0,
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
