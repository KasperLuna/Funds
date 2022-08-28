import { NumberInput } from "@mantine/core";
import { Control, Controller } from "react-hook-form";
import { Transaction, Transfer } from "../../utils/db";

type AmountInputProps = {
    control: Control<Transaction | Transfer> | any;
    name?: string;
}

export default function AmountInput({ control, name = "amount" }: AmountInputProps) {
    return (
        <Controller control={control} name={name} rules={{ required: true }}
            render={({ field }) => (
                <NumberInput
                    label="Amount"
                    placeholder="100"
                    {...field}
                    parser={(val): string => {
                        return val!.replace(/\₱\s?|(,*)/g, '');
                    }}
                    formatter={(val): string =>
                        !Number.isNaN(parseFloat(val!))
                            ? `₱ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                            : '₱ '
                    }
                    variant="default"
                    step={50}
                    stepHoldDelay={500}
                    stepHoldInterval={100}
                />
            )}
        />
    )
}