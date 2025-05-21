import Decimal from "decimal.js";

export type VolatileCategoryInfoProps = {
  categoryTotals: Record<string, Decimal>;
  categoryData:
    | {
        categories?: { id: string; name: string }[];
      }
    | undefined;
  categoryThroughput: Record<string, number>;
  data:
    | {
        categories: string[];
        amount: number;
      }[]
    | undefined;
  baseCurrency: { code?: string } | undefined;
  parseAmount: (amount: number, code?: string) => string;
};

const VOLATILITY_MIN = 5000;
const VOLATILITY_RATIO = 3;

export const VolatileCategoryInfo = ({
  categoryTotals,
  categoryData,
  categoryThroughput,
  data,
  baseCurrency,
  parseAmount,
}: VolatileCategoryInfoProps) => {
  return (
    <div className="flex flex-col gap-1 mt-2">
      {Object.entries(categoryTotals || {}).map(([key, value]) => {
        const category = categoryData?.categories?.find((c) => c.id === key);
        const net = value.toNumber();
        const throughput = categoryThroughput[key] || 0;
        const isVolatile =
          Math.abs(net) > 0 &&
          throughput > VOLATILITY_MIN &&
          throughput / Math.abs(net) > VOLATILITY_RATIO;
        if (!isVolatile) return null;
        // Calculate inflow and outflow
        let inflow = 0,
          outflow = 0;
        if (data) {
          data.forEach((txn) => {
            if (
              (txn.categories.length === 0 && key === "no category") ||
              txn.categories.includes(key)
            ) {
              if (txn.amount > 0) inflow += txn.amount;
              if (txn.amount < 0) outflow += txn.amount;
            }
          });
        }
        const name = category
          ? category.name
          : key === "no category"
            ? "No Category"
            : key;
        return (
          <small key={key} className="text-xs text-slate-500">
            *<small className="italic text-xs">{name}</small>
            {"  "}
            volatile:&nbsp;
            <span className="text-green-600">
              +{parseAmount(inflow, baseCurrency?.code)}
            </span>
            &nbsp;-&nbsp;
            <span className="text-red-500">
              {parseAmount(Math.abs(outflow), baseCurrency?.code)}
            </span>
          </small>
        );
      })}
    </div>
  );
};
