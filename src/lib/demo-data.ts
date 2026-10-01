import { buildUpiLink, splitGst, taxableTotal } from "./gst";
import type {
  Business,
  Conversation,
  Invoice,
  Order,
  Reminder,
} from "./types";

export const DEFAULT_BUSINESS: Business = {
  name: "Mehta Textiles",
  gstin: "24AABCM1234A1Z5",
  address: "Shop 14, Millennium Textile Market, Ring Road",
  city: "Surat",
  state: "Gujarat",
  stateCode: "24",
  phone: "+91 98765 43210",
  email: "accounts@mehtatextiles.in",
  upi: "mehtatextiles@okhdfcbank",
  gstRate: 5,
  invoicePrefix: "MT-2026",
  nextInvoiceSeq: 5,
};

const T = {
  d1: "2026-08-04T10:12:00.000Z",
  d2: "2026-08-12T09:40:00.000Z",
  d3: "2026-08-20T14:05:00.000Z",
  d4: "2026-08-08T11:22:00.000Z",
  now: "2026-08-31T07:40:00.000Z",
  m1: "2026-08-30T16:18:00.000Z",
  m2: "2026-08-31T06:55:00.000Z",
  m3: "2026-08-31T08:10:00.000Z",
  m4: "2026-08-29T19:02:00.000Z",
};

export const SEED_CONVERSATIONS: Conversation[] = [
  {
    id: "chat-rakesh",
    name: "Rahul Traders",
    city: "Ahmedabad",
    phone: "+91 98250 11011",
    gstin: "24AARFT8821P1Z3",
    lastMessage: "Bhaiya 5 red scarf aur 2 blue dupatta bhej dena kal tak",
    lastAt: T.m3,
    unread: 2,
    messages: [
      {
        id: "m1",
        from: "customer",
        text: "Bhai kya haal hai, stock ready hai na?",
        at: "2026-08-31T07:58:00.000Z",
      },
      {
        id: "m2",
        from: "business",
        text: "Haan Rakesh bhai, scarf aur dupatta dono ready hain. Kitna chahiye?",
        at: "2026-08-31T08:02:00.000Z",
      },
      {
        id: "m3",
        from: "customer",
        text: "Bhaiya 5 red scarf aur 2 blue dupatta bhej dena kal tak",
        at: T.m3,
      },
    ],
  },
  {
    id: "chat-anjali",
    name: "Maya Handicrafts",
    city: "Indore",
    phone: "+91 73122 44008",
    lastMessage: "10 black kurta size M, 5 white size L. COD nahi, UPI se.",
    lastAt: T.m2,
    unread: 3,
    messages: [
      {
        id: "a1",
        from: "customer",
        text: "Kurta wala rate last time wala chalega?",
        at: "2026-08-31T06:40:00.000Z",
      },
      {
        id: "a2",
        from: "business",
        text: "Haan Anjali ji, M ₹450, L ₹480. Confirm kar do qty.",
        at: "2026-08-31T06:48:00.000Z",
      },
      {
        id: "a3",
        from: "customer",
        text: "Madam, 10 black kurta size M, 5 white size L. COD nahi, UPI se. Pakka order, aaj hi book kar do.",
        at: T.m2,
      },
    ],
  },
  {
    id: "chat-kiran",
    name: "Kiran Sarees",
    city: "Nagpur",
    phone: "+91 98222 77331",
    lastMessage: "haan wo 3 green stole jo kal dikhaya tha wo bhej do, payment kal kar dunga",
    lastAt: T.m1,
    unread: 1,
    messages: [
      {
        id: "k1",
        from: "business",
        text: "Kiran ji, green stole sample pics bhej di. ₹220/pc.",
        at: "2026-08-30T11:10:00.000Z",
      },
      {
        id: "k2",
        from: "customer",
        text: "haan wo 3 green stole jo kal dikhaya tha wo bhej do, payment kal kar dunga",
        at: T.m1,
      },
    ],
  },
  {
    id: "chat-sharma",
    name: "Sharma Textiles",
    city: "Jaipur",
    phone: "+91 94140 22019",
    lastMessage: "Red dupatta ka rate kya hai? Sample bhej sakte ho kya?",
    lastAt: T.m4,
    unread: 1,
    messages: [
      {
        id: "s1",
        from: "customer",
        text: "Bhaiya red dupatta ka rate kya hai? Sample bhej sakte ho kya?",
        at: T.m4,
      },
    ],
  },
  {
    id: "chat-patel",
    name: "Patel Wholesale",
    city: "Vadodara",
    phone: "+91 98795 44120",
    gstin: "24AAPFP4412Q1Z8",
    lastMessage: "ok deal. 8 maroon dupatta bhej dena.",
    lastAt: "2026-08-28T15:44:00.000Z",
    unread: 0,
    messages: [
      {
        id: "p1",
        from: "customer",
        text: "bhai 8 piece maroon dupatta le raha hu, 50 rs kam kar do per piece",
        at: "2026-08-28T15:20:00.000Z",
      },
      {
        id: "p2",
        from: "business",
        text: "8 pc pe ₹20 kam — ₹260. Last.",
        at: "2026-08-28T15:31:00.000Z",
      },
      {
        id: "p3",
        from: "customer",
        text: "ok deal. 8 maroon dupatta bhej dena.",
        at: "2026-08-28T15:44:00.000Z",
      },
    ],
  },
  {
    id: "chat-neha",
    name: "Neha Creations",
    city: "Pune",
    phone: "+91 98600 12845",
    lastMessage: "Invoice mil gaya, UPI kar diya",
    lastAt: "2026-08-18T17:02:00.000Z",
    unread: 0,
    messages: [
      {
        id: "n1",
        from: "customer",
        text: "25 beige scarf chahiye this week. Confirm.",
        at: "2026-08-12T09:12:00.000Z",
      },
      {
        id: "n2",
        from: "business",
        text: "Confirm. Invoice MT-2026-0002 bhej raha hoon.",
        at: "2026-08-12T09:40:00.000Z",
      },
      {
        id: "n3",
        from: "customer",
        text: "Invoice mil gaya, UPI kar diya",
        at: "2026-08-18T17:02:00.000Z",
      },
    ],
  },
];

