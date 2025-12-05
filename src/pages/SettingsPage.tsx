import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const SETTINGS_EVENT = "dashboard-settings-update";
const DEFAULT_SUPPORT_PHONE = "+91-0000000000";

const SettingsPage = () => {
  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [supportNumber, setSupportNumber] = useState(DEFAULT_SUPPORT_PHONE);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setBusinessName(localStorage.getItem("businessName") || "");
    setSupportNumber(localStorage.getItem("supportPhone") || DEFAULT_SUPPORT_PHONE);

    // Optional persisted extras
    setPhoneNumber(localStorage.getItem("businessPhone") || "");
    setEmail(localStorage.getItem("businessEmail") || "");
    setAddress(localStorage.getItem("businessAddress") || "");
    setGstin(localStorage.getItem("businessGstin") || "");
    setStateName(localStorage.getItem("businessState") || "");
    setPincode(localStorage.getItem("businessPincode") || "");
  }, []);

  const handleSave = () => {
    localStorage.setItem("businessName", businessName.trim());
    localStorage.setItem("supportPhone", supportNumber.trim() || DEFAULT_SUPPORT_PHONE);
    localStorage.setItem("businessPhone", phoneNumber.trim());
    localStorage.setItem("businessEmail", email.trim());
    localStorage.setItem("businessAddress", address.trim());
    localStorage.setItem("businessGstin", gstin.trim());
    localStorage.setItem("businessState", stateName.trim());
    localStorage.setItem("businessPincode", pincode.trim());

    window.dispatchEvent(new Event(SETTINGS_EVENT));
    setStatus("Details saved successfully.");
    setTimeout(() => setStatus(null), 2500);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Business Profile</h1>
          <p className="text-muted-foreground">
            Update your business details, support contact, and other identifiers.
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
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter Business Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Phone Number"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                />
              </div>
              <div className="space-y-2">
                <Label>Business Address</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full address"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="Enter GSTIN"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="State"
                />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Pincode"
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Support Number</Label>
                <Input
                  value={supportNumber}
                  onChange={(e) => setSupportNumber(e.target.value)}
                  placeholder="+91-0000000000"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            {status && <span className="text-sm text-success">{status}</span>}
            <Button className="w-full md:w-auto" onClick={handleSave}>
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
