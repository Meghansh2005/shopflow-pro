import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SettingsPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Business Profile</h1>
          <p className="text-muted-foreground">
            Update your business details, address and contact information.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-4 md:col-span-2">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input placeholder="Enter Business Name" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input placeholder="Phone Number" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input placeholder="Email Address" />
              </div>
              <div className="space-y-2">
                <Label>Business Address</Label>
                <Input placeholder="Full address" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input placeholder="Enter GSTIN" />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input placeholder="State" />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input placeholder="Pincode" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;


