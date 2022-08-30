import React from "react";
import { NumberInput, Sx } from "@mantine/core";
import { Control, Controller } from "react-hook-form";
import { Transaction, Transfer } from "../../utils/db";

type AmountInputProps = {
  control: Control<Transaction | Transfer | any>;
  name?: string;
  label?: string;
  sx?: Sx;
};

export default function AmountInput({
  control,
  name = "amount",
  sx,
  label = "Amount: ",
}: AmountInputProps) {
  return (
    <Controller
      control={control}
      name={name}
      rules={{ required: true, validate: (value) => value != 0 }}
      render={({ field }) => (
        <NumberInput
          label={label}
          placeholder="100"
          {...field}
          decimalSeparator="."
          withAsterisk
          variant="default"
          precision={1}
          min={0}
          step={50}
          stepHoldDelay={500}
          stepHoldInterval={100}
          sx={{ ...sx }}
        />
      )}
    />
  );
}
