import { daysBetween } from "./format";
import type { Business, Invoice, ReminderTone } from "./types";
import { isOverdue } from "./gst";

export function reminderTone(invoice: Invoice, now = new Date()): ReminderTone {
  const days = daysBetween(invoice.dueAt, now);
  if (days >= 9) return "escalate";
  if (days >= 1 || isOverdue(invoice, now)) return "firm";
  return "gentle";
}

export function reminderCopy(
  invoice: Invoice,
  business: Business,
  tone: ReminderTone,
): string {
  const amt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(invoice.total);
  const name = invoice.customerName.replace(/\s+(traders|boutique|garments|sarees|wholesale)$/i, "");

  if (tone === "gentle") {
    return `Namaste ${name} ji, invoice ${invoice.number} ka payment pending hai — ${amt}. UPI: ${business.upi}. Jab convenient ho, clear kar dena. — ${business.name}`;
  }
  if (tone === "firm") {
    return `${name} ji, invoice ${invoice.number} due date nikal chuka hai. Amount ${amt}. Please aaj UPI kar dein taaki naya dispatch continue rahe. UPI: ${business.upi} — ${business.name}`;
  }
  return `${name} ji, invoice ${invoice.number} overdue hai (${amt}). Is hafte clear nahi hua to naya order hold karna padega. UPI: ${business.upi} — ${business.name}`;
}
