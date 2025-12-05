import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/api/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface Order {
  id: number;
  customer_name: string | null;
  total_amount: number | string;
  discount: number | string;
  final_amount: number | string;
  created_at: string;
}

interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
}

interface OrderDetail extends Order {
  items: OrderItem[];
}

const formatCurrency = (value: number | string) =>
  `₹${Number(value ?? 0).toFixed(2)}`;

const TransactionHistory = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const data = await apiFetch<Order[]>("/api/orders");
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

  const openDetail = async (orderId: number) => {
    setActiveOrderId(orderId);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const detail = await apiFetch<OrderDetail>(`/api/orders/${orderId}`);
      setOrderDetail({
        ...detail,
        total_amount: Number(detail.total_amount ?? 0),
        discount: Number(detail.discount ?? 0),
        final_amount: Number(detail.final_amount ?? 0),
        items: (detail.items || []).map((item) => ({
          ...item,
          quantity: Number(item.quantity ?? 0),
          price: Number(item.price ?? 0),
        })),
      });
    } catch (err) {
      console.error("Failed to load order detail", err);
      setError("Unable to load bill details.");
    } finally {
      setDetailLoading(false);
    }
  };

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
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => openDetail(order.id)}
                    className="grid w-full grid-cols-[auto,2fr,auto,auto,auto] gap-2 px-3 py-2 items-center hover:bg-muted/60 text-left"
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
                      {formatCurrency(order.total_amount)}
                    </span>
                    <span className="text-right text-xs sm:text-sm">
                      -{formatCurrency(order.discount)}
                    </span>
                    <span className="text-right text-xs sm:text-sm font-semibold">
                      {formatCurrency(order.final_amount)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setActiveOrderId(null);
            setOrderDetail(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Bill Details</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 text-sm">
            {detailLoading || !orderDetail ? (
              <p className="text-sm text-muted-foreground">
                {detailLoading ? "Loading bill..." : "Select an invoice to view details."}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      {orderDetail.customer_name || "Cash / Walk-in"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(orderDetail.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>Invoice #{orderDetail.id}</div>
                  </div>
                </div>

                <div className="border rounded-md">
                  <div className="grid grid-cols-[2fr,auto,auto] text-xs font-medium bg-muted/60 px-3 py-2">
                    <span>Item</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Amount</span>
                  </div>
                  {orderDetail.items.map((item) => (
                    <div
                      key={`${item.product_id}-${item.product_name}`}
                      className="grid grid-cols-[2fr,auto,auto] text-xs px-3 py-1.5"
                    >
                      <span>{item.product_name}</span>
                      <span className="text-right">{item.quantity}</span>
                      <span className="text-right">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(orderDetail.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span>-{formatCurrency(orderDetail.discount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Total</span>
                    <span>{formatCurrency(orderDetail.final_amount)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default TransactionHistory;