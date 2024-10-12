import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Set data in localStorage
export const setLocalStorage = (name: string, value: string, hours: number) => {
  const expiration = new Date().getTime() + hours * 60 * 60 * 1000;
  const item = { value, expiration };
  localStorage.setItem(name, JSON.stringify(item));
};

// Get data from localStorage
export const getLocalStorage = (name: string): string | null => {
  const itemStr = localStorage.getItem(name);
  if (!itemStr) return null;

  const item = JSON.parse(itemStr);
  if (new Date().getTime() > item.expiration) {
    localStorage.removeItem(name); // Remove expired item
    return null;
  }

  return item.value;
};

export const setCookie = (name: string, value: string, hours: number) => {
  const date = new Date();
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  const expires = "expires=" + date.toUTCString();
  document.cookie = `${name}=${value};${expires};path=/;samesite=lax;secure`;
};

export const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (const element of ca) {
    let c = element;
    while (c.startsWith(" ")) c = c.substring(1, c.length);
    if (c.startsWith(nameEQ)) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

export const removeCookie = (name: string) => {
  document.cookie = `${name}=; Max-Age=-99999999;;`;
};

export const parseAmount = (amount?: number, currencyCode?: string) => {
  return amount?.toLocaleString(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
};

export const trimToTwoDecimals = (num: number): number => {
  // Convert to string to easily manipulate the number
  const numStr = num.toString();

  // Check if the number has a decimal part
  if (!numStr.includes(".")) {
    return Number(num.toFixed(2));
  }

  // Split the string at the decimal point
  const parts = numStr.split(".");

  // Ensure we don't exceed two decimal places
  const maxFractionDigits = Math.min(parts[1].length, 2);

  // Truncate the fractional part to two digits
  const truncatedFraction = parts[1].slice(0, maxFractionDigits);

  // Reconstruct the number string
  const resultStr = `${parts[0]}.${truncatedFraction}`;

  // Convert back to number and return
  return Number(resultStr);
};

export const convertFilesToFileList = (files?: File[]) => {
  if (!files || files.length === 0) {
    return undefined; // Return null if files is undefined or empty
  }

  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  return dataTransfer.files;
};

export const handleFiles = (files?: File[]): File[] | null => {
  if (!files || files.length === 0) {
    return null; // Return null if files is undefined or empty
  }

  return files;
};
