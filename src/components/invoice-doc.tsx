import { formatINR, formatQty, indianDate } from "@/lib/format";
import { lineAmount } from "@/lib/gst";
import type { Business, Invoice } from "@/lib/types";

export function InvoiceDoc({
  invoice,
  business,
}: {
  invoice: Invoice;
  business: Business;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl bg-surface p-6 text-fg shadow-border sm:p-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted uppercase">
            Tax invoice
          </p>
          <h1 className="mt-1 font-display text-3xl">{business.name}</h1>
          <p className="mt-2 max-w-xs text-sm text-muted">
            {business.address}
            <br />
            {business.city}, {business.state}
            <br />
            GSTIN {business.gstin}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg tabular-nums">{invoice.number}</p>
          <p className="mt-1 text-sm text-muted">
            Dated {indianDate(invoice.issuedAt)}
          </p>
          <p className="text-sm text-muted">Due {indianDate(invoice.dueAt)}</p>
        </div>
      </header>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs tracking-wide text-muted uppercase">Bill to</p>
          <p className="mt-1 font-medium">{invoice.customerName}</p>
          <p className="text-sm text-muted">
            {invoice.customerCity}
            <br />
            {invoice.customerPhone}
            {invoice.customerGstin ? (
              <>
                <br />
                GSTIN {invoice.customerGstin}
              </>
            ) : null}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs tracking-wide text-muted uppercase">
            Place of supply
          </p>
          <p className="mt-1 text-sm">{invoice.placeOfSupply}</p>
          <p className="text-sm text-muted">
            {invoice.isIntraState ? "CGST + SGST" : "IGST"} @ {invoice.gstRate}%
          </p>
        </div>
      </div>

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-y border-border text-left text-xs text-muted">
            <th className="py-2 pr-2 font-medium">#</th>
            <th className="py-2 pr-2 font-medium">Item</th>
            <th className="py-2 pr-2 font-medium">HSN</th>
            <th className="py-2 pr-2 text-right font-medium">Qty</th>
            <th className="py-2 pr-2 text-right font-medium">Rate</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={`${item.productId}-${i}`} className="border-b border-border">
              <td className="py-2.5 pr-2 text-muted">{i + 1}</td>
              <td className="py-2.5 pr-2">
                {item.name}
                {item.size ? ` · ${item.size}` : ""}
              </td>
              <td className="py-2.5 pr-2 font-mono text-xs">{item.hsn}</td>
              <td className="py-2.5 pr-2 text-right tabular-nums">
                {formatQty(item.qty)}
              </td>
              <td className="py-2.5 pr-2 text-right tabular-nums">
                {formatINR(item.rate)}
              </td>
              <td className="py-2.5 text-right tabular-nums">
                {formatINR(lineAmount(item))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 ml-auto w-full max-w-xs space-y-1.5 text-sm">
        <Row label="Taxable value" value={formatINR(invoice.taxable)} />
        {invoice.isIntraState ? (
          <>
            <Row
              label={`CGST ${invoice.gstRate / 2}%`}
              value={formatINR(invoice.cgst)}
            />
            <Row
              label={`SGST ${invoice.gstRate / 2}%`}
              value={formatINR(invoice.sgst)}
            />
          </>
        ) : (
          <Row label={`IGST ${invoice.gstRate}%`} value={formatINR(invoice.igst)} />
        )}
        <div className="flex justify-between border-t border-border pt-2 font-medium">
          <span>Total</span>
          <span className="tabular-nums">{formatINR(invoice.total)}</span>
        </div>
      </div>

      <footer className="mt-10 grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs tracking-wide text-muted uppercase">
            Pay via UPI
          </p>
          <p className="mt-1 font-mono text-xs break-all">{business.upi}</p>
          <p className="mt-2 text-xs text-muted">
            This is a computer-generated invoice. No signature required.
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs text-muted">For {business.name}</p>
          <p className="mt-6 font-display text-lg">Authorised</p>
        </div>
      </footer>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted">
      <span>{label}</span>
      <span className="text-fg tabular-nums">{value}</span>
    </div>
  );
}
