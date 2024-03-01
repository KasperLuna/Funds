"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BitcoinIcon, Home, LandmarkIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TabTrigger = ({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) => {
  return (
    <TabsTrigger value={value} className="w-full p-0">
      <Link
        className="flex flex-row gap-2 w-full justify-start align-center p-3 px-5 data-[state=active]:bg-slate-300"
        href={value}
      >
        {children}
      </Link>
    </TabsTrigger>
  );
};

export const DesktopTabs = () => {
  const pathname = usePathname();
  return (
    <Tabs
      role="navigation"
      defaultValue={pathname}
      className="flex justify-end"
    >
      <TabsList className="flex-col h-fit w-full gap-2 bg-transparent fill-slate-200">
        <TabTrigger value="/dashboard">
          <Home className="w-5 h-5" />
          Home
        </TabTrigger>

        <TabTrigger value="/dashboard/banks">
          <LandmarkIcon className="w-5 h-5" />
          Banks
        </TabTrigger>
        <TabTrigger value="/dashboard/crypto">
          <BitcoinIcon className="w-5 h-5" />
          Crypto
        </TabTrigger>
      </TabsList>
    </Tabs>
  );
};

export const MobileTabs = () => {
  const pathname = usePathname();
  return (
    <Tabs
      role="navigation"
      defaultValue={pathname}
      className="flex justify-end"
    >
      <TabsList className="h-fit w-full gap-3 bg-transparent fill-slate-200">
        <TabTrigger value="/dashboard">
          <Home className="w-5 h-5" />
          Home
        </TabTrigger>

        <TabTrigger value="/dashboard/banks">
          <LandmarkIcon className="w-5 h-5" />
          Banks
        </TabTrigger>
        <TabTrigger value="/dashboard/crypto">
          <BitcoinIcon className="w-5 h-5" />
          Crypto
        </TabTrigger>
      </TabsList>
    </Tabs>
  );
};
