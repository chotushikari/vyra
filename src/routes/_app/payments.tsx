import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { daysBetween, formatINR, indianDate } from "@/lib/format";
import { isOverdue } from "@/lib/gst";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_app/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const invoices = useStore((s) => s.invoices);
  const markInvoicePaid = useStore((s) => s.markInvoicePaid);

  const unpaid = invoices.filter((i) => i.status !== "paid");
  const paid = invoices.filter((i) => i.status === "paid");
  const buckets = [
    { label: "Not due", items: unpaid.filter((i) => !isOverdue(i)) },
    {
      label: "1–7 days late",
      items: unpaid.filter(
        (i) => isOverdue(i) && daysBetween(i.dueAt) <= 7,
      ),
    },
    {
      label: "8–15 days",
      items: unpaid.filter((i) => {
        const d = daysBetween(i.dueAt);
        return d >= 8 && d <= 15;
      }),
    },
    {
      label: "16+ days",
      items: unpaid.filter((i) => daysBetween(i.dueAt) >= 16),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl">Payments</h1>
      <p className="mt-1 text-sm text-muted">
        Pending versus paid, without a spreadsheet at midnight.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {buckets.map((b) => (
          <div key={b.label} className="rounded-xl bg-surface p-4 shadow-border">
            <p className="text-xs text-muted">{b.label}</p>
            <p className="mt-2 font-display text-2xl tabular-nums">
              {formatINR(b.items.reduce((n, i) => n + i.total, 0))}
            </p>
            <p className="text-xs text-muted">{b.items.length} invoices</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-xl">Open</h2>
      <ul className="mt-3 space-y-2">
        {unpaid.map((inv) => (
          <li
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4 shadow-border"
          >
            <div>
              <p className="font-medium">{inv.customerName}</p>
              <p className="text-xs text-muted">
                {inv.number} · due {indianDate(inv.dueAt)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="tabular-nums">{formatINR(inv.total)}</p>
              {isOverdue(inv) ? <Badge variant="danger">Overdue</Badge> : null}
              <Button
                size="sm"
                onClick={() => {
                  markInvoicePaid(inv.id);
                  toast.success("Marked paid");
                }}
              >
                Mark paid
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 font-display text-xl">Collected</h2>
      <ul className="mt-3 space-y-2">
        {paid.map((inv) => (
          <li
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4 shadow-border"
          >
            <div>
              <p className="font-medium">{inv.customerName}</p>
              <p className="text-xs text-muted">
                {inv.number} · paid {inv.paidAt ? indianDate(inv.paidAt) : "—"}
              </p>
            </div>
            <p className="tabular-nums">{formatINR(inv.total)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
