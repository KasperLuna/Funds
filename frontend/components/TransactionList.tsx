import React from "react";
import { Box, Table, Text } from "@mantine/core";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../utils/db";
import { EditTransactionForm } from "../components/EditTransactionForm";
import dayjs from "dayjs";

const headers = ["Date", "Description", "Bank", "Amount", ""];

const TransactionList = () => {
  const transactions = useLiveQuery(async () => {
    return db.transactions.orderBy("date").reverse().toArray();
  });
  return (
    <>
      <Text weight={"bolder"} size="lg" sx={{ marginTop: "20px" }}>
        Latest Transactions
      </Text>
      <Box sx={{ overflowX: "auto", height: "100%" }}>
        <Table
          striped
          highlightOnHover
          captionSide="bottom"
          sx={{ marginBottom: 20 }}
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
                  No Items. Click &quot;Add&quot; to add a new transaction.
                </td>
              </tr>
            )}
            {transactions?.map((data) => {
              return (
                <tr key={data.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {dayjs(data.date).format("MMM D, YYYY")}
                  </td>
                  <td>{data.description}</td>
                  <td>{data.bank}</td>
                  <td>
                    <Text color={data.amount > 0 ? "green" : "red"}>
                      {data.amount.toLocaleString(undefined, {
                        style: "currency",
                        currency: "PHP",
                        maximumFractionDigits: 1,
                      })}
                    </Text>
                  </td>
                  <td>
                    <EditTransactionForm {...data} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <caption>Seven (7) latest recorded transactions.</caption>
        </Table>
      </Box>
    </>
  );
};
export default TransactionList;
