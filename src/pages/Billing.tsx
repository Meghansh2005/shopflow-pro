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
  category?: string | null;
  subcategory?: string | null;
  size?: string | null;
  color?: string | null;
}

const SETTINGS_EVENT = "dashboard-settings-update";

const Billing = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState<string>("0");
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [shopDetails, setShopDetails] = useState({
    name: localStorage.getItem("businessName") || "ShopSathi",
    address: localStorage.getItem("businessAddress") || "",
    phone: localStorage.getItem("supportPhone") || "",
    gst: localStorage.getItem("businessGstin") || "",
  });

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
          category: p.category ?? null,
          subcategory: p.subcategory ?? null,
          size: p.size ?? null,
          color: p.color ?? null,
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

    const syncDetails = () => {
      setShopDetails({
        name: localStorage.getItem("businessName") || "ShopSathi",
        address: localStorage.getItem("businessAddress") || "",
        phone: localStorage.getItem("supportPhone") || "",
        gst: localStorage.getItem("businessGstin") || "",
      });
    };

    syncDetails();
    window.addEventListener(SETTINGS_EVENT, syncDetails);
    return () => window.removeEventListener(SETTINGS_EVENT, syncDetails);
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

  const handlePresetQuantity = (id: number | string, qty: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: qty } : item)),
    );
  };

  const clearCart = () => setCartItems([]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const discountNumber = Number(discount) || 0;
  const total = useMemo(() => Math.max(subtotal - discountNumber, 0), [subtotal, discountNumber]);

  const handleSaveBill = async () => {
    if (cartItems.length === 0 || saving) return;
    try {
      setSaving(true);
      setError(null);
      await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: customerName || null,
          discount: discountNumber,
          items: cartItems,
        }),
      });

      setCartItems([]);
      setDiscount("0");
      setCustomerName("");
      setProductSearch("");
    } catch (err: any) {
      console.error("Failed to save order", err);
      const errorMessage = err?.message || "Unable to save bill. Please try again.";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintBill = () => {
    if (cartItems.length === 0) return;
    window.print();
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const searchTokens = productSearch.toLowerCase().split("/").map((token) => token.trim()).filter(Boolean);
    return products
      .filter((product) => {
        const haystack = [
          product.name,
          product.description,
          product.category,
          product.subcategory,
          product.size,
          product.color,
        ]
          .map((val) => (val ?? "").toLowerCase())
          .join(" ");
        return searchTokens.every((token) => haystack.includes(token));
      })
      .slice(0, 8);
  }, [productSearch, products]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">ShopSathi Billing</h1>
            <p className="text-muted-foreground">Search inventory and build a neat invoice.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={clearCart} disabled={cartItems.length === 0}>
              Clear Bill
            </Button>
            <Button onClick={handleSaveBill} disabled={cartItems.length === 0 || saving}>
              {saving ? "Saving..." : "Save Bill"}
            </Button>
            <Button variant="secondary" onClick={handlePrintBill} disabled={cartItems.length === 0}>
              Print Bill
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Bill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Search inventory</Label>
                  <Input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Type product name or use shortcuts like polo/blue"
                    disabled={loading || products.length === 0}
                  />
                </div>
                <div className="border rounded-md divide-y max-h-72 overflow-y-auto text-sm">
                  {filteredProducts.length === 0 ? (
                    <p className="px-3 py-2 text-muted-foreground">No matching products.</p>
                  ) : (
                    filteredProducts.map((product) => {
                      const inCart = cartItems.find((c) => c.id === product.id);
                      const remaining = product.quantity - (inCart?.quantity ?? 0);
                      const isOutOfStock = remaining <= 0;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted/60 disabled:opacity-50"
                          onClick={() => !isOutOfStock && addToCart(product)}
                          disabled={isOutOfStock}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {product.name}
                              {product.subcategory && ` · ${product.subcategory}`}
                            </span>
                            <span>₹{product.price.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground flex justify-between gap-2">
                            <span>
                              {[product.size, product.color].filter(Boolean).join(" / ") || "—"}
                            </span>
                            <span>{isOutOfStock ? "Out of stock" : `${remaining} in stock`}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-4">
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
                    <div className="grid grid-cols-[2fr,auto,auto,auto,auto] gap-2 px-3 py-2 font-medium bg-muted/60">
                      <span>Item</span>
                      <span className="text-right">Qty</span>
                      <span className="text-right">Price</span>
                      <span className="text-right">Total</span>
                      <span className="text-right">Action</span>
                    </div>
                    {cartItems.map((item) => {
                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-[2fr,auto,auto,auto,auto] gap-2 items-start px-3 py-2"
                        >
                          <div>
                            <span className="truncate block">{item.name}</span>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => handlePresetQuantity(item.id, 1)}
                              >
                                1 Pc
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => handlePresetQuantity(item.id, 12)}
                              >
                                1 Doz
                              </Button>
                            </div>
                          </div>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, Number(e.target.value) || 1)}
                            className="w-16 rounded border px-1 py-0.5 text-right text-sm"
                          />
                          <span className="text-right text-xs sm:text-sm">
                            ₹{item.price.toFixed(2)}
                          </span>
                          <span className="text-right font-medium text-xs sm:text-sm">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </span>
                          <div className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] text-destructive"
                              onClick={() => setCartItems((prev) => prev.filter((p) => p.id !== item.id))}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      );
                    })}
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
              Tip: Use the <span className="font-semibold">Save Bill</span> button to post stock changes, then
              <span className="font-semibold"> Print Bill</span> for a clean receipt.
            </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <BillInvoice
          items={cartItems}
          total={total}
          customerName={customerName}
          shopName={shopDetails.name}
          shopAddress={shopDetails.address}
          phone={shopDetails.phone}
          gstNumber={shopDetails.gst}
        />
      </div>
    </DashboardLayout>
  );
};

export default Billing;