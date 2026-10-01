import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR, formatQty, indianDate } from "@/lib/format";
import { taxableTotal } from "@/lib/gst";
import { useStore } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/orders")({
  component: OrdersPage,
});

const LABEL: Record<OrderStatus, string> = {
  needs_review: "Review",
  confirmed: "Confirmed",
  invoiced: "Invoiced",
  paid: "Paid",
  cancelled: "Cancelled",
};

function OrdersPage() {
  const orders = useStore((s) => s.orders);
  const invoiceOrder = useStore((s) => s.invoiceOrder);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl">Orders</h1>
      <p className="mt-1 text-sm text-muted">
        Structured from chat. Nothing ships to GST until you confirm.
      </p>
      <div className="mt-6 overflow-x-auto rounded-xl bg-surface shadow-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Taxable</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{o.customerName}</p>
                  <p className="text-xs text-muted">{o.customerCity}</p>
                </td>
                <td className="px-4 py-3 text-muted">
                  {o.items
                    .map((i) => `${formatQty(i.qty)} ${i.name}`)
                    .join(", ")}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatINR(taxableTotal(o.items))}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      o.status === "paid"
                        ? "paid"
                        : o.status === "confirmed"
                          ? "default"
                          : "muted"
                    }
                  >
                    {LABEL[o.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted">{indianDate(o.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  {o.status === "confirmed" ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        const id = invoiceOrder(o.id);
                        if (id) toast.success("GST invoice generated");
                      }}
                    >
                      GST invoice
                    </Button>
                  ) : o.invoiceId ? (
                    <Button size="sm" variant="secondary" asChild>
                      <Link
                        to="/invoice/$invoiceId"
                        params={{ invoiceId: o.invoiceId }}
                      >
                        View
                      </Link>
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
