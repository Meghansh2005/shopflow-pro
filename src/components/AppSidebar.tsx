import {
  Home,
  Package,
  Users,
  Receipt,
  History,
  LogOut,
  Store,
  Wallet,
  BarChart3,
  Wrench,
  Settings,
  TrendingUp,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/api/client";

const primaryMenu = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Parties", url: "/customers", icon: Users },
  { title: "Items", url: "/inventory", icon: Package },
  { title: "Sale", url: "/billing", icon: Receipt },
  { title: "Purchase & Expense", url: "/purchases", icon: Receipt },
];

const secondaryMenu = [
  { title: "Cash & Bank", url: "/cash-bank", icon: Wallet },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Growth & Marketing", url: "/dashboard", icon: TrendingUp },
  { title: "Utilities", url: "/utilities", icon: Wrench },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "History", url: "/history", icon: History },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  const handleLogout = async () => {
    try {
      await apiFetch<void>("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      // Ignore backend logout errors, still clear client state
      console.error("Logout error:", error);
    }

    localStorage.removeItem("authToken");
    localStorage.removeItem("user");

    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });

    navigate("/auth");
  };

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Store className="h-5 w-5 text-primary" />
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="text-lg font-bold text-foreground">Shop POS</h2>
                <p className="text-xs text-muted-foreground">Management System</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryMenu.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50 transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>More</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryMenu.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50 transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {!isCollapsed && (
          <div className="mb-2 rounded-lg bg-amber-500/10 border border-amber-500/40 px-3 py-2 text-xs">
            <div className="font-semibold text-amber-900 dark:text-amber-200">
              Upgrade to Premium
            </div>
            <div className="text-amber-900/80 dark:text-amber-200/80">
              Unlock advanced reports, backups &amp; priority support.
            </div>
            <Button size="sm" className="mt-2 h-7 w-full text-xs">
              Get Premium
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}