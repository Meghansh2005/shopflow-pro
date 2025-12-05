import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Package, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { apiFetch } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface DashboardStats {
  totalSalesToday: number;
  totalPendingDues: number;
  lowStockItems: number;
  totalCustomers: number;
}

interface OrderSummary {
  id: number;
  customer_name: string | null;
  total_amount: number;
  discount: number;
  final_amount: number;
  created_at: string;
}

interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
}

interface OrderDetail extends OrderSummary {
  items: OrderItem[];
}

interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  address?: string | null;
  type?: string | null;
  dues: number;
}

interface Product {
  id: number;
  name: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  category?: string | null;
  price: number;
}

interface SalesSummaryItem {
  product_name: string;
  totalQty: number;
  totalAmount: number;
}

const formatCurrency = (value: number) => `₹${Number(value || 0).toFixed(2)}`;

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSalesToday: 0,
    totalPendingDues: 0,
    lowStockItems: 0,
    totalCustomers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [salesSheetOpen, setSalesSheetOpen] = useState(false);
  const [todayOrders, setTodayOrders] = useState<OrderSummary[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);

  const [dueSheetOpen, setDueSheetOpen] = useState(false);
  const [dueCustomers, setDueCustomers] = useState<Customer[]>([]);
  const [dueLoading, setDueLoading] = useState(false);
  const [dueError, setDueError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [customerActionMessage, setCustomerActionMessage] = useState<string | null>(null);
  const [customerActionError, setCustomerActionError] = useState<string | null>(null);

  const [lowStockSheetOpen, setLowStockSheetOpen] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [lowStockLoading, setLowStockLoading] = useState(false);
  const [lowStockError, setLowStockError] = useState<string | null>(null);

  const [salesSummary, setSalesSummary] = useState<SalesSummaryItem[]>([]);
  const [salesSummaryLoading, setSalesSummaryLoading] = useState(false);
  const [salesSummaryError, setSalesSummaryError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setError(null);
        const data = await apiFetch<DashboardStats>("/api/dashboard/stats");
        setStats(data);
      } catch (err: any) {
        console.error("Error fetching stats:", err);
        setError(err?.message || "Unable to load dashboard statistics.");
      } finally {
        setLoading(false);
      }
    };

    const fetchSalesSummary = async () => {
      try {
        setSalesSummaryLoading(true);
        setSalesSummaryError(null);
        const data = await apiFetch<SalesSummaryItem[]>("/api/reports/sales-summary");
        setSalesSummary(data || []);
      } catch (err: any) {
        console.error("Failed to load sales summary", err);
        setSalesSummaryError(err?.message || "Unable to load sales summary.");
      } finally {
        setSalesSummaryLoading(false);
      }
    };

    fetchStats();
    fetchSalesSummary();
  }, []);

  const loadTodayOrders = async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const data = await apiFetch<OrderSummary[]>("/api/orders");
      const normalized = (data || []).map((order) => ({
        ...order,
        total_amount: Number(order.total_amount ?? 0),
        discount: Number(order.discount ?? 0),
        final_amount: Number(order.final_amount ?? 0),
      }));
      const today = new Date().toDateString();
      const filtered = normalized.filter(
        (order) => new Date(order.created_at).toDateString() === today,
      );
      setTodayOrders(filtered);
      if (filtered.length > 0 && !activeOrderId) {
        setActiveOrderId(filtered[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load orders", err);
      setOrdersError(err?.message || "Unable to load today's orders.");
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadOrderDetail = async (orderId: number) => {
    setOrderDetailLoading(true);
    setSelectedOrder(null);
    try {
      const detail = await apiFetch<OrderDetail>(`/api/orders/${orderId}`);
      setSelectedOrder({
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
    } catch (err: any) {
      console.error("Failed to load order detail", err);
      setOrdersError(err?.message || "Unable to load bill details.");
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const loadDueCustomers = async () => {
    setDueLoading(true);
    setDueError(null);
    try {
      const data = await apiFetch<Customer[]>("/api/customers");
      const mapped = (data || [])
        .map((customer) => ({
          ...customer,
          dues: Number(customer.dues ?? 0),
        }))
        .sort((a, b) => Number(b.dues ?? 0) - Number(a.dues ?? 0));
      setDueCustomers(mapped);
      setSelectedCustomer(mapped[0] ?? null);
    } catch (err: any) {
      console.error("Failed to load customers", err);
      setDueError(err?.message || "Unable to load customers.");
    } finally {
      setDueLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedCustomer) return;
    const currentDues = Number(selectedCustomer.dues ?? 0);
    const payment =
      settleAmount.trim() === "" ? currentDues : Number(settleAmount.trim());

    if (Number.isNaN(payment) || payment <= 0) {
      setCustomerActionError("Enter a valid amount to settle.");
      return;
    }

    const newDue = Math.max(currentDues - payment, 0);
    try {
      setCustomerActionError(null);
      setCustomerActionMessage(null);
      const payload = {
        ...selectedCustomer,
        dues: newDue,
      };
      await apiFetch(`/api/customers/${selectedCustomer.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setDueCustomers((prev) =>
        prev
          .map((c) => (c.id === selectedCustomer.id ? payload : c))
          .sort((a, b) => Number(b.dues ?? 0) - Number(a.dues ?? 0)),
      );
      setSelectedCustomer(payload);
      setSettleAmount("");
      setCustomerActionMessage(
        newDue === 0 ? "Dues cleared. You can delete this customer if needed." : "Payment recorded.",
      );
    } catch (err: any) {
      console.error("Failed to settle dues", err);
      setCustomerActionError(err?.message || "Unable to update customer.");
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    if (!window.confirm(`Delete ${selectedCustomer.name}? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/customers/${selectedCustomer.id}`, {
        method: "DELETE",
      });
      const updated = dueCustomers.filter((c) => c.id !== selectedCustomer.id);
      setDueCustomers(updated);
      setSelectedCustomer(updated[0] ?? null);
      setCustomerActionMessage("Customer deleted.");
    } catch (err: any) {
      console.error("Failed to delete customer", err);
      setCustomerActionError(err?.message || "Unable to delete customer.");
    }
  };

  const loadLowStockItems = async () => {
    setLowStockLoading(true);
    setLowStockError(null);
    try {
      const data = await apiFetch<Product[]>("/api/products");
      const mapped = (data || [])
        .map((product) => ({
          ...product,
          price: Number(product.price ?? 0),
          quantity: Number(product.quantity ?? 0),
        }))
        .filter((product) => product.quantity <= 5)
        .sort((a, b) => a.quantity - b.quantity);
      setLowStockItems(mapped);
    } catch (err: any) {
      console.error("Failed to load products", err);
      setLowStockError(err?.message || "Unable to load products.");
    } finally {
      setLowStockLoading(false);
    }
  };

  useEffect(() => {
    if (salesSheetOpen && todayOrders.length === 0 && !ordersLoading) {
      loadTodayOrders();
    }
  }, [salesSheetOpen]);

  useEffect(() => {
    if (salesSheetOpen && activeOrderId) {
      loadOrderDetail(activeOrderId);
    }
  }, [salesSheetOpen, activeOrderId]);

  useEffect(() => {
    if (dueSheetOpen && dueCustomers.length === 0 && !dueLoading) {
      loadDueCustomers();
    }
  }, [dueSheetOpen]);

  useEffect(() => {
    if (lowStockSheetOpen && lowStockItems.length === 0 && !lowStockLoading) {
      loadLowStockItems();
    }
  }, [lowStockSheetOpen]);

  const statCards = [
    {
      title: "Today's Sales",
      value: formatCurrency(stats.totalSalesToday),
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
      onClick: () => setSalesSheetOpen(true),
    },
    {
      title: "Pending Dues",
      value: formatCurrency(stats.totalPendingDues),
      icon: AlertTriangle,
      color: "text-warning",
      bgColor: "bg-warning/10",
      onClick: () => setDueSheetOpen(true),
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockItems.toString(),
      icon: Package,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      onClick: () => setLowStockSheetOpen(true),
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers.toString(),
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
            <Card
              key={stat.title}
              role={stat.onClick ? "button" : undefined}
              onClick={stat.onClick}
              className={cn(
                "transition hover:shadow-md",
                stat.onClick && "cursor-pointer focus-visible:ring-2",
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : error ? "--" : stat.value}
                </div>
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
              Use the sidebar to navigate to Inventory, Customers, Billing, or History. Quick summaries above are now clickable.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {salesSummaryLoading ? (
              <p className="text-sm text-muted-foreground">Loading sales summary...</p>
            ) : salesSummaryError ? (
              <p className="text-sm text-destructive">{salesSummaryError}</p>
            ) : salesSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">Start billing to see demand trends here.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesSummary} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="text-muted-foreground/40" />
                  <XAxis
                    dataKey="product_name"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => value.toString()} />
                  <Bar dataKey="totalQty" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Sales Sheet */}
      <Sheet
        open={salesSheetOpen}
        onOpenChange={(open) => {
          setSalesSheetOpen(open);
          if (!open) {
            setSelectedOrder(null);
            setActiveOrderId(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Today&apos;s Transactions</SheetTitle>
            <SheetDescription>Tap a bill to view all line items.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr,1fr]">
            <div className="space-y-3">
              {ordersLoading ? (
                <p className="text-sm text-muted-foreground">Loading orders...</p>
              ) : ordersError ? (
                <p className="text-sm text-destructive">{ordersError}</p>
              ) : todayOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sales recorded today.</p>
              ) : (
                <div className="border rounded-md divide-y">
                  {todayOrders.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setActiveOrderId(order.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 hover:bg-muted/60",
                        activeOrderId === order.id && "bg-muted",
                      )}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Invoice #{order.id}</span>
                        <span>{formatCurrency(order.final_amount)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>{order.customer_name || "Cash / Walk-in"}</span>
                        <span>{new Date(order.created_at).toLocaleTimeString()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="border rounded-md p-4 space-y-3">
              {orderDetailLoading ? (
                <p className="text-sm text-muted-foreground">Loading bill...</p>
              ) : !selectedOrder ? (
                <p className="text-sm text-muted-foreground">
                  Select a bill to see the complete invoice.
                </p>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-semibold">{selectedOrder.customer_name || "Cash / Walk-in"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(selectedOrder.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="border rounded-md">
                    <div className="grid grid-cols-[2fr,auto,auto] text-xs font-medium bg-muted/60 px-3 py-2">
                      <span>Item</span>
                      <span className="text-right">Qty</span>
                      <span className="text-right">Amount</span>
                    </div>
                    {selectedOrder.items.map((item) => (
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
                      <span>{formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount</span>
                      <span>-{formatCurrency(selectedOrder.discount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Total</span>
                      <span>{formatCurrency(selectedOrder.final_amount)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Pending Dues Sheet */}
      <Sheet
        open={dueSheetOpen}
        onOpenChange={(open) => {
          setDueSheetOpen(open);
          if (!open) {
            setSelectedCustomer(null);
            setSettleAmount("");
            setCustomerActionMessage(null);
            setCustomerActionError(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Pending Dues</SheetTitle>
            <SheetDescription>Review customers and settle outstanding balances.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-3">
              {dueLoading ? (
                <p className="text-sm text-muted-foreground">Loading customers...</p>
              ) : dueError ? (
                <p className="text-sm text-destructive">{dueError}</p>
              ) : dueCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No dues right now.</p>
              ) : (
                <div className="border rounded-md divide-y">
                  {dueCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setCustomerActionMessage(null);
                        setCustomerActionError(null);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 hover:bg-muted/60",
                        selectedCustomer?.id === customer.id && "bg-muted",
                      )}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{customer.name}</span>
                        <span>{formatCurrency(customer.dues)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>{customer.type || "Customer"}</span>
                        {customer.phone && <span>{customer.phone}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border rounded-md p-4 space-y-3">
              {!selectedCustomer ? (
                <p className="text-sm text-muted-foreground">Select a customer to manage dues.</p>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-semibold">{selectedCustomer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedCustomer.type || "Customer"} · {selectedCustomer.phone || "No phone"}
                    </p>
                  </div>
                  {selectedCustomer.address && (
                    <p className="text-xs text-muted-foreground">{selectedCustomer.address}</p>
                  )}
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Outstanding</span>
                      <span className="font-semibold">{formatCurrency(selectedCustomer.dues)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Enter amount received (leave blank to clear full due)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                      placeholder="e.g. 500"
                    />
                  </div>
                  {customerActionMessage && (
                    <p className="text-xs text-success">{customerActionMessage}</p>
                  )}
                  {customerActionError && (
                    <p className="text-xs text-destructive">{customerActionError}</p>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button onClick={handleRecordPayment}>Record Payment</Button>
                    <Button
                      variant="outline"
                      disabled={Number(selectedCustomer.dues ?? 0) !== 0}
                      onClick={handleDeleteCustomer}
                    >
                      Delete Customer
                    </Button>
                  </div>
                  {Number(selectedCustomer.dues ?? 0) !== 0 && (
                    <p className="text-xs text-muted-foreground">
                      Clear dues to enable deletion.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Low Stock Sheet */}
      <Sheet
        open={lowStockSheetOpen}
        onOpenChange={(open) => {
          setLowStockSheetOpen(open);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Low Stock Items</SheetTitle>
            <SheetDescription>Items with 5 units or less remaining.</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            {lowStockLoading ? (
              <p className="text-sm text-muted-foreground">Checking inventory...</p>
            ) : lowStockError ? (
              <p className="text-sm text-destructive">{lowStockError}</p>
            ) : lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">All items are sufficiently stocked.</p>
            ) : (
              <div className="border rounded-md divide-y">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="px-3 py-2 text-sm flex flex-col gap-1">
                    <div className="flex justify-between font-medium">
                      <span>{item.name}</span>
                      <span className="text-destructive">{item.quantity} left</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                      {item.size && <span>Size: {item.size}</span>}
                      {item.color && <span>Color: {item.color}</span>}
                      {item.category && <span>Category: {item.category}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default Dashboard;