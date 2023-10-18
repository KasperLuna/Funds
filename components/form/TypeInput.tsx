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

type TypeInputProps = {
  onChange: (value: Type) => void;
  value: string;
  isError?: boolean;
};

export const TypeInput = React.forwardRef(
  (
    { onChange, value, isError }: TypeInputProps,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ref: React.Ref<HTMLSelectElement>,
  ): JSX.Element => {
    return (
      <Select
        data={
          types?.map((type) => ({
            value: type.value,
            label: type.label,
          })) || []
        }
        onChange={onChange}
        value={value}
        placeholder="Pick one"
        label="Type: "
        withAsterisk
        error={isError}
        sx={{ width: "100%" }}
        withinPortal={true}
      />
    );
  },
);
