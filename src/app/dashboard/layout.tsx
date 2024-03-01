import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { FundsLogo } from "@/components/icons/FundsLogo";

import { LogOut, LogOutIcon, ScanFace, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DesktopTabs, MobileTabs } from "@/components/Tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Funds - Dashboard",
  description: "Funds - A personal finance tracker app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <aside
        id="desktop-sidebar"
        className="fixed md:block hidden left-0 top-0 z-40 h-screen w-44 xl:w-60 transition-transform bg-black"
        aria-label="Sidebar"
      >
        <div className="flex py-4 px-3 justify-between h-full flex-col overflow-y-auto dark:border-slate-700 dark:bg-slate-900 pb-5">
          <div className="flex flex-col">
            <div className="p-2 rounded-md text-slate-100 bg-slate-900 border-2 border-slate-800 flex flex-row gap-3 items-center">
              <ScanFace className="w-8 h-8" />
              <div className="flex gap-0 flex-col overflow-hidden text-ellipsis">
                <h3 className="overflow-hidden text-ellipsis whitespace-nowrap">
                  Kasper Luna
                </h3>
                <small className="overflow-hidden text-ellipsis text-slate-400">
                  mail@kasperluna.com
                </small>
              </div>
            </div>
            <Separator className="mt-3 mb-2.5 w-[95%] self-center bg-slate-500" />
            <DesktopTabs />
          </div>
          <div className="flex flex-col items-center gap-1">
            <FundsLogo className="xl:w-16 w-12 fill-slate-100 mb-4" />
            <Button className="flex gap-2 flex-row  bg-black w-full" asChild>
              <Link href="/">
                <Settings className="w-4 h-8 " />
                Settings
              </Link>
            </Button>
            <Separator className="w-[95%] self-center bg-slate-500/50" />
            <Button className="flex gap-2 flex-row  bg-black w-full" asChild>
              <Link href="/">
                <LogOutIcon className="w-4 h-8 " />
                Sign Out
              </Link>
            </Button>
          </div>
        </div>
      </aside>
      <div
        id="mobile-header"
        className="md:hidden flex-row sticky flex top-0 h-16 px-4 bg-black border-b-2 border-slate-700/50"
      >
        <FundsLogo className="w-16 fill-slate-100 md:hidden" />
      </div>
      <main className="md:ml-44 xl:ml-60 md:mb-0 mb-16 bg-black">
        <div className="flex flex-col w-full my-2 min-h-[calc(100dvh-1.1rem)] bg-slate-950 md:p-5 py-3 px-3 md:border-2 rounded-l-md border-slate-500/20">
          {children}
        </div>
      </main>
      <div
        id="mobile-footer"
        className="flex md:hidden justify-center fixed bottom-0 h-16 p-1 border-t-2 border-slate-700/50 bg-black w-full"
      >
        <MobileTabs />
      </div>
    </div>
  );
}
