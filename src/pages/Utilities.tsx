import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Utilities = () => {
  const tools = [
    "Import Items",
    "Bulk Item Update",
    "Backup & Restore",
    "GST Tools",
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Utilities</h1>
          <p className="text-muted-foreground">
            Handy tools to import data, manage backups, and perform advanced actions.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Available tools</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {tools.map((tool) => (
              <button
                key={tool}
                type="button"
                className="rounded-lg border px-4 py-3 text-left text-sm hover:border-primary hover:bg-muted/40"
              >
                {tool}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Utilities;


