import { Select } from "@mantine/core";
import React from "react";
import { Type } from "../../utils/db";

type TypeSelectType = {
  label: string;
  value: Type;
};

const types: TypeSelectType[] = [
  { label: "Income ( + )", value: "income" },
  { label: "Expense ( - )", value: "expense" },
  { label: "Deposit ( + )", value: "deposit" },
  { label: "Withdrawal ( - )", value: "withdrawal" },
];

export const TypeInput = ({
  register,
  isError,
}: {
  register: any; //UseFormRegister<AppTxTypes>;
  isError: boolean;
}) => {
  return (
    <Select
      {...register("type")}
      data={
        types?.map((type) => ({
          value: type.value,
          label: type.label,
        })) || []
      }
      placeholder="Pick one"
      label="Type: "
      withAsterisk
      error={isError}
      sx={{ width: "100%" }}
    />
  );
};
