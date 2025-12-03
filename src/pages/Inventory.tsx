import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/api/client";

interface Product {
  id: number;
  name: string;
  size?: string | null;
  color?: string | null;
  price: number;
  quantity: number;
  category?: string | null;
}

const Inventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("");

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
          quantity: Number(p.quantity ?? p.current_stock ?? 0),
          category: p.category ?? null,
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

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    for (const p of products) {
      const key = p.category || "Other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return groups;
  }, [products]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !quantity) return;

    try {
      setError(null);
      const newProduct = await apiFetch<Product>("/api/products", {
        method: "POST",
        body: JSON.stringify({
          name,
          size: size || null,
          color: color || null,
          price: Number(price),
          quantity: Number(quantity),
          category: category || null,
        }),
      });

      setProducts((prev) => [...prev, newProduct]);

      setName("");
      setSize("");
      setColor("");
      setPrice("");
      setQuantity("");
      setCategory("");
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
          quantity: updated.quantity,
          category: updated.category,
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
            Manage your products, sizes, colors, quantities and categories (like flags with many
            types).
          </p>
        </div>

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
                    placeholder="e.g. Flag"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Size</Label>
                    <Input
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      placeholder="e.g. Small, 4x6 inch"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Color</Label>
                    <Input
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="e.g. Saffron"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Price (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
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
                <div className="space-y-1.5">
                  <Label>Category / Sub Item Group</Label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Flags, Garlands"
                  />
                </div>

                <Button type="submit" className="w-full mt-2">
                  Save Item
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {loading ? (
                <p className="text-muted-foreground">Loading products...</p>
              ) : error ? (
                <p className="text-destructive">{error}</p>
              ) : products.length === 0 ? (
                <p className="text-muted-foreground">
                  No items yet. Use the form to add your first product.
                </p>
              ) : (
                Object.entries(groupedByCategory).map(([cat, items]) => (
                  <div key={cat} className="border rounded-md">
                    <div className="px-3 py-2 border-b bg-muted/50 font-medium">{cat}</div>
                    <div className="divide-y">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[2fr,auto,auto,auto,auto] gap-2 px-3 py-2 items-center"
                        >
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {item.size && <span>Size: {item.size} </span>}
                              {item.color && <span>Color: {item.color}</span>}
                            </div>
                          </div>
                          <div className="text-right text-xs sm:text-sm space-y-1">
                            <div>Price</div>
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
                          <div className="text-right text-xs sm:text-sm space-y-1">
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
                          <div className="text-right text-xs sm:text-sm font-medium">
                            Stock ₹{(item.price * item.quantity).toFixed(2)}
                          </div>
                          <div className="text-right">
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
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Inventory;