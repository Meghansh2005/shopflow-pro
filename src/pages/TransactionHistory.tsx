import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/api/client";

interface Order {
  id: number;
  customer_name: string | null;
  total_amount: number | string;
  discount: number | string;
  final_amount: number | string;
  created_at: string;
}

const TransactionHistory = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const data = await apiFetch<Order[]>("/api/orders");
        // Normalise numeric fields in case the backend returns strings
        const normalised = (data || []).map((order) => ({
          ...order,
          total_amount: Number(order.total_amount ?? 0),
          discount: Number(order.discount ?? 0),
          final_amount: Number(order.final_amount ?? 0),
        }));
        setOrders(normalised);
      } catch (err) {
        console.error("Failed to load orders", err);
        setError("Unable to load history. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transaction History</h1>
          <p className="text-muted-foreground">
            View all your invoices and billing history, day by day.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading history...</p>
            ) : error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : orders.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No invoices yet. Create a bill in the Billing section.
              </p>
            ) : (
              <div className="border rounded-md divide-y text-sm">
                <div className="grid grid-cols-[auto,2fr,auto,auto,auto] gap-2 px-3 py-2 font-medium bg-muted/60">
                  <span>#</span>
                  <span>Customer / Date</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">Discount</span>
                  <span className="text-right">Final</span>
                </div>
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="grid grid-cols-[auto,2fr,auto,auto,auto] gap-2 px-3 py-2 items-center"
                  >
                    <span className="text-xs text-muted-foreground">#{order.id}</span>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {order.customer_name || "Cash / Walk-in"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-right text-xs sm:text-sm">
                      ₹{order.total_amount.toFixed(2)}
                    </span>
                    <span className="text-right text-xs sm:text-sm">
                      -₹{order.discount.toFixed(2)}
                    </span>
                    <span className="text-right text-xs sm:text-sm font-semibold">
                      ₹{order.final_amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TransactionHistory;