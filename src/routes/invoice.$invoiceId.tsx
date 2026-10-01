import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, Printer } from "lucide-react";
import { toast } from "sonner";
import { InvoiceDoc } from "@/components/invoice-doc";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/invoice/$invoiceId")({
  component: InvoicePage,
});

function InvoicePage() {
  const { invoiceId } = Route.useParams();
  const invoice = useStore((s) => s.invoices.find((i) => i.id === invoiceId));
  const business = useStore((s) => s.business);
  const markInvoicePaid = useStore((s) => s.markInvoicePaid);
  const markInvoiceSent = useStore((s) => s.markInvoiceSent);

  if (!invoice) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-4">
        <p className="text-sm text-muted">Invoice not found.</p>
        <Button asChild variant="secondary">
          <Link to="/invoices">Back to invoices</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg pb-16">
      <div className="no-print mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/invoices">
            <ArrowLeft className="size-4" />
            Invoices
          </Link>
        </Button>
        <div className="flex-1" />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(invoice.upiLink);
            toast.success("UPI link copied");
          }}
        >
          <Copy className="size-4" />
          Copy UPI
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            markInvoiceSent(invoice.id);
            toast.success("Dropped into the WhatsApp thread");
          }}
        >
          Send on chat
        </Button>
        {invoice.status !== "paid" ? (
          <Button
            size="sm"
            onClick={() => {
              markInvoicePaid(invoice.id);
              toast.success("Marked paid");
            }}
          >
            <Check className="size-4" />
            Mark paid
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print
        </Button>
      </div>
      <div className="px-3 sm:px-4">
        <InvoiceDoc invoice={invoice} business={business} />
      </div>
    </div>
  );
}
