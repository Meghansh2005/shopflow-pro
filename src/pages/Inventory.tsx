import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/api/client";
import { Package, Search, Plus, Edit, Trash2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

interface Product {
  id: number;
  name: string;
  size?: string | null;
  color?: string | null;
  price: number;
  purchase_price?: number | null;
  quantity: number;
  category?: string | null;
  subcategory?: string | null;
  product_type?: string | null;
}

const Inventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [price, setPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [productType, setProductType] = useState<"ready-made" | "manufactured">("ready-made");
  const [stockSearch, setStockSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editValues, setEditValues] = useState({
    name: "",
    size: "",
    color: "",
    category: "",
    subcategory: "",
    price: "",
    purchasePrice: "",
    quantity: "",
    productType: "ready-made" as "ready-made" | "manufactured",
  });

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const raw = await apiFetch<any[]>("/api/products");
        const data: Product[] = raw.map((p) => ({
          id: Number(p.id),
          name: p.name ?? p.product_name ?? "Unnamed item",
          size: p.size ?? null,
          color: p.color ?? null,
          price: Number(p.price ?? p.selling_price ?? 0),
          purchase_price: Number(p.purchase_price ?? 0),
          quantity: Number(p.quantity ?? p.current_stock ?? 0),
          category: p.category ?? null,
          subcategory: p.subcategory ?? null,
          product_type: p.product_type ?? "ready-made",
        }));
        setProducts(data);
      } catch (err) {
        console.error("Failed to load products", err);
        setError("Unable to load products. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const matchSearch = (product: Product, search: string) => {
    if (!search.trim()) return true;
    const tokens = search
      .toLowerCase()
      .split("/")
      .map((token) => token.trim())
      .filter(Boolean);
    if (tokens.length === 0) return true;
    const haystack = [
      product.name,
      product.category,
      product.subcategory,
      product.size,
      product.color,
    ]
      .map((value) => (value ?? "").toLowerCase())
      .join(" ");
    return tokens.every((token) => haystack.includes(token));
  };

  const categorizedStock = useMemo(() => {
    const categories = new Map<
      string,
      Map<
        string,
        {
          items: Product[];
        }
      >
    >();

    for (const product of products) {
      if (!matchSearch(product, stockSearch)) continue;
      const categoryKey = product.category || "Uncategorized";
      const subcategoryKey = product.subcategory || "General";

      if (!categories.has(categoryKey)) {
        categories.set(categoryKey, new Map());
      }
      const subMap = categories.get(categoryKey)!;

      if (!subMap.has(subcategoryKey)) {
        subMap.set(subcategoryKey, { items: [] });
      }
      subMap.get(subcategoryKey)!.items.push(product);
    }

    return Array.from(categories.entries()).map(([category, subMap]) => ({
      category,
      subcategories: Array.from(subMap.entries()).map(([subcategory, data]) => ({
        subcategory,
        items: data.items,
        totalQty: data.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        totalValue: data.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0),
        meta: data.items[0],
      })),
    }));
  }, [products, stockSearch]);

  const inventoryStats = useMemo(() => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
    const lowStockItems = products.filter(p => p.quantity <= 5).length;
    const outOfStockItems = products.filter(p => p.quantity === 0).length;
    
    return { totalProducts, totalValue, lowStockItems, outOfStockItems };
  }, [products]);

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setEditValues({
      name: product.name,
      size: product.size ?? "",
      color: product.color ?? "",
      category: product.category ?? "",
      subcategory: product.subcategory ?? "",
      price: product.price.toString(),
      purchasePrice: (product.purchase_price ?? 0).toString(),
      quantity: product.quantity.toString(),
      productType: (product.product_type as "ready-made" | "manufactured") || "ready-made",
    });
  };

  const handleEditChange = (field: keyof typeof editValues, value: string) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async () => {
    if (!editingProduct) return;
    await handleUpdateProduct(editingProduct, {
      name: editValues.name,
      size: editValues.size || null,
      color: editValues.color || null,
      price: Number(editValues.price || 0),
      purchase_price:
        editValues.productType === "ready-made" ? Number(editValues.purchasePrice || 0) : 0,
      quantity: Number(editValues.quantity || 0),
      category: editValues.category || null,
      subcategory: editValues.subcategory || null,
      product_type: editValues.productType,
    });
    setEditingProduct(null);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !quantity) return;
    if (productType === "ready-made" && !purchasePrice) {
      setError("Buying price is required for ready-made goods.");
      return;
    }

    try {
      setError(null);
      const newProduct = await apiFetch<Product>("/api/products", {
        method: "POST",
        body: JSON.stringify({
          name,
          size: size || null,
          color: color || null,
          price: Number(price),
          purchasePrice: productType === "ready-made" ? Number(purchasePrice || 0) : 0,
          quantity: Number(quantity),
          category: category || null,
          subcategory: subcategory || null,
          productType,
        }),
      });

      setProducts((prev) => [...prev, newProduct]);

      setName("");
      setSize("");
      setColor("");
      setPrice("");
      setPurchasePrice("");
      setQuantity("");
      setCategory("");
      setSubcategory("");
      setProductType("ready-made");
    } catch (err) {
      console.error("Failed to add product", err);
      const errorMessage = err instanceof Error ? err.message : "Unable to add product. Please try again.";
      setError(errorMessage);
    }
  };

  const handleUpdateProduct = async (product: Product, updates: Partial<Product>) => {
    const updated: Product = { ...product, ...updates };
    try {
      await apiFetch<Product>(`/api/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: updated.name,
          size: updated.size,
          color: updated.color,
          price: updated.price,
          purchasePrice: updated.purchase_price ?? 0,
          quantity: updated.quantity,
          category: updated.category,
          subcategory: updated.subcategory,
          productType: updated.product_type ?? "ready-made",
        }),
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...updated } : p))
      );
    } catch (err) {
      console.error("Failed to update product", err);
      setError("Unable to update stock. Please try again.");
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Remove "${product.name}" from inventory?`)) return;
    try {
      await apiFetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      console.error("Failed to delete product", err);
      setError("Unable to delete product. Please try again.");
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { status: "out", color: "destructive", icon: AlertTriangle };
    if (quantity <= 5) return { status: "low", color: "warning", icon: TrendingDown };
    return { status: "good", color: "success", icon: TrendingUp };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              Inventory Management
            </h1>
            <p className="text-muted-foreground">
              Manage your products, track stock levels, and organize inventory efficiently.
            </p>
          </div>
        </div>

        {/* Inventory Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold">{inventoryStats.totalProducts}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">₹{inventoryStats.totalValue.toFixed(0)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-orange-600">{inventoryStats.lowStockItems}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{inventoryStats.outOfStockItems}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="items" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="items" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Items
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Manage Stock
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <div className="grid gap-6 lg:grid-cols-[1fr,1.5fr]">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add New Item
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddProduct} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Item Name *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Cotton T-Shirt"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="productType">Product Type *</Label>
                        <select
                          id="productType"
                          value={productType}
                          onChange={(e) => setProductType(e.target.value as "ready-made" | "manufactured")}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="ready-made">Ready-made (buy & sell)</option>
                          <option value="manufactured">Manufactured</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Input
                          id="category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="e.g. Clothing"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="subcategory">Subcategory</Label>
                        <Input
                          id="subcategory"
                          value={subcategory}
                          onChange={(e) => setSubcategory(e.target.value)}
                          placeholder="e.g. T-Shirts"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="size">Size</Label>
                        <Input
                          id="size"
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          placeholder="e.g. Medium, XL"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="e.g. Blue, Red"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="purchasePrice">
                          Buying Price (₹) {productType === "ready-made" && "*"}
                        </Label>
                        <Input
                          id="purchasePrice"
                          type="number"
                          min="0"
                          step="0.01"
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(e.target.value)}
                          disabled={productType === "manufactured"}
                          required={productType === "ready-made"}
                          placeholder={productType === "manufactured" ? "Not required" : "Cost per unit"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">Selling Price (₹) *</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity in Stock *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                      />
                    </div>

                    {error && (
                      <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                        {error}
                      </div>
                    )}

                    <Button type="submit" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item to Inventory
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Items</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Latest products added to your inventory
                  </p>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground">Loading products...</p>
                  ) : products.length === 0 ? (
                    <p className="text-muted-foreground">No items yet. Add your first product using the form.</p>
                  ) : (
                    <div className="space-y-3">
                      {products.slice(-5).reverse().map((product) => {
                        const stockInfo = getStockStatus(product.quantity);
                        const StockIcon = stockInfo.icon;
                        return (
                          <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{product.name}</h4>
                                <Badge variant={product.product_type === "ready-made" ? "default" : "secondary"}>
                                  {product.product_type}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {[product.category, product.subcategory, product.size, product.color]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </p>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-sm">₹{product.price}</span>
                                <div className="flex items-center gap-1">
                                  <StockIcon className="h-3 w-3" />
                                  <span className="text-sm">{product.quantity} in stock</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stock">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Stock Management
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      placeholder="Search products..."
                      className="w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Loading products...</p>
                ) : error ? (
                  <p className="text-destructive">{error}</p>
                ) : categorizedStock.length === 0 ? (
                  <p className="text-muted-foreground">
                    {products.length === 0
                      ? "No items yet. Use the Add Items tab to add your first product."
                      : "No items match your search."}
                  </p>
                ) : (
                  <div className="space-y-6">
                    {categorizedStock.map((category) => (
                      <div key={category.category} className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{category.category}</h3>
                          <Badge variant="outline">
                            {category.subcategories.reduce((sum, sub) => sum + sub.items.length, 0)} items
                          </Badge>
                        </div>
                        
                        {category.subcategories.map((sub) => (
                          <Card key={sub.subcategory} className="border-l-4 border-l-primary/20">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{sub.subcategory}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {sub.items.length} items • Total Qty: {sub.totalQty} • Value: ₹{sub.totalValue.toFixed(0)}
                                  </p>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="grid gap-3">
                                {sub.items.map((item) => {
                                  const stockInfo = getStockStatus(item.quantity);
                                  const StockIcon = stockInfo.icon;
                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <h5 className="font-medium">{item.name}</h5>
                                          <Badge variant={stockInfo.color as any}>
                                            <StockIcon className="h-3 w-3 mr-1" />
                                            {item.quantity} stock
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          {[item.size, item.color].filter(Boolean).join(" • ")} • 
                                          Selling: ₹{item.price} • 
                                          {item.product_type === "ready-made" && `Cost: ₹${item.purchase_price}`}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => startEdit(item)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteProduct(item)}
                                          className="text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {editingProduct && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit {editingProduct.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editValues.name}
                    onChange={(e) => handleEditChange("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Product Type</Label>
                  <select
                    value={editValues.productType}
                    onChange={(e) =>
                      handleEditChange("productType", e.target.value as "ready-made" | "manufactured")
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="ready-made">Ready-made</option>
                    <option value="manufactured">Manufactured</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={editValues.category}
                    onChange={(e) => handleEditChange("category", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subcategory</Label>
                  <Input
                    value={editValues.subcategory}
                    onChange={(e) => handleEditChange("subcategory", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Size</Label>
                  <Input
                    value={editValues.size}
                    onChange={(e) => handleEditChange("size", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input
                    value={editValues.color}
                    onChange={(e) => handleEditChange("color", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Selling Price (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editValues.price}
                    onChange={(e) => handleEditChange("price", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Buying Price (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editValues.purchasePrice}
                    onChange={(e) => handleEditChange("purchasePrice", e.target.value)}
                    disabled={editValues.productType === "manufactured"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editValues.quantity}
                    onChange={(e) => handleEditChange("quantity", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleEditSave}>
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingProduct(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Inventory;