import { Type } from "./db";
import { useLocalStorage } from "@mantine/hooks";

export const txPosOrNeg = (num: number, type: Type) => {
  if (type === "income" || type === "deposit") {
    return num;
  } else {
    return -num;
  }
};

export const useTxLayout = () => {
  const [txLayout, setTxLayout] = useLocalStorage<"table" | "card">({
    key: "transaction-layout",
    defaultValue: "card",
  });

  return { txLayout, setTxLayout };
};

export const usePrivacyMode = () => {
  const [privacyMode, setPrivacyMode] = useLocalStorage<boolean>({
    key: "privacy-mode",
    defaultValue: false,
  });

  return { privacyMode, setPrivacyMode };
};
