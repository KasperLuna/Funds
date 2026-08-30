import { DashboardProviders, DashboardShell } from "@/components/app-shell/dashboard-providers";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <DashboardProviders>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProviders>
  );
};

export default DashboardLayout;
