import { Type } from "./db";

export const txPosOrNeg = (num: number, type: Type) => {
  if (type === "income" || type === "deposit") {
    return num;
  } else {
    return -num;
  }
};
