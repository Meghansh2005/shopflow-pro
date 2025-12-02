import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Billing = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Billing & POS</h1>
          <p className="text-muted-foreground">Create invoices and process sales</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Point of Sale</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Billing interface coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Billing;