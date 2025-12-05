import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { apiFetch } from "@/api/client";

interface SalesSummaryItem {
  product_name: string;
  totalQty: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
}

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

  const [summary, setSummary] = useState<SalesSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<SalesSummaryItem[]>("/api/reports/sales-summary");
        setSummary(data || []);
      } catch (err: any) {
        console.error("Failed to load report", err);
        setError(err?.message || "Unable to load report.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totals = useMemo(() => {
    return summary.reduce(
      (acc, row) => {
        acc.revenue += row.totalRevenue;
        acc.cost += row.totalCost;
        acc.profit += row.profit;
        return acc;
      },
      { revenue: 0, cost: 0, profit: 0 },
    );
  }, [summary]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports &amp; Analytics</h1>
          <p className="text-muted-foreground">
            See which items are selling fast and how much profit each contributes.
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
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left ${
                    label === "Profit And Loss" ? "bg-primary/10 font-medium" : "hover:bg-muted"
                  }`}
                >
                  <span>{label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profit snapshot</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                <div className="rounded-md bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-xl font-semibold">₹{totals.revenue.toFixed(2)}</p>
                </div>
                <div className="rounded-md bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="text-xl font-semibold">₹{totals.cost.toFixed(2)}</p>
                </div>
                <div className="rounded-md bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Profit</p>
                  <p className="text-xl font-semibold text-emerald-600">
                    ₹{totals.profit.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top performing products</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading report...</p>
                ) : error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : summary.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Start billing to populate this report.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary} margin={{ top: 10, right: 20, left: 0, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="product_name"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number, name) =>
                          name === "profit"
                            ? [`₹${value.toFixed(2)}`, "Profit"]
                            : [`₹${value.toFixed(2)}`, name === "totalRevenue" ? "Revenue" : "Cost"]
                        }
                      />
                      <Bar dataKey="totalRevenue" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profit table</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-2">Product</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Revenue</th>
                      <th className="py-2 text-right">Cost</th>
                      <th className="py-2 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row) => (
                      <tr key={row.product_name} className="border-t text-xs">
                        <td className="py-2">{row.product_name}</td>
                        <td className="py-2 text-right">{row.totalQty}</td>
                        <td className="py-2 text-right">₹{row.totalRevenue.toFixed(2)}</td>
                        <td className="py-2 text-right">₹{row.totalCost.toFixed(2)}</td>
                        <td className="py-2 text-right text-emerald-600">
                          ₹{row.profit.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;


