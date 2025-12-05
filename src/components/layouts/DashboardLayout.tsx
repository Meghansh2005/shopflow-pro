import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { PhoneCall } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const SETTINGS_EVENT = "dashboard-settings-update";
const DEFAULT_SUPPORT_PHONE = "+91-0000000000";

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [businessName, setBusinessName] = useState("");
  const [supportPhone, setSupportPhone] = useState(DEFAULT_SUPPORT_PHONE);
  const navigate = useNavigate();

  const syncHeaderSettings = () => {
    setBusinessName(localStorage.getItem("businessName") || "");
    setSupportPhone(localStorage.getItem("supportPhone") || DEFAULT_SUPPORT_PHONE);
  };

  useEffect(() => {
    syncHeaderSettings();
    const handler = () => syncHeaderSettings();
    window.addEventListener(SETTINGS_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_EVENT, handler);
  }, []);

  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value);
    localStorage.setItem("businessName", value);
    window.dispatchEvent(new Event(SETTINGS_EVENT));
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border flex items-center justify-between px-4 bg-card gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
            </div>

            <div className="flex-1 flex flex-col items-center gap-1 max-w-xl">
              <Input
                value={businessName}
                onChange={(e) => handleBusinessNameChange(e.target.value)}
                placeholder="Enter Business Name"
                className="h-8 text-center text-sm font-medium"
              />
              <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground">
                <PhoneCall className="h-3 w-3" />
                <span>Customer Support:</span>
                <span className="font-medium">{supportPhone}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-5"
                onClick={() => navigate("/billing")}
              >
                + Add Sale
              </Button>
              <Button
                size="sm"
                className="bg-sky-500 hover:bg-sky-600 text-white rounded-full px-5"
                onClick={() => navigate("/purchases")}
              >
                + Add Purchase
              </Button>
            </div>
          </header>
          <div className="flex-1 p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;