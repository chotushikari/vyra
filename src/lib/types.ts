export type Product = {
  id: string;
  name: string;
  aliases: string[];
  price: number;
  hsn: string;
  unit: string;
  color?: string;
};

export type ChatMessage = {
  id: string;
  from: "customer" | "business";
  text: string;
  at: string;
};

export type Conversation = {
  id: string;
  name: string;
  city: string;
  phone: string;
  gstin?: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
  messages: ChatMessage[];
};

export type OrderItem = {
  productId: string;
  name: string;
  qty: number;
  rate: number;
  hsn: string;
  color?: string;
  size?: string;
};

export type OrderStatus =
  | "needs_review"
  | "confirmed"
  | "invoiced"
  | "paid"
  | "cancelled";

export type Order = {
  id: string;
  conversationId: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  items: OrderItem[];
  deliveryNote: string;
  paymentNote: string;
  status: OrderStatus;
  source: "ai" | "local" | "manual";
  confidence: number;
  warnings: string[];
  isConfirmedOrder: boolean;
  createdAt: string;
  invoiceId?: string;
  rawChat: string;
};

export type InvoiceStatus = "unpaid" | "paid";

export type Invoice = {
  id: string;
  number: string;
  orderId: string;
  conversationId: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerGstin?: string;
  items: OrderItem[];
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  gstRate: number;
  placeOfSupply: string;
  isIntraState: boolean;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  sentAt?: string;
  upiLink: string;
};

export type ReminderTone = "gentle" | "firm" | "escalate";

export type Reminder = {
  id: string;
  invoiceId: string;
  tone: ReminderTone;
  message: string;
  sentAt: string;
};

export type Business = {
  name: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  phone: string;
  email: string;
  upi: string;
  gstRate: number;
  invoicePrefix: string;
  nextInvoiceSeq: number;
};

export type ExtractedOrder = {
  intent:
    | "INQUIRY"
    | "NEGOTIATION"
    | "CONFIRMED_ORDER"
    | "CANCELLATION"
    | "MODIFICATION"
    | "PAYMENT_CONFIRMATION"
    | "DELIVERY_QUERY"
    | "OTHER";
  isConfirmedOrder: boolean;
  confidence: number;
  customerName: string | null;
  items: Array<{
    name: string;
    quantity: number;
    color?: string;
    size?: string;
    unitPrice?: number;
    notes?: string;
  }>;
  deliveryIntent: string | null;
  paymentIntent: string | null;
  warnings: string[];
  reasoning: string;
};

export type AgentAction = {
  id: string;
  type: string;
  tool: string;
  entityId: string;
  status: "SUCCESS" | "REVIEW_REQUIRED";
  reason: string;
  requiresHumanApproval: boolean;
  timestamp: string;
};
