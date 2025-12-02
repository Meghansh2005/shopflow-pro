import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TransactionHistory = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transaction History</h1>
          <p className="text-muted-foreground">View all your invoices and transactions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Transaction history features coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TransactionHistory;