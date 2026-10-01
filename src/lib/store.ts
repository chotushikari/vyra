import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_BUSINESS,
  SEED_CONVERSATIONS,
  SEED_INVOICES,
  SEED_ORDERS,
  SEED_REMINDERS,
} from "./demo-data";
import { uid } from "./format";
import { buildInvoice } from "./gst";
import { reminderCopy, reminderTone } from "./reminders";
import { prioritizeOutstanding, recoveryTrace } from "./revenue-agent";
import type {
  AgentAction,
  Business,
  Conversation,
  ExtractedOrder,
  Invoice,
  Order,
  OrderItem,
  Reminder,
} from "./types";
import { extractedToItems } from "./parse-order";

type Draft = {
  conversationId: string;
  extracted: ExtractedOrder;
  source: "ai" | "local" | "manual";
  items: OrderItem[];
  deliveryNote: string;
  paymentNote: string;
};

type Store = {
  hydrated: boolean;
  setHydrated: () => void;
  business: Business;
  conversations: Conversation[];
  orders: Order[];
  invoices: Invoice[];
  reminders: Reminder[];
  agentActions: AgentAction[];
  draft: Draft | null;
  setBusiness: (patch: Partial<Business>) => void;
  markRead: (conversationId: string) => void;
  addPastedChat: (opts: { name: string; city: string; phone: string; text: string }) => string;
  appendMessage: (conversationId: string, text: string, from: "customer" | "business") => void;
  openDraft: (conversationId: string, extracted: ExtractedOrder, source: Draft["source"]) => void;
  updateDraftItems: (items: OrderItem[]) => void;
  updateDraftNotes: (patch: Partial<Pick<Draft, "deliveryNote" | "paymentNote">>) => void;
  clearDraft: () => void;
  confirmDraft: () => string | null;
  invoiceOrder: (orderId: string) => string | null;
  markInvoicePaid: (invoiceId: string) => void;
  markInvoiceSent: (invoiceId: string) => void;
  sendReminder: (invoiceId: string) => Reminder | null;
  runRevenueRecovery: () => { invoiceId: string; followUp: string } | null;
  resetDemo: () => void;
};

const seed = () => ({
  business: DEFAULT_BUSINESS,
  conversations: SEED_CONVERSATIONS,
  orders: SEED_ORDERS,
  invoices: SEED_INVOICES,
  reminders: SEED_REMINDERS,
  agentActions: [] as AgentAction[],
  draft: null as Draft | null,
});

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      ...seed(),
      setBusiness: (patch) =>
        set((s) => ({ business: { ...s.business, ...patch } })),
      markRead: (conversationId) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, unread: 0 } : c,
          ),
        })),
      addPastedChat: ({ name, city, phone, text }) => {
        const id = uid("chat");
        const at = new Date().toISOString();
        const convo: Conversation = {
          id,
          name,
          city,
          phone,
          lastMessage: text.slice(0, 80),
          lastAt: at,
          unread: 1,
          messages: [{ id: uid("m"), from: "customer", text, at }],
        };
        set((s) => ({ conversations: [convo, ...s.conversations] }));
        return id;
      },
      appendMessage: (conversationId, text, from) => {
        const at = new Date().toISOString();
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id !== conversationId
              ? c
              : {
                  ...c,
                  lastMessage: text.slice(0, 80),
                  lastAt: at,
                  messages: [
                    ...c.messages,
                    { id: uid("m"), from, text, at },
                  ],
                },
          ),
        }));
      },
      openDraft: (conversationId, extracted, source) => {
        const convo = get().conversations.find((c) => c.id === conversationId);
        set({
          draft: {
            conversationId,
            extracted: {
              ...extracted,
              customerName: convo?.name ?? extracted.customerName,
            },
            source,
            items: extractedToItems(extracted),
            deliveryNote: extracted.deliveryIntent ?? "",
            paymentNote: extracted.paymentIntent ?? "",
          },
        });
      },
      updateDraftItems: (items) =>
        set((s) => (s.draft ? { draft: { ...s.draft, items } } : s)),
      updateDraftNotes: (patch) =>
        set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : s)),
      clearDraft: () => set({ draft: null }),
      confirmDraft: () => {
        const { draft, conversations } = get();
        if (!draft || draft.items.length === 0) return null;
        const convo = conversations.find((c) => c.id === draft.conversationId);
        if (!convo) return null;
        const order: Order = {
          id: uid("ord"),
          conversationId: convo.id,
          customerName: convo.name,
          customerPhone: convo.phone,
          customerCity: convo.city,
          items: draft.items,
          deliveryNote: draft.deliveryNote,
          paymentNote: draft.paymentNote,
          status: "confirmed",
          source: draft.source,
          confidence: draft.extracted.confidence,
          warnings: draft.extracted.warnings,
          isConfirmedOrder: draft.extracted.isConfirmedOrder,
          createdAt: new Date().toISOString(),
          rawChat: convo.messages.map((m) => m.text).join("\n"),
        };
        set((s) => ({ orders: [order, ...s.orders], draft: null }));
        return order.id;
      },
      invoiceOrder: (orderId) => {
        const { orders, business, conversations } = get();
        const order = orders.find((o) => o.id === orderId);
        if (!order) return null;
        const convo = conversations.find((c) => c.id === order.conversationId);
        const intra =
          /gujarat|ahmedabad|surat|vadodara|rajkot/i.test(order.customerCity) ||
          /gujarat/i.test(order.customerCity);
        const { invoice, nextSeq } = buildInvoice({
          order,
          business,
          customerGstin: convo?.gstin,
          isIntraState: intra,
        });
        set((s) => ({
          invoices: [invoice, ...s.invoices],
          orders: s.orders.map((o) =>
            o.id === orderId
              ? { ...o, status: "invoiced", invoiceId: invoice.id }
              : o,
          ),
          business: { ...s.business, nextInvoiceSeq: nextSeq },
        }));
        return invoice.id;
      },
      markInvoicePaid: (invoiceId) => {
        const paidAt = new Date().toISOString();
        set((s) => {
          const inv = s.invoices.find((i) => i.id === invoiceId);
          return {
            invoices: s.invoices.map((i) =>
              i.id === invoiceId ? { ...i, status: "paid", paidAt } : i,
            ),
            orders: s.orders.map((o) =>
              o.id === inv?.orderId ? { ...o, status: "paid" } : o,
            ),
          };
        });
      },
      markInvoiceSent: (invoiceId) => {
        const sentAt = new Date().toISOString();
        const inv = get().invoices.find((i) => i.id === invoiceId);
        if (!inv) return;
        get().appendMessage(
          inv.conversationId,
          `Invoice ${inv.number} — ${inv.upiLink}`,
          "business",
        );
        set((s) => ({
          invoices: s.invoices.map((i) =>
            i.id === invoiceId ? { ...i, sentAt } : i,
          ),
        }));
      },
      sendReminder: (invoiceId) => {
        const { invoices, business } = get();
        const inv = invoices.find((i) => i.id === invoiceId);
        if (!inv || inv.status === "paid") return null;
        const tone = reminderTone(inv);
        const message = reminderCopy(inv, business, tone);
        const reminder: Reminder = {
          id: uid("rem"),
          invoiceId,
          tone,
          message,
          sentAt: new Date().toISOString(),
        };
        get().appendMessage(inv.conversationId, message, "business");
        set((s) => ({ reminders: [reminder, ...s.reminders] }));
        return reminder;
      },
      runRevenueRecovery: () => {
        const { invoices, conversations, business } = get();
        const candidate = prioritizeOutstanding(invoices, conversations, business)[0];
        if (!candidate) return null;
        const sent = get().sendReminder(candidate.invoice.id);
        const actions = [
          ...recoveryTrace(candidate),
          {
            id: uid("act"),
            type: "SEND_FOLLOW_UP",
            tool: "sandbox_whatsapp_adapter",
            entityId: candidate.invoice.id,
            status: "SUCCESS" as const,
            reason: sent
              ? "Simulated WhatsApp delivery completed and conversation state updated."
              : "Reminder was already unavailable for this invoice.",
            requiresHumanApproval: false,
            timestamp: new Date().toISOString(),
          },
        ];
        set((s) => ({ agentActions: [...actions, ...s.agentActions] }));
        return { invoiceId: candidate.invoice.id, followUp: candidate.followUp };
      },
      resetDemo: () => set({ ...seed() }),
    }),
    {
      name: "vyra-demo-v1",
      skipHydration: true,
      partialize: (s) => ({
        business: s.business,
        conversations: s.conversations,
        orders: s.orders,
        invoices: s.invoices,
        reminders: s.reminders,
        agentActions: s.agentActions,
      }),
    },
  ),
);
