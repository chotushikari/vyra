import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR, indianDate, indianDateTime } from "@/lib/format";
import { isOverdue } from "@/lib/gst";
import { reminderCopy, reminderTone } from "@/lib/reminders";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_app/follow-ups")({
  component: FollowUpsPage,
});

function FollowUpsPage() {
  const invoices = useStore((s) => s.invoices);
  const reminders = useStore((s) => s.reminders);
  const business = useStore((s) => s.business);
  const sendReminder = useStore((s) => s.sendReminder);

  const open = invoices.filter((i) => i.status !== "paid");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl">Follow-ups</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Tone steps from gentle to firm as the invoice ages. The message is
        copied into the WhatsApp thread — you still hit send on the phone.
      </p>

      <ul className="mt-6 space-y-4">
        {open.map((inv) => {
          const tone = reminderTone(inv);
          const preview = reminderCopy(inv, business, tone);
          const history = reminders.filter((r) => r.invoiceId === inv.id);
          return (
            <li key={inv.id} className="rounded-xl bg-surface p-4 shadow-border">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{inv.customerName}</p>
                  <p className="text-xs text-muted">
                    {inv.number} · {formatINR(inv.total)} · due{" "}
                    {indianDate(inv.dueAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      tone === "escalate"
                        ? "danger"
                        : tone === "firm"
                          ? "warn"
                          : "default"
                    }
                  >
                    {tone}
                  </Badge>
                  {isOverdue(inv) ? (
                    <Badge variant="danger">Overdue</Badge>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 rounded-md bg-bg px-3 py-2 text-sm">{preview}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted">
                  {history.length} reminder{history.length === 1 ? "" : "s"} sent
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    const r = sendReminder(inv.id);
                    if (r) toast.success("Reminder dropped into the chat");
                  }}
                >
                  Send reminder
                </Button>
              </div>
              {history.length > 0 ? (
                <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted">
                  {history.map((r) => (
                    <li key={r.id}>
                      {indianDateTime(r.sentAt)} · {r.tone}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
