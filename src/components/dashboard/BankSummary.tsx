"use client";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import clsx from "clsx";
import { parseAmount } from "@/lib/utils";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";

export const BankSummary = () => {
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { bankData } = useBanksCategsContext();
  const { banks } = bankData || {};
  const totalAmount =
    banks?.reduce((acc, bank) => {
      return acc + bank.balance;
    }, 0) || 0;

  return (
    <div className="flex flex-col gap-2 lg:w-[50%] w-full ">
      <div className="flex flex-row rounded-md overflow-hidden">
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
      <div className="grid xl:grid-cols-3 lg:grid-cols-2 md:grid-cols-3 grid-cols-2 gap-2">
        {banks?.map((bank, index) => {
          return (
            <div
              key={bank.name}
              className={clsx(
                "flex flex-col gap-1.5 text-slate-100 bg-slate-800 rounded-md p-1 px-2 border-2",
                `border-${colorsArray[index]}-700`
              )}
              style={{
                borderColor: colorsArray[index],
              }}
            >
              <p className="font-semibold">{bank.name}</p>
              <div className="flex flex-row gap-2 w-full justify-between">
                <p>
                  {isPrivacyModeEnabled ? "₱••••••" : parseAmount(bank.balance)}
                </p>
                <p>{((bank.balance / totalAmount) * 100).toPrecision(2)}%</p>
              </div>
            </div>
          );
        })}
      </div>
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
