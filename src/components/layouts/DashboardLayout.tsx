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

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [businessName, setBusinessName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("businessName") || "";
    setBusinessName(stored);
  }, []);

  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value);
    localStorage.setItem("businessName", value);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border flex items-center justify-between px-4 bg-card gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Button
                variant="outline"
                size="sm"
                className="hidden md:inline-flex rounded-full px-4 text-xs"
              >
                Open Anything
                <span className="ml-2 text-[10px] text-muted-foreground">Ctrl + K</span>
              </Button>
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
                <span className="font-medium">+91-0000000000</span>
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