import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Reports = () => {
  const reportSections = [
    "Sale",
    "Purchase",
    "Day book",
    "All Transactions",
    "Profit And Loss",
    "Bill Wise Report",
    "Cash flow",
    "Trial Balance Report",
    "Balance Sheet",
    "Party report",
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">
            Get a clear view of your sales, purchases, cash flow, and overall business health.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[260px,1fr]">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm">Transaction reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {reportSections.map((label) => (
                <button
                  key={label}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-muted"
                >
                  <span>{label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="flex items-center justify-center border-dashed">
            <CardContent className="text-center space-y-2">
              <CardTitle className="text-lg">Select a report on the left</CardTitle>
              <p className="text-sm text-muted-foreground">
                We&apos;ll show detailed numbers and charts here once you choose a report type.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;


