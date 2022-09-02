import { NativeSelect } from "@mantine/core";
import React from "react";
import { UseFormRegister } from "react-hook-form";
import { AppTxTypes, Type } from "../../utils/db";

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
  register: UseFormRegister<AppTxTypes>;
  isError: boolean;
}) => {
  return (
    <NativeSelect
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
