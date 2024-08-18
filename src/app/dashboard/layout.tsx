"use client";
import "@/app/globals.css";
import { FundsLogo } from "@/components/icons/FundsLogo";

import { Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DesktopTabs, MobileTabs } from "@/components/Tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserCard } from "@/components/dashboard/UserCard";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { PrivacyModeProvider } from "@/lib/providers/PrivacyModeProvider";
import { AuthProvider } from "@/lib/providers/AuthProvider";
import { BanksCategsProvider } from "@/lib/providers/BanksCategsProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="max-w-[1920px] mx-auto">
      <AuthProvider>
        <PrivacyModeProvider>
          <BanksCategsProvider>
            <aside
              id="desktop-sidebar"
              className="fixed md:block hidden top-0 z-40 h-screen w-44 xl:w-60 transition-transform bg-black"
              aria-label="Sidebar"
            >
              <div className="flex py-4 px-3 justify-between h-full flex-col overflow-y-auto dark:border-slate-700 dark:bg-slate-900 pb-5">
                <div className="flex flex-col">
                  <UserCard />
                  <Separator className="mt-3 mb-2.5 w-[95%] self-center bg-slate-500" />
                  <DesktopTabs />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <FundsLogo className="xl:w-16 w-12 fill-slate-100 mb-4" />
                  <Button
                    className="flex gap-2 flex-row  bg-black w-full"
                    asChild
                  >
                    <Link href="/">
                      <Settings className="w-4 h-8 " />
                      Settings
                    </Link>
                  </Button>
                  <Separator className="w-[95%] self-center bg-slate-500/50" />
                  <SignOutButton />
                </div>
              </div>
            </aside>
            <div
              id="mobile-header"
              className="md:hidden flex-row sticky flex top-0 px-4 py-5 bg-black border-b-2 border-slate-700/50"
            >
              <Link href="/">
                <FundsLogo className="w-16 fill-slate-100 md:hidden" />
              </Link>
            </div>
            <div className="md:pr-3">
              <main className="md:ml-44 xl:ml-60 md:mb-0 mb-16 bg-black">
                <div className="flex flex-col w-full min-h-[calc(100dvh-1.1rem)] bg-slate-950 md:p-5 py-3 px-3 md:border-2 rounded-md mr-10 border-slate-500/20 my-4 ">
                  {children}
                </div>
              </main>
            </div>
            <div
              id="mobile-footer"
              className="flex md:hidden justify-center fixed bottom-0 pb-4 p-1 border-t-2 border-slate-700/50 bg-black w-full"
            >
              <MobileTabs />
            </div>
          </BanksCategsProvider>
        </PrivacyModeProvider>
      </AuthProvider>
    </div>
  );
}
