import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TempleOrders = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Temple & Event Orders</h1>
          <p className="text-muted-foreground">Manage special orders for temples and events</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Special Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Temple orders management coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TempleOrders;