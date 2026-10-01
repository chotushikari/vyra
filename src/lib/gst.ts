import type { Business, Invoice, Order, OrderItem } from "./types";
import { uid } from "./format";

export function lineAmount(item: OrderItem): number {
  return Math.round(item.qty * item.rate);
}

export function taxableTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + lineAmount(item), 0);
}

export function splitGst(taxable: number, ratePct: number, intraState: boolean) {
  const gst = Math.round((taxable * ratePct) / 100);
  if (intraState) {
    const half = Math.round(gst / 2);
    return { cgst: half, sgst: gst - half, igst: 0, gst };
  }
  return { cgst: 0, sgst: 0, igst: gst, gst };
}

export function buildUpiLink(business: Business, amount: number, note: string): string {
  const params = new URLSearchParams({
    pa: business.upi,
    pn: business.name,
    am: String(amount),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function buildInvoice(opts: {
  order: Order;
  business: Business;
  issuedAt?: string;
  customerGstin?: string;
  isIntraState?: boolean;
}): { invoice: Invoice; nextSeq: number } {
  const issuedAt = opts.issuedAt ?? new Date().toISOString();
  const taxable = taxableTotal(opts.order.items);
  const intra = opts.isIntraState ?? true;
  const split = splitGst(taxable, opts.business.gstRate, intra);
  const total = taxable + split.gst;
  const number = `${opts.business.invoicePrefix}-${String(opts.business.nextInvoiceSeq).padStart(4, "0")}`;
  const invoice: Invoice = {
    id: uid("inv"),
    number,
    orderId: opts.order.id,
    conversationId: opts.order.conversationId,
    customerName: opts.order.customerName,
    customerPhone: opts.order.customerPhone,
    customerCity: opts.order.customerCity,
    customerGstin: opts.customerGstin,
    items: opts.order.items,
    taxable,
    cgst: split.cgst,
    sgst: split.sgst,
    igst: split.igst,
    total,
    gstRate: opts.business.gstRate,
    placeOfSupply: intra ? opts.business.state : opts.order.customerCity,
    isIntraState: intra,
    status: "unpaid",
    issuedAt,
    dueAt: addDays(issuedAt, 7),
    upiLink: buildUpiLink(opts.business, total, `Invoice ${number}`),
  };
  return { invoice, nextSeq: opts.business.nextInvoiceSeq + 1 };
}

export function isOverdue(invoice: Invoice, now = new Date()): boolean {
  if (invoice.status === "paid") return false;
  return new Date(invoice.dueAt).getTime() < now.getTime();
}
