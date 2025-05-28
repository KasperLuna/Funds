import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { X } from "lucide-react";
import { AccountSettings } from "./AccountSettings";
import { BankSettings } from "./banks/BankSettings";
import { CategorySettings } from "./CategorySettings";
import PushNotificationSettings from "./settings/PushNotificationSettings";

export const SettingsDialogTrigger = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { queryParams } = useQueryParams();

  const isModalOpen = !!queryParams["settings"];

  return <SettingsDialog isModalOpen={isModalOpen} trigger={children} />;
};
export const SettingsDialog = ({
  trigger,
  isModalOpen,
}: {
  trigger?: React.ReactNode;
  isModalOpen: boolean;
}) => {
  const { queryParams, setQueryParams } = useQueryParams();

  const setIsModalOpen = (value: boolean) => {
    setQueryParams({ settings: value ? "account" : undefined });
  };

  const setTabValue = (value: string) => {
    setQueryParams({ settings: value });
  };

  return (
    <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent
        className="bg-slate-900 text-white border-2 border-slate-800 px-4 py-1 rounded-md"
        aria-describedby={undefined}
      >
        <AlertDialogHeader className="flex flex-row w-full justify-between">
          <AlertDialogTitle className="self-center">Settings</AlertDialogTitle>
          <AlertDialogCancel className="w-fit bg-transparent p-2 border-slate-700 hover:bg-slate-400">
            <X />
          </AlertDialogCancel>
        </AlertDialogHeader>
        <Tabs
          value={queryParams["settings"]}
          onValueChange={setTabValue}
          className="w-full"
        >
          <TabsList className="w-full bg-slate-800 border-slate-600">
            {["account", "banks", "categories", "notifications"].map((value) => (
              <TabsTrigger key={value} value={value} className="w-full">
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="account">
            <AccountSettings />
          </TabsContent>
          <TabsContent value="banks">
            <BankSettings />
          </TabsContent>
          <TabsContent value="categories">
            <CategorySettings />
          </TabsContent>
          <TabsContent value="notifications">
            <PushNotificationSettings />
          </TabsContent>
        </Tabs>
      </AlertDialogContent>
    </AlertDialog>
  );
};
