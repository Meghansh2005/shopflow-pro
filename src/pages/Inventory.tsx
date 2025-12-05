import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/api/client";

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
        meta: data.items[0],
      })),
    }));
  }, [products, stockSearch]);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">
            Track ready-made purchases, manufactured SKUs, and quickly search stock by size or color.
          </p>
        </div>

        <Tabs defaultValue="items" className="space-y-6">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="items" className="flex-1">
              Items
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex-1">
              Stock Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <div className="grid gap-6 lg:grid-cols-[1.2fr,2fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Add / Update Item</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddProduct} className="space-y-4 text-sm">
                <div className="space-y-1.5">
                  <Label>Item Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Shirt"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Product Type</Label>
                    <select
                      value={productType}
                      onChange={(e) => setProductType(e.target.value as "ready-made" | "manufactured")}
                      className="border rounded-md h-9 px-3 bg-background"
                    >
                      <option value="ready-made">Ready-made (buy & sell)</option>
                      <option value="manufactured">Manufactured</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Size</Label>
                    <Input
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      placeholder="e.g. Medium"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Color</Label>
                    <Input
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="e.g. Blue"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Shirts"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Subcategory</Label>
                    <Input
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      placeholder="e.g. Polo"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Selling Price (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Buying Price (₹)</Label>
                    <Input
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
                  <div className="space-y-1.5">
                    <Label>Quantity in Stock</Label>
                    <Input
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full mt-2">
                  Save Item
                </Button>
              </form>
            </CardContent>
          </Card>

              <Card>
                <CardHeader className="space-y-2">
                  <CardTitle>Quick Stock Glimpse</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Use Stock Management tab to edit the complete inventory table.
                  </p>
                  <Input
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="Search like shirt/medium/blue"
                    className="h-9"
                  />
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {loading ? (
                    <p className="text-muted-foreground">Loading products...</p>
                  ) : error ? (
                    <p className="text-destructive">{error}</p>
                  ) : categorizedStock.length === 0 ? (
                    <p className="text-muted-foreground">
                      {products.length === 0
                        ? "No items yet. Use the form to add your first product."
                        : "No items match your search."}
                    </p>
                  ) : (
                    categorizedStock.map((category) => (
                      <div key={category.category} className="space-y-2">
                        <div className="font-semibold text-xs uppercase text-muted-foreground">
                          {category.category}
                        </div>
                        {category.subcategories.map((sub) => (
                          <div key={sub.subcategory} className="border rounded-md">
                            <div className="px-3 py-2 flex justify-between text-xs">
                              <span>
                                {sub.meta?.name} · {sub.subcategory}
                              </span>
                              <span>Total Qty: {sub.totalQty}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stock">
            <Card>
              <CardHeader className="space-y-2">
                <CardTitle>Stock Management</CardTitle>
                <Input
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  placeholder="Search like shirt/medium/blue"
                  className="h-9"
                />
              </CardHeader>
              <CardContent className="space-y-6 text-sm">
                {loading ? (
                  <p className="text-muted-foreground">Loading products...</p>
                ) : error ? (
                  <p className="text-destructive">{error}</p>
                ) : categorizedStock.length === 0 ? (
                  <p className="text-muted-foreground">
                    {products.length === 0
                      ? "No items yet. Use the Items tab to add your first product."
                      : "No items match your search."}
                  </p>
                ) : (
                  categorizedStock.map((category) => (
                    <div key={category.category} className="space-y-4">
                      <div className="font-semibold text-sm uppercase text-muted-foreground">
                        {category.category}
                      </div>
                      {category.subcategories.map((sub) => (
                        <div key={sub.subcategory} className="border rounded-md">
                          <div className="px-3 py-2 border-b bg-muted/30 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold">
                                  {sub.meta?.name} · {sub.subcategory}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  Size: {sub.meta?.size || "Any"} · Color: {sub.meta?.color || "Any"}
                                </div>
                              </div>
                              <div className="text-[11px] text-muted-foreground text-right">
                                <div>Type: {sub.meta?.product_type || "ready-made"}</div>
                                <div>
                                  Buying ₹{Number(sub.meta?.purchase_price ?? 0).toFixed(2)} · Selling ₹
                                  {Number(sub.meta?.price ?? 0).toFixed(2)}
                                </div>
                              </div>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Total Qty: {sub.totalQty}
                            </div>
                          </div>
                          <div className="divide-y">
                            {sub.items.map((item) => (
                              <div
                                key={item.id}
                                className="grid grid-cols-[auto,auto,auto,auto,auto] gap-3 px-3 py-2 items-center"
                              >
                                <div className="text-xs text-muted-foreground">SKU #{item.id}</div>
                                <div className="text-right text-xs space-y-1">
                                  <div>Selling</div>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="h-7 w-20 text-right text-xs"
                                    defaultValue={item.price}
                                    onBlur={(e) =>
                                      handleUpdateProduct(item, {
                                        price: Number(e.target.value || 0),
                                      })
                                    }
                                  />
                                </div>
                                <div className="text-right text-xs space-y-1">
                                  <div>Qty</div>
                                  <Input
                                    type="number"
                                    min="0"
                                    className="h-7 w-20 text-right text-xs"
                                    defaultValue={item.quantity}
                                    onBlur={(e) =>
                                      handleUpdateProduct(item, {
                                        quantity: Number(e.target.value || 0),
                                      })
                                    }
                                  />
                                </div>
                                <div className="text-right space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-[11px]"
                                    onClick={() => startEdit(item)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-[11px] text-destructive"
                                    onClick={() => handleDeleteProduct(item)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {editingProduct && (
          <Card>
            <CardHeader>
              <CardTitle>Edit {editingProduct.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={editValues.name}
                    onChange={(e) => handleEditChange("name", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Product Type</Label>
                  <select
                    value={editValues.productType}
                    onChange={(e) =>
                      handleEditChange("productType", e.target.value as "ready-made" | "manufactured")
                    }
                    className="border rounded-md h-9 px-3 bg-background"
                  >
                    <option value="ready-made">Ready-made</option>
                    <option value="manufactured">Manufactured</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Size</Label>
                  <Input
                    value={editValues.size}
                    onChange={(e) => handleEditChange("size", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Color</Label>
                  <Input
                    value={editValues.color}
                    onChange={(e) => handleEditChange("color", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input
                    value={editValues.category}
                    onChange={(e) => handleEditChange("category", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Subcategory</Label>
                  <Input
                    value={editValues.subcategory}
                    onChange={(e) => handleEditChange("subcategory", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Selling Price (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editValues.price}
                    onChange={(e) => handleEditChange("price", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editValues.quantity}
                    onChange={(e) => handleEditChange("quantity", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleEditSave}>Save Changes</Button>
                <Button variant="ghost" onClick={() => setEditingProduct(null)}>
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