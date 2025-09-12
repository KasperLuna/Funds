import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Settings, User, Building2, FolderOpen, Bell } from "lucide-react";
import { AccountSettings } from "./AccountSettings";
import { BankSettings } from "./banks/BankSettings";
import { CategorySettings } from "./CategorySettings";
import PushNotificationSettings from "./settings/PushNotificationSettings";
import { ToastProvider } from "../ui/toast";

export const SettingsDialogTrigger = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { queryParams } = useQueryParams();

  const isModalOpen = !!queryParams["settings"];

  return (
    <ToastProvider>
      <SettingsDialog isModalOpen={isModalOpen} trigger={children} />
    </ToastProvider>
  );
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

  const tabsConfig = [
    {
      value: "account",
      label: "Account",
      icon: User,
      component: AccountSettings,
    },
    {
      value: "banks",
      label: "Banks",
      icon: Building2,
      component: BankSettings,
    },
    {
      value: "categories",
      label: "Categories",
      icon: FolderOpen,
      component: CategorySettings,
    },
    {
      value: "notifications",
      label: "Notifications",
      icon: Bell,
      component: PushNotificationSettings,
    },
  ];

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className="bg-slate-900 text-white border-slate-700 max-w-2xl w-full h-[85vh] flex flex-col p-0"
        aria-describedby={undefined}
      >
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-3 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-orange-500" />
            <DialogTitle className="text-lg font-semibold">
              Settings
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs
            value={queryParams["settings"] || "account"}
            onValueChange={setTabValue}
            className="w-full h-full flex flex-col"
          >
            <div className="px-4 py-3">
              <TabsList className="w-full bg-slate-800 border-slate-600">
                {tabsConfig.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="flex-1 flex items-center space-x-2 text-slate-300 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 mx-2">
              {tabsConfig.map(({ value, component: Component }) => (
                <TabsContent key={value} value={value} className="mt-0 h-full">
                  <Component />
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
