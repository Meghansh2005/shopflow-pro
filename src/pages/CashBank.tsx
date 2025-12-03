import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CashBank = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cash &amp; Bank</h1>
          <p className="text-muted-foreground">
            Track cash in hand and bank account balances in one place.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Cash in Hand</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">₹0.00</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Bank Balance</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">₹0.00</CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CashBank;


