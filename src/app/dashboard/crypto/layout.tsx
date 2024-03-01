import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Funds - Crypto",
  description: "Funds - A personal finance tracker app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
