import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Funds",
  description: "Personal finance tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Funds",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Extend into the iOS safe area so env(safe-area-inset-bottom) reports a
  // real value; without it the standalone PWA's bottom nav and sheets sit
  // under the home indicator. (layout.tsx header + dashboard/layout.tsx nav
  // + dialog.tsx already consume the inset.)
  viewportFit: "cover",
  // Chrome Android: treat the on-screen keyboard as part of the layout
  // viewport so 100dvh tracks the visible (non-keyboard) area. iOS Safari
  // ignores this; on iOS the sheet's own overflow region handles focus.
  interactiveWidget: "resizes-content",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en" className={cn(inter.variable, spaceGrotesk.variable, "bg-black")}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-black">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
};

export default RootLayout;
