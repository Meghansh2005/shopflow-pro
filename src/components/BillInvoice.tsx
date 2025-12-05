import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface CartItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
}

interface BillInvoiceProps {
  items: CartItem[];
  total?: number;
  shopName?: string;
  shopAddress?: string;
  customerName?: string;
  phone?: string;
  gstNumber?: string;
}

const BillInvoice = ({
  items,
  total,
  shopName = "ShopSathi",
  shopAddress = "Your shop address",
  customerName,
  phone = "",
  gstNumber = "",
}: BillInvoiceProps) => {
  const computedTotal = useMemo(
    () => total ?? items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items, total]
  );

  const date = new Date();

  if (items.length === 0) {
    return null;
  }

  return (
    <div id="invoice-print-area" className="mt-6 print:mt-0">
      <Card className="max-w-3xl mx-auto shadow-sm print:shadow-none print:border-none">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xl font-semibold">{shopName}</CardTitle>
          <p className="text-xs text-muted-foreground">{shopAddress}</p>
          {(phone || gstNumber) && (
            <div className="mt-1 text-[10px] text-muted-foreground space-y-0.5">
              {phone && <div>Phone: {phone}</div>}
              {gstNumber && <div>GSTIN: {gstNumber}</div>}
            </div>
          )}
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Date: {date.toLocaleDateString()}</span>
            <span>Time: {date.toLocaleTimeString()}</span>
          </div>
          {customerName && (
            <div className="mt-1 text-xs">
              <span className="font-medium">Customer:</span> {customerName}
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1.5">Item</th>
                <th className="text-right py-1.5 w-12">Qty</th>
                <th className="text-right py-1.5 w-16">Price</th>
                <th className="text-right py-1.5 w-20">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="py-1.5 pr-2">{item.name}</td>
                  <td className="py-1.5 text-right">{item.quantity}</td>
                  <td className="py-1.5 text-right">₹{item.price.toFixed(2)}</td>
                  <td className="py-1.5 text-right">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 pt-2 border-t flex justify-between text-xs font-semibold">
            <span>Grand Total</span>
            <span className="text-base">₹{computedTotal.toFixed(2)}</span>
          </div>

          <p className="mt-4 text-center text-[10px] text-muted-foreground">
            Thank you for your purchase!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillInvoice;


