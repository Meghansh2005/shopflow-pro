import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/api/client";
import BillInvoice, { CartItem } from "@/components/BillInvoice";
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Receipt, 
  User, 
  Package,
  Calculator,
  CheckCircle,
  AlertCircle
} from "lucide-react";

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
  const [showBillPreview, setShowBillPreview] = useState(false);
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
    
    setShowBillPreview(true);
    
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

      // Keep preview visible for a moment
      setTimeout(() => {
        setCartItems([]);
        setDiscount("0");
        setCustomerName("");
        setProductSearch("");
        setShowBillPreview(false);
      }, 2000);
    } catch (err: any) {
      console.error("Failed to save order", err);
      const errorMessage = err?.message || "Unable to save bill. Please try again.";
      setError(errorMessage);
      setShowBillPreview(false);
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
      .slice(0, 12);
  }, [productSearch, products]);

  const cartStats = useMemo(() => {
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueItems = cartItems.length;
    return { totalItems, uniqueItems };
  }, [cartItems]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ShoppingCart className="h-8 w-8 text-primary" />
              ShopSathi Billing
            </h1>
            <p className="text-muted-foreground">
              Create professional invoices and manage sales efficiently.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {cartStats.uniqueItems} items
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Calculator className="h-3 w-3" />
              {cartStats.totalItems} qty
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={clearCart} disabled={cartItems.length === 0}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Bill
          </Button>
          <Button onClick={handleSaveBill} disabled={cartItems.length === 0 || saving}>
            {saving ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4 mr-2" />
                Save Bill
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={handlePrintBill} disabled={cartItems.length === 0}>
            <Receipt className="h-4 w-4 mr-2" />
            Print Bill
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
          {/* Left Side - Billing Interface */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer Name (optional)</Label>
                  <Input
                    id="customer"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="text-base"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Product Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Products
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Type product name or use shortcuts like polo/blue"
                    disabled={loading || products.length === 0}
                    className="pl-10 text-base"
                  />
                </div>
                
                {productSearch.trim() && (
                  <div className="grid gap-2 max-h-80 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="flex items-center justify-center p-8 text-muted-foreground">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        No matching products found.
                      </div>
                    ) : (
                      filteredProducts.map((product) => {
                        const inCart = cartItems.find((c) => c.id === product.id);
                        const remaining = product.quantity - (inCart?.quantity ?? 0);
                        const isOutOfStock = remaining <= 0;
                        return (
                          <button
                            key={product.id}
                            type="button"
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/60 disabled:opacity-50 transition-colors text-left"
                            onClick={() => !isOutOfStock && addToCart(product)}
                            disabled={isOutOfStock}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{product.name}</h4>
                                {product.subcategory && (
                                  <Badge variant="secondary" className="text-xs">
                                    {product.subcategory}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {[product.size, product.color].filter(Boolean).join(" • ") || "Standard"}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="font-semibold text-primary">₹{product.price.toFixed(2)}</span>
                                <Badge variant={isOutOfStock ? "destructive" : remaining <= 5 ? "warning" : "success"}>
                                  {isOutOfStock ? "Out of stock" : `${remaining} available`}
                                </Badge>
                              </div>
                            </div>
                            <Plus className="h-5 w-5 ml-2 text-muted-foreground" />
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cart Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart Items ({cartStats.totalItems})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                
                {cartItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mb-2 opacity-50" />
                    <p>Your cart is empty</p>
                    <p className="text-sm">Search and add products to start billing</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">₹{item.price.toFixed(2)} each</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePresetQuantity(item.id, 1)}
                              className="h-7 px-2 text-xs"
                            >
                              1 Pc
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePresetQuantity(item.id, 12)}
                              className="h-7 px-2 text-xs"
                            >
                              1 Doz
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, Number(e.target.value) || 1)}
                            className="w-16 text-center"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCartItems((prev) => prev.filter((p) => p.id !== item.id))}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Bill Summary */}
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal ({cartStats.totalItems} items)</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="discount">Discount</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="discount"
                            className="w-24 text-right"
                            type="number"
                            min="0"
                            max={subtotal}
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                          />
                          <span className="text-sm text-muted-foreground">₹</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-lg font-semibold border-t pt-2">
                        <span>Total</span>
                        <span className="text-primary">₹{total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Bill Preview */}
          {(showBillPreview || cartItems.length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Bill Preview
                </h3>
                {saving && (
                  <Badge variant="default" className="animate-pulse">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Saving...
                  </Badge>
                )}
              </div>
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Billing;