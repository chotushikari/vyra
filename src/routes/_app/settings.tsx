import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const business = useStore((s) => s.business);
  const setBusiness = useStore((s) => s.setBusiness);
  const resetDemo = useStore((s) => s.resetDemo);

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl">Settings</h1>
      <p className="mt-1 text-sm text-muted">
        Everything here lives on this device. No WhatsApp Business API, no CRM
        seat, no monthly fee.
      </p>

      <form
        className="mt-6 space-y-4 rounded-xl bg-surface p-5 shadow-border"
        onSubmit={(e) => {
          e.preventDefault();
          toast.success("Saved");
        }}
      >
        <Field
          label="Business name"
          value={business.name}
          onChange={(v) => setBusiness({ name: v })}
        />
        <Field
          label="GSTIN"
          value={business.gstin}
          onChange={(v) => setBusiness({ gstin: v })}
        />
        <Field
          label="Address"
          value={business.address}
          onChange={(v) => setBusiness({ address: v })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="City"
            value={business.city}
            onChange={(v) => setBusiness({ city: v })}
          />
          <Field
            label="State"
            value={business.state}
            onChange={(v) => setBusiness({ state: v })}
          />
        </div>
        <Field
          label="UPI ID"
          value={business.upi}
          onChange={(v) => setBusiness({ upi: v })}
        />
        <Field
          label="Phone"
          value={business.phone}
          onChange={(v) => setBusiness({ phone: v })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="GST %"
            type="number"
            value={String(business.gstRate)}
            onChange={(v) => setBusiness({ gstRate: Number(v) || 0 })}
          />
          <Field
            label="Invoice prefix"
            value={business.invoicePrefix}
            onChange={(v) => setBusiness({ invoicePrefix: v })}
          />
        </div>
        <Button type="submit">Save</Button>
      </form>

      <div className="mt-6 rounded-xl bg-surface p-5 shadow-border">
        <h2 className="font-display text-lg">Demo data</h2>
        <p className="mt-1 text-sm text-muted">
          Restore Mehta Textiles sample chats, orders, and invoices.
        </p>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => {
            resetDemo();
            toast.success("Demo restored");
          }}
        >
          Reset demo
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-medium text-muted">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
