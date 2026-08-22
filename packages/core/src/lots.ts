export interface Lot {
  type: "buy" | "sell";
  amount: number;
  price: number;
  date: string;
}

export interface Holdings {
  total: number;
  costAvg: number;
}

export interface RealizedPLResult {
  realizedPL: number;
  updatedHoldings: Holdings;
}

export function computeHoldings(lots: Lot[]): Holdings {
  let totalQty = 0;
  let totalCost = 0;

  const sorted = [...lots].sort((a, b) => a.date.localeCompare(b.date));

  for (const lot of sorted) {
    if (lot.type === "buy") {
      totalQty += lot.amount;
      totalCost += lot.amount * lot.price;
    } else {
      const costPerUnit = totalQty > 0 ? totalCost / totalQty : 0;
      totalCost -= costPerUnit * lot.amount;
      totalQty -= lot.amount;
    }
  }

  return {
    total: Math.max(totalQty, 0),
    costAvg: totalQty > 0 ? totalCost / totalQty : 0,
  };
}

export function computeRealizedPL(
  sellLot: Lot,
  currentHoldings: Holdings,
): RealizedPLResult {
  if (sellLot.type !== "buy") {
    const costBasis = currentHoldings.costAvg * sellLot.amount;
    const proceeds = sellLot.amount * sellLot.price;
    const realizedPL = proceeds - costBasis;

    const newTotal = Math.max(currentHoldings.total - sellLot.amount, 0);
    const newCost = newTotal > 0 ? currentHoldings.costAvg * (currentHoldings.total - sellLot.amount) : 0;

    return {
      realizedPL,
      updatedHoldings: {
        total: newTotal,
        costAvg: newTotal > 0 ? newCost / newTotal : 0,
      },
    };
  }

  const newTotal = currentHoldings.total + sellLot.amount;
  const newCost = currentHoldings.costAvg * currentHoldings.total + sellLot.amount * sellLot.price;
  return {
    realizedPL: 0,
    updatedHoldings: {
      total: newTotal,
      costAvg: newTotal > 0 ? newCost / newTotal : 0,
    },
  };
}
