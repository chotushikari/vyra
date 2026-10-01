import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { formatINR, indianDate } from "@/lib/format";
import { isOverdue } from "@/lib/gst";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_app/invoices")({
  component: InvoicesPage,
});

function InvoicesPage() {
  const invoices = useStore((s) => s.invoices);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl">Invoices</h1>
      <p className="mt-1 text-sm text-muted">
        CGST/SGST split automatically. UPI link rides along.
      </p>
      <ul className="mt-6 space-y-3">
        {invoices.map((inv) => {
          const overdue = isOverdue(inv);
          return (
            <li key={inv.id}>
              <Link
                to="/invoice/$invoiceId"
                params={{ invoiceId: inv.id }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4 shadow-border"
              >
                <div>
                  <p className="font-mono text-xs text-muted">{inv.number}</p>
                  <p className="font-medium">{inv.customerName}</p>
                  <p className="text-xs text-muted">
                    {indianDate(inv.issuedAt)} · {inv.placeOfSupply}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-display text-xl tabular-nums">
                    {formatINR(inv.total)}
                  </p>
                  <Badge
                    variant={
                      inv.status === "paid"
                        ? "paid"
                        : overdue
                          ? "danger"
                          : "warn"
                    }
                  >
                    {inv.status === "paid"
                      ? "Paid"
                      : overdue
                        ? "Overdue"
                        : "Unpaid"}
                  </Badge>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
