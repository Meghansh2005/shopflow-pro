import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/api/client";

interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  address?: string | null;
  type?: string | null;
  dues?: number | null;
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("");
  const [dues, setDues] = useState("0");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const data = await apiFetch<any[]>("/api/customers");
        const mapped: Customer[] = data.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || null,
          address: c.address || null,
          type: c.type || c.customer_type || null,
          dues: Number(c.dues ?? c.balance_due ?? 0) || 0,
        }));
        setCustomers(mapped);
      } catch (err: any) {
        console.error("Failed to load customers", err);
        const errorMessage = err?.message || "Unable to load customers. Please try again.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalDues = useMemo(
    () =>
      customers.reduce((sum, c) => {
        const d = Number(c.dues ?? 0);
        return sum + d;
      }, 0),
    [customers]
  );

  const wholesale = customers.filter(
    (c) => (c.type || "").toLowerCase().includes("wholesale")
  );

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return wholesale.length > 0 ? wholesale : customers;
    
    const query = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(query) ||
      (c.phone || "").toLowerCase().includes(query) ||
      (c.type || "").toLowerCase().includes(query)
    );
  }, [customers, wholesale, searchQuery]);

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!window.confirm(`Delete customer "${customer.name}"? This cannot be undone.`)) return;

    try {
      setError(null);
      await apiFetch(`/api/customers/${customer.id}`, {
        method: "DELETE",
      });
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
    } catch (err: any) {
      console.error("Failed to delete customer", err);
      const errorMessage = err?.message || "Unable to delete customer. Please try again.";
      setError(errorMessage);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      setError(null);
      const newCustomer = await apiFetch<Customer>("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name,
          phone: phone || null,
          address: address || null,
          type: type || null,
          dues: Number(dues) || 0,
        }),
      });

      setCustomers((prev) => [...prev, newCustomer]);

      // Reset form
      setName("");
      setPhone("");
      setAddress("");
      setType("");
      setDues("0");
    } catch (err: any) {
      console.error("Failed to add customer", err);
      const errorMessage = err?.message || "Unable to add customer. Please try again.";
      setError(errorMessage);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customer Management</h1>
          <p className="text-muted-foreground">
            View important wholesale customers and keep track of their dues.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr,2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Add Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCustomer} className="space-y-4 text-sm">
                <div className="space-y-1.5">
                  <Label>Customer Name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 1234567890"
                    type="tel"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Customer address"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Customer Type</Label>
                  <Input
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="e.g. Wholesale, Retail"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Initial Dues (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dues}
                    onChange={(e) => setDues(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full mt-2">
                  Add Customer
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Wholesale Customers &amp; Dues</CardTitle>
            </div>
            <div className="w-64">
              <Input
                placeholder="Search customers..."
                className="h-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {loading ? (
              <p className="text-muted-foreground">Loading customers...</p>
            ) : error ? (
              <p className="text-destructive">{error}</p>
            ) : customers.length === 0 ? (
              <p className="text-muted-foreground">
                No customers found. Add customers in your database to see them here.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs border-b pb-2">
                  <span className="text-muted-foreground">
                    Total customers: <span className="font-semibold">{customers.length}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Total dues:{" "}
                    <span className="font-semibold text-destructive">
                      ₹{totalDues.toFixed(2)}
                    </span>
                  </span>
                </div>

                <div className="border rounded-md divide-y">
                  {filteredCustomers.map((c) => (
                    <div
                      key={c.id}
                      className="grid grid-cols-[2fr,auto,auto] gap-2 px-3 py-2 items-center"
                    >
                      <div>
                        <div className="font-medium">
                          {c.name}{" "}
                          {c.type && (
                            <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {c.type}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground space-y-0.5">
                          {c.phone && <div>Phone: {c.phone}</div>}
                          {c.address && <div>{c.address}</div>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Due</div>
                        <div className="font-semibold text-sm">
                          ₹{Number(c.dues ?? 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-destructive"
                          onClick={() => handleDeleteCustomer(c)}
                          disabled={Number(c.dues ?? 0) !== 0}
                          title={
                            Number(c.dues ?? 0) === 0
                              ? "Delete customer"
                              : "Clear dues to delete this customer"
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Customers;