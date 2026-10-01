import { daysBetween, uid } from "./format";
import { isOverdue } from "./gst";
import { reminderCopy, reminderTone } from "./reminders";
import type { AgentAction, Business, Conversation, Invoice } from "./types";

export type RecoveryCandidate = {
  invoice: Invoice;
  daysOverdue: number;
  score: number;
  reason: string;
  context: string;
  followUp: string;
};

export function prioritizeOutstanding(
  invoices: Invoice[],
  conversations: Conversation[],
  business: Business,
  now = new Date(),
): RecoveryCandidate[] {
  return invoices
    .filter((invoice) => invoice.status !== "paid")
    .map((invoice) => {
      const daysOverdue = isOverdue(invoice, now)
        ? Math.max(1, daysBetween(invoice.dueAt, now))
        : 0;
      const conversation = conversations.find((item) => item.id === invoice.conversationId);
      const score = daysOverdue * 10000 + invoice.total;
      const reason = daysOverdue > 0
        ? `${daysOverdue} days overdue; ₹${invoice.total.toLocaleString("en-IN")} remains unpaid.`
        : `Payment is pending; due ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(invoice.dueAt))}.`;
      return {
        invoice,
        daysOverdue,
        score,
        reason,
        context: conversation?.lastMessage ?? "No recent conversation context available.",
        followUp: reminderCopy(invoice, business, reminderTone(invoice, now)),
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function recoveryTrace(candidate: RecoveryCandidate): AgentAction[] {
  const now = new Date().toISOString();
  const create = (type: string, tool: string, reason: string): AgentAction => ({
    id: uid("act"), type, tool, entityId: candidate.invoice.id, status: "SUCCESS",
    reason, requiresHumanApproval: false, timestamp: now,
  });
  return [
    create("LIST_OUTSTANDING", "payment_tool", "Retrieved open invoices from simulated business state."),
    create("GET_CUSTOMER_HISTORY", "customer_tool", "Retrieved the latest customer conversation context."),
    create("PRIORITIZE_ACCOUNT", "revenue_policy", candidate.reason),
    create("GENERATE_FOLLOW_UP", "followup_tool", "Prepared a contextual payment reminder for sandbox delivery."),
  ];
}
