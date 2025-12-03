import { useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/api/client";

const PurchaseExpense = () => {
  const [supplierName, setSupplierName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [billFile, setBillFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName || !amount) return;

    try {
      setSaving(true);
      setError(null);

      // For now we just send metadata to backend; file upload can be wired later
      await apiFetch("/api/purchases", {
        method: "POST",
        body: JSON.stringify({
          supplierName,
          companyName: companyName || null,
          invoiceNumber: invoiceNumber || null,
          amount: Number(amount) || 0,
          date: date || null,
          notes: notes || null,
          hasBillImage: !!billFile,
        }),
      });

      setSupplierName("");
      setCompanyName("");
      setInvoiceNumber("");
      setAmount("");
      setDate("");
      setNotes("");
      setBillFile(null);
    } catch (err: any) {
      console.error("Failed to save purchase", err);
      const message = err?.message || "Unable to save purchase. Please try again.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Purchase &amp; Expense</h1>
          <p className="text-muted-foreground">
            Record supplier purchases and upload purchase bills for your records.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr,2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Add Purchase Bill</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4 text-sm" onSubmit={handleSavePurchase}>
                <div className="space-y-1.5">
                  <Label>Supplier Name *</Label>
                  <Input
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Name of supplier"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Company / Firm</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Company you are purchasing from"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Invoice Number</Label>
                    <Input
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Supplier bill no."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Invoice Date</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Upload Bill (optional)</Label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setBillFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Extra details about this purchase"
                  />
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <Button type="submit" className="w-full mt-2" disabled={saving}>
                  {saving ? "Saving..." : "Save Purchase"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-center text-center">
            <CardHeader>
              <CardTitle>Purchase history (coming soon)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                After saving purchases, you&apos;ll see a list of supplier bills here with amount,
                date and quick filters.
              </p>
              <p>
                You can also extend the backend later to store and serve the uploaded bill images
                for download and audit.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PurchaseExpense;
