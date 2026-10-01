import { createFileRoute } from "@tanstack/react-router";
import { formatINR, formatQty } from "@/lib/format";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_app/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const conversations = useStore((s) => s.conversations);
  const orders = useStore((s) => s.orders);
  const invoices = useStore((s) => s.invoices);

  const rows = conversations.map((c) => {
    const theirs = orders.filter((o) => o.conversationId === c.id);
    const billed = invoices
      .filter((i) => i.conversationId === c.id)
      .reduce((n, i) => n + i.total, 0);
    const outstanding = invoices
      .filter((i) => i.conversationId === c.id && i.status !== "paid")
      .reduce((n, i) => n + i.total, 0);
    const pcs = theirs.reduce(
      (n, o) => n + o.items.reduce((m, i) => m + i.qty, 0),
      0,
    );
    return { c, orders: theirs.length, billed, outstanding, pcs };
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl">Customers</h1>
      <p className="mt-1 text-sm text-muted">
        Built from the same chats — no separate CRM to fill in.
      </p>
      <div className="mt-6 overflow-x-auto rounded-xl bg-surface shadow-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Orders</th>
              <th className="px-4 py-3 font-medium">Pieces</th>
              <th className="px-4 py-3 font-medium">Billed</th>
              <th className="px-4 py-3 font-medium">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.c.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{r.c.name}</p>
                  <p className="text-xs text-muted">{r.c.phone}</p>
                </td>
                <td className="px-4 py-3 text-muted">{r.c.city}</td>
                <td className="px-4 py-3 tabular-nums">{r.orders}</td>
                <td className="px-4 py-3 tabular-nums">{formatQty(r.pcs)}</td>
                <td className="px-4 py-3 tabular-nums">{formatINR(r.billed)}</td>
                <td className="px-4 py-3 tabular-nums">
                  {formatINR(r.outstanding)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
