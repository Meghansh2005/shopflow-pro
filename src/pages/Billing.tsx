import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/api/client";
import BillInvoice, { CartItem } from "@/components/BillInvoice";

interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
  description?: string | null;
  image_url?: string | null;
}

const Billing = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState<string>("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setError(null);
        const raw = await apiFetch<any[]>("/api/products");
        const data: Product[] = raw.map((p) => ({
          id: Number(p.id),
          name: p.name ?? p.product_name ?? "Unnamed item",
          price: Number(p.price ?? p.selling_price ?? 0),
          quantity: Number(p.quantity ?? 0),
          description: p.description ?? null,
          image_url: p.image_url ?? null,
        }));
        setProducts(data);
      } catch (err) {
        console.error("Failed to load products", err);
        setError("Unable to load products. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const addToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const currentQty = existing?.quantity ?? 0;
      // Prevent adding beyond available stock
      if (currentQty >= product.quantity) {
        alert(`"${product.name}" is out of stock.`);
        return prev;
      }

      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (id: number | string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.id !== id));
      return;
    }

    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => setCartItems([]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const discountNumber = Number(discount) || 0;
  const total = useMemo(() => Math.max(subtotal - discountNumber, 0), [subtotal, discountNumber]);

  const handleSaveAndPrint = async () => {
    if (cartItems.length === 0 || saving) return;
    try {
      setSaving(true);
      setError(null);
      const response = await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: customerName || null,
          discount: discountNumber,
          items: cartItems,
        }),
      });

      console.log("Order saved successfully:", response);
      window.print();
      setCartItems([]);
      setDiscount("0");
      setCustomerName("");
    } catch (err: any) {
      console.error("Failed to save order", err);
      const errorMessage = err?.message || "Unable to save bill. Please try again.";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Billing & POS</h1>
            <p className="text-muted-foreground">Create invoices and process sales</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={clearCart} disabled={cartItems.length === 0}>
              Clear Cart
            </Button>
            <Button onClick={handleSaveAndPrint} disabled={cartItems.length === 0 || saving}>
              {saving ? "Saving..." : "Save & Print Bill"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1.5fr]">
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading products...</p>
              ) : error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : products.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No products found. Add products in your backend to start billing.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => {
                    const inCart = cartItems.find((c) => c.id === product.id);
                    const remaining = product.quantity - (inCart?.quantity ?? 0);
                    const isOutOfStock = remaining <= 0;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => !isOutOfStock && addToCart(product)}
                        className="flex flex-col items-start rounded-lg border border-border p-3 text-left hover:border-primary hover:bg-muted/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={isOutOfStock}
                      >
                        <span className="font-medium">{product.name}</span>
                        {product.description && (
                          <span className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {product.description}
                          </span>
                        )}
                        <span className="mt-2 font-semibold text-primary">
                          ₹{product.price.toFixed(2)}
                        </span>
                        <span className="mt-1 text-xs text-muted-foreground">
                          {isOutOfStock ? "Out of stock" : `In stock: ${remaining}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Bill</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Customer Name (optional)</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>

              {cartItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Add products from the list to start a bill.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="border rounded-md divide-y text-sm">
                    <div className="grid grid-cols-[2fr,auto,auto,auto] gap-2 px-3 py-2 font-medium bg-muted/60">
                      <span>Item</span>
                      <span className="text-right">Qty</span>
                      <span className="text-right">Price</span>
                      <span className="text-right">Total</span>
                    </div>
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[2fr,auto,auto,auto] gap-2 items-center px-3 py-2"
                      >
                        <span className="truncate">{item.name}</span>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, Number(e.target.value) || 1)}
                          className="w-14 rounded border px-1 py-0.5 text-right text-sm"
                        />
                        <span className="text-right text-xs sm:text-sm">
                          ₹{item.price.toFixed(2)}
                        </span>
                        <span className="text-right font-medium text-xs sm:text-sm">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 pt-2 border-t text-sm">
                    <div className="flex items-center justify-between">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span>Discount</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          className="w-24 h-8 text-right text-sm"
                          type="number"
                          min="0"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                        />
                        <span className="text-xs text-muted-foreground">₹</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t font-semibold">
                      <span>Total</span>
                      <span className="text-lg">₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t text-xs text-muted-foreground">
                Tip: Use the <span className="font-medium">Save &amp; Print Bill</span> button above
                to save the invoice, reduce stock, and generate a clean print.
              </div>
            </CardContent>
          </Card>
        </div>

        <BillInvoice items={cartItems} total={total} customerName={customerName} />
      </div>
    </DashboardLayout>
  );
};

export default Billing;