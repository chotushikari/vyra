import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CATALOG } from "@/lib/catalog";
import { formatINR, formatQty } from "@/lib/format";
import { taxableTotal } from "@/lib/gst";
import { useStore } from "@/lib/store";
import type { OrderItem } from "@/lib/types";
import { AgentTrace } from "@/components/agent-trace";
import { uid } from "@/lib/format";

export function VerifyOrderDialog() {
  const draft = useStore((s) => s.draft);
  const clearDraft = useStore((s) => s.clearDraft);
  const updateDraftItems = useStore((s) => s.updateDraftItems);
  const updateDraftNotes = useStore((s) => s.updateDraftNotes);
  const confirmDraft = useStore((s) => s.confirmDraft);
  const invoiceOrder = useStore((s) => s.invoiceOrder);
  const navigate = useNavigate();

  if (!draft) return null;

  const items = draft.items;
  const subtotal = taxableTotal(items);
  const inquiry = !draft.extracted.isConfirmedOrder;
  const trace = [
    { id: uid("trace"), type: `CLASSIFIED_${draft.extracted.intent}`, tool: "intent_classifier", entityId: draft.conversationId, status: "SUCCESS" as const, reason: `Classified as ${draft.extracted.intent}.`, requiresHumanApproval: false, timestamp: new Date().toISOString() },
    { id: uid("trace"), type: "EXTRACT_ENTITIES", tool: "structured_extraction", entityId: draft.conversationId, status: "SUCCESS" as const, reason: `${draft.extracted.items.length} product line${draft.extracted.items.length === 1 ? "" : "s"} extracted from the message.`, requiresHumanApproval: false, timestamp: new Date().toISOString() },
    { id: uid("trace"), type: "RETRIEVE_CATALOG", tool: "catalog_tool", entityId: draft.conversationId, status: "SUCCESS" as const, reason: "Matched structured items against demo catalog pricing.", requiresHumanApproval: false, timestamp: new Date().toISOString() },
  ];

  function setItem(index: number, patch: Partial<OrderItem>) {
    updateDraftItems(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function addItem() {
    const p = CATALOG[0];
    updateDraftItems([
      ...items,
      {
        productId: p.id,
        name: p.name,
        qty: 1,
        rate: p.price,
        hsn: p.hsn,
        color: p.color,
      },
    ]);
  }

  function onProduct(index: number, productId: string) {
    const p = CATALOG.find((x) => x.id === productId);
    if (!p) return;
    setItem(index, {
      productId: p.id,
      name: p.name,
      rate: p.price,
      hsn: p.hsn,
      color: p.color,
    });
  }

  function confirm(andInvoice: boolean) {
    const id = confirmDraft();
    if (!id) {
      toast.error("Add at least one item before confirming.");
      return;
    }
    toast.success("Order confirmed");
    if (andInvoice) {
      const invId = invoiceOrder(id);
      if (invId) {
        toast.success("GST invoice ready");
        void navigate({ to: "/invoice/$invoiceId", params: { invoiceId: invId } });
        return;
      }
    }
    void navigate({ to: "/orders" });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && clearDraft()}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verify order</DialogTitle>
          <DialogDescription>
            Human check before anything is invoiced. Confidence{" "}
            {Math.round(draft.extracted.confidence * 100)}% ·{" "}
{draft.source === "ai" ? "Groq AI extraction" : "Local parser"}
          </DialogDescription>
        </DialogHeader>

        {inquiry ? (
          <div className="flex gap-2 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            This looks like an inquiry, not a confirmed order. You can still
            convert it if the customer meant to buy.
          </div>
        ) : null}

        {draft.extracted.warnings.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
            {draft.extracted.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}

        <AgentTrace actions={trace} compact />

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Rate</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={`${item.productId}-${i}`} className="border-t border-border">
                  <td className="px-2 py-2">
                    <select
                      className="h-10 w-full rounded-sm border border-border bg-surface px-2 text-sm"
                      value={item.productId}
                      onChange={(e) => onProduct(i, e.target.value)}
                    >
                      {CATALOG.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={1}
                      className="h-10 w-20"
                      value={item.qty}
                      onChange={(e) =>
                        setItem(i, { qty: Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={0}
                      className="h-10 w-24"
                      value={item.rate}
                      onChange={(e) =>
                        setItem(i, { rate: Math.max(0, Number(e.target.value) || 0) })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatINR(item.qty * item.rate)}
                  </td>
                  <td className="px-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove item"
                      onClick={() =>
                        updateDraftItems(items.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button variant="outline" size="sm" className="w-fit" onClick={addItem}>
          <Plus className="size-4" />
          Add item
        </Button>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted" htmlFor="del">
              Delivery
            </label>
            <Input
              id="del"
              value={draft.deliveryNote}
              onChange={(e) => updateDraftNotes({ deliveryNote: e.target.value })}
              placeholder="kal tak, bus parcel…"
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted" htmlFor="pay">
              Payment note
            </label>
            <Input
              id="pay"
              value={draft.paymentNote}
              onChange={(e) => updateDraftNotes({ paymentNote: e.target.value })}
              placeholder="UPI, COD, later…"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-sm text-muted">
            Taxable{" "}
            <span className="font-medium text-fg tabular-nums">
              {formatINR(subtotal)}
            </span>
            <span className="mx-2">·</span>
            {formatQty(items.reduce((n, i) => n + i.qty, 0))} pcs
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => confirm(false)}>
              Confirm order
            </Button>
            <Button onClick={() => confirm(true)}>Confirm + GST invoice</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