function money(items: Order["items"], intra: boolean, rate: number) {
  const taxable = taxableTotal(items);
  const split = splitGst(taxable, rate, intra);
  return { taxable, ...split, total: taxable + split.gst };
}

const orderPatelItems: Order["items"] = [
  {
    productId: "maroon-dupatta",
    name: "Maroon Dupatta",
    qty: 8,
    rate: 260,
    hsn: "6214",
    color: "Maroon",
  },
];
const orderNehaItems: Order["items"] = [
  {
    productId: "beige-scarf",
    name: "Beige Scarf",
    qty: 25,
    rate: 190,
    hsn: "6214",
    color: "Beige",
  },
];
const orderOldItems: Order["items"] = [
  {
    productId: "navy-stole",
    name: "Navy Stole",
    qty: 40,
    rate: 240,
    hsn: "6214",
    color: "Navy",
  },
  {
    productId: "pink-dupatta",
    name: "Pink Dupatta",
    qty: 12,
    rate: 260,
    hsn: "6214",
    color: "Pink",
  },
];
const orderGuptaItems: Order["items"] = [
  {
    productId: "cotton-saree",
    name: "Cotton Saree",
    qty: 18,
    rate: 850,
    hsn: "5407",
  },
];

export const SEED_ORDERS: Order[] = [
  {
    id: "ord-patel",
    conversationId: "chat-patel",
    customerName: "Patel Wholesale",
    customerPhone: "+91 98795 44120",
    customerCity: "Vadodara",
    items: orderPatelItems,
    deliveryNote: "bhej dena",
    paymentNote: "deal at ₹260",
    status: "invoiced",
    source: "ai",
    confidence: 0.93,
    warnings: [],
    isConfirmedOrder: true,
    createdAt: "2026-08-28T15:50:00.000Z",
    invoiceId: "inv-patel",
    rawChat: "ok deal. 8 maroon dupatta bhej dena.",
  },
  {
    id: "ord-neha",
    conversationId: "chat-neha",
    customerName: "Neha Creations",
    customerPhone: "+91 98600 12845",
    customerCity: "Pune",
    items: orderNehaItems,
    deliveryNote: "this week",
    paymentNote: "UPI",
    status: "paid",
    source: "ai",
    confidence: 0.9,
    warnings: [],
    isConfirmedOrder: true,
    createdAt: T.d2,
    invoiceId: "inv-neha",
    rawChat: "25 beige scarf chahiye this week. Confirm.",
  },
  {
    id: "ord-old",
    conversationId: "chat-rakesh",
    customerName: "Rahul Traders",
    customerPhone: "+91 98250 11011",
    customerCity: "Ahmedabad",
    items: orderOldItems,
    deliveryNote: "Surat depot pickup",
    paymentNote: "UPI",
    status: "paid",
    source: "local",
    confidence: 0.88,
    warnings: [],
    isConfirmedOrder: true,
    createdAt: T.d1,
    invoiceId: "inv-old",
    rawChat: "40 navy stole + 12 pink dupatta",
  },
  {
    id: "ord-gupta",
    conversationId: "chat-sharma",
    customerName: "Gupta Retail",
    customerPhone: "+91 94140 99821",
    customerCity: "Jaipur",
    items: orderGuptaItems,
    deliveryNote: "bus parcel",
    paymentNote: "pending",
    status: "invoiced",
    source: "manual",
    confidence: 1,
    warnings: [],
    isConfirmedOrder: true,
    createdAt: T.d4,
    invoiceId: "inv-gupta",
    rawChat: "18 cotton saree",
  },
];

function invoiceFrom(
  id: string,
  number: string,
  order: Order,
  issuedAt: string,
  dueAt: string,
  status: Invoice["status"],
  paidAt: string | undefined,
  intra: boolean,
  gstin?: string,
): Invoice {
  const m = money(order.items, intra, 5);
  return {
    id,
    number,
    orderId: order.id,
    conversationId: order.conversationId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerCity: order.customerCity,
    customerGstin: gstin,
    items: order.items,
    taxable: m.taxable,
    cgst: m.cgst,
    sgst: m.sgst,
    igst: m.igst,
    total: m.total,
    gstRate: 5,
    placeOfSupply: intra ? "Gujarat" : order.customerCity,
    isIntraState: intra,
    status,
    issuedAt,
    dueAt,
    paidAt,
    sentAt: issuedAt,
    upiLink: buildUpiLink(DEFAULT_BUSINESS, m.total, `Invoice ${number}`),
  };
}

export const SEED_INVOICES: Invoice[] = [
  invoiceFrom(
    "inv-old",
    "MT-2026-0001",
    SEED_ORDERS[2],
    T.d1,
    "2026-08-11T10:12:00.000Z",
    "paid",
    "2026-08-06T12:00:00.000Z",
    true,
    "24AARFT8821P1Z3",
  ),
  invoiceFrom(
    "inv-neha",
    "MT-2026-0002",
    SEED_ORDERS[1],
    T.d2,
    "2026-08-19T09:40:00.000Z",
    "paid",
    "2026-08-18T17:00:00.000Z",
    false,
  ),
  invoiceFrom(
    "inv-gupta",
    "MT-2026-0003",
    SEED_ORDERS[3],
    T.d4,
    "2026-08-15T11:22:00.000Z",
    "unpaid",
    undefined,
    false,
  ),
  invoiceFrom(
    "inv-patel",
    "MT-2026-0004",
    SEED_ORDERS[0],
    "2026-08-28T16:00:00.000Z",
    "2026-09-04T16:00:00.000Z",
    "unpaid",
    undefined,
    true,
    "24AAPFP4412Q1Z8",
  ),
];

export const SEED_REMINDERS: Reminder[] = [
  {
    id: "rem-1",
    invoiceId: "inv-gupta",
    tone: "gentle",
    message:
      "Namaste Gupta ji, invoice MT-2026-0003 ka payment pending hai. Jab convenient ho, clear kar dena.",
    sentAt: "2026-08-16T10:00:00.000Z",
  },
  {
    id: "rem-2",
    invoiceId: "inv-gupta",
    tone: "firm",
    message:
      "Gupta ji, invoice MT-2026-0003 due date nikal chuka hai. Please aaj UPI kar dein.",
    sentAt: "2026-08-22T10:00:00.000Z",
  },
];
