import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Package, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";

interface DashboardStats {
  totalSalesToday: number;
  totalPendingDues: number;
  lowStockItems: number;
  totalCustomers: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSalesToday: 0,
    totalPendingDues: 0,
    lowStockItems: 0,
    totalCustomers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: shopData } = await supabase
          .from("shops")
          .select("id")
          .single();

        if (!shopData) return;

        const today = new Date().toISOString().split("T")[0];

        const [invoices, customers, products] = await Promise.all([
          supabase
            .from("invoices")
            .select("final_amount, amount_due, created_at")
            .gte("created_at", today),
          supabase.from("customers").select("balance_due").eq("customer_type", "fixed"),
          supabase
            .from("products")
            .select("current_stock, low_stock_threshold")
        ]);

        const totalSalesToday = invoices.data?.reduce((sum, inv) => sum + Number(inv.final_amount), 0) || 0;
        const totalPendingDues = customers.data?.reduce((sum, cust) => sum + Number(cust.balance_due), 0) || 0;
        const lowStockItems = products.data?.filter(p => Number(p.current_stock) <= Number(p.low_stock_threshold)).length || 0;
        const totalCustomers = customers.data?.length || 0;

        setStats({
          totalSalesToday,
          totalPendingDues,
          lowStockItems,
          totalCustomers,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Today's Sales",
      value: `₹${stats.totalSalesToday.toFixed(2)}`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Pending Dues",
      value: `₹${stats.totalPendingDues.toFixed(2)}`,
      icon: AlertTriangle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockItems,
      icon: Package,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your shop performance</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "..." : stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Use the sidebar to navigate to Inventory, Customers, Billing, Temple Orders, or History.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;