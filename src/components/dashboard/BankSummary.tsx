"use client";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import clsx from "clsx";

export const BankSummary = () => {
  const { bankData } = useBanksCategsContext();
  const { banks } = bankData || {};
  const totalAmount =
    banks?.reduce((acc, bank) => {
      return acc + bank.balance;
    }, 0) || 0;

  return (
    <div className="flex flex-row rounded-md lg:w-[50%] w-full overflow-hidden">
      {banks?.map((bank, index) => {
        return (
          <ProgressSection
            key={bank.name}
            percentage={(bank.balance / totalAmount) * 100}
            color={colorsArray[index]}
          />
        );
      })}
    </div>
  );
};

export const colorsArray = [
  "orange",
  "red",
  "green",
  "blue",
  "teal",
  "violet",
  "indigo",
  "pink",
  "yellow",
  "lime",
  "cyan",
  "emerald",
  "purple",
  "fuchsia",
  "sky",
];

const ProgressSection = ({
  percentage,
  color,
}: {
  percentage: number;
  color?: string;
}) => {
  return (
    <div
      className="flex flex-row justify-center items-center h-10"
      style={{
        width: `${percentage}%`,
        backgroundColor: color,
      }}
    >
      <small
        className={clsx({
          hidden: percentage < 10,
        })}
      >
        {percentage.toPrecision(2)}%
      </small>
    </div>
  );
};
