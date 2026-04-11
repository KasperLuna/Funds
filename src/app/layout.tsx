import "@/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { AuthProvider } from "@/lib/providers/AuthProvider";
import { TokensProvider } from "@/lib/providers/TokensProvider";
import { UnsupportedBrowserWarning } from "@/components/UnsupportedBrowserWarning";

export const metadata: Metadata = {
  title: "Funds",
  description: "Personal Finance Tracker",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/icons/icon-192.png" },
  ],
  manifest: "/manifest.json",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Funds",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body>
        <UnsupportedBrowserWarning />
        <QueryProvider>
          <AuthProvider>
            <TokensProvider>{children}</TokensProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
