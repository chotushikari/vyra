import { CATALOG, findProduct } from "./catalog";
import type { ExtractedOrder, OrderItem } from "./types";

const ADDRESS_WORDS =
  /^(bhaiya|bhaiyya|bhai|bhaiji|madam|maam|ma'am|sir|didi|ji|boss|yaar|dear)$/i;

const INQUIRY_RE =
  /\b(rate|price|kitne ka|kitna|kya hai|available|stock hai|sample|catalogue|catalog|price list)\b/i;

const CONFIRM_RE =
  /\b(bhej dena|bhej do|bhej dena|bhejo|bhej de|send|dispatch|order confirm|pakka|deal|le raha|le lungi|le rahi|book kar|confirm|bhej dena kal|kal tak)\b/i;

const SIZE_RE = /\bsize\s*(xs|s|m|l|xl|xxl|[0-9]{1,2})\b/i;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/duppate|duppata/g, "dupatta")
    .replace(/scarves/g, "scarf")
    .replace(/kurtas/g, "kurta")
    .replace(/stoles/g, "stole")
    .replace(/saari/g, "saree");
}

function qtyNear(text: string, alias: string): number | null {
  const n = normalize(text);
  const a = alias.toLowerCase();
  const patterns = [
    new RegExp(`(\\d+)\\s*(?:pcs?|piece|pieces)?\\s*${escapeRe(a)}`),
    new RegExp(`${escapeRe(a)}\\s*(?:x|×)?\\s*(\\d+)`),
    new RegExp(`(\\d+)\\s+${escapeRe(a)}`),
  ];
  for (const re of patterns) {
    const m = n.match(re);
    if (m?.[1]) return Number(m[1]);
  }
  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseOrderLocal(opts: {
  messages: string;
  contactName: string;
}): ExtractedOrder {
  const text = opts.messages;
  const warnings: string[] = [];
  const items: ExtractedOrder["items"] = [];
  const seen = new Set<string>();

  for (const product of CATALOG) {
    for (const alias of [product.name, ...product.aliases]) {
      const qty = qtyNear(text, alias);
      if (qty && qty > 0 && !seen.has(product.id)) {
        seen.add(product.id);
        const sizeMatch = text.match(SIZE_RE);
        items.push({
          name: product.name,
          quantity: qty,
          color: product.color,
          size: sizeMatch?.[1]?.toUpperCase(),
          unitPrice: product.price,
        });
        break;
      }
    }
  }

  // Size-split kurtas: "10 black kurta size M, 5 white size L"
  const kurtaSplit = [
    ...normalize(text).matchAll(
      /(\d+)\s+(black|white|red|blue|green)\s+kurta(?:s)?(?:\s+size\s*(m|l|s|xl))?/g,
    ),
  ];
  if (kurtaSplit.length) {
    for (const m of kurtaSplit) {
      const qty = Number(m[1]);
      const color = m[2];
      const size = m[3]?.toUpperCase();
      const product = findProduct("kurta", color, size);
      if (product && !items.some((i) => i.name === product.name)) {
        items.push({
          name: product.name,
          quantity: qty,
          color: product.color,
          size,
          unitPrice: product.price,
        });
      }
    }
  }

  const isInquiry = INQUIRY_RE.test(text) && !CONFIRM_RE.test(text);
  const isConfirmed = CONFIRM_RE.test(text) && items.length > 0 && !isInquiry;

  if (ADDRESS_WORDS.test(text.trim().split(/\s+/)[0] ?? "")) {
    warnings.push("Polite address (Bhaiya/Madam) ignored — using WhatsApp contact name.");
  }
  if (isInquiry) {
    warnings.push("This reads as a price inquiry, not a confirmed order.");
  }
  if (items.length === 0) {
    warnings.push("No catalog products matched. Add items manually.");
  }

  const delivery =
    text.match(/\b(kal tak|aaj|parso|kal|today|tomorrow|day after)\b/i)?.[0] ??
    null;
  const payment =
    text.match(/\b(upi|cod|cash|advance|payment kal|baad mein|later)\b/i)?.[0] ??
    null;

  return {
    intent: isConfirmed ? "CONFIRMED_ORDER" : isInquiry ? "INQUIRY" : items.length > 0 ? "NEGOTIATION" : "OTHER",
    isConfirmedOrder: isConfirmed,
    confidence: items.length === 0 ? 0.25 : isConfirmed ? 0.82 : 0.55,
    customerName: opts.contactName,
    items,
    deliveryIntent: delivery,
    paymentIntent: payment,
    warnings,
    reasoning: "Local Hinglish parser (catalog + quantity patterns).",
  };
}

export function extractedToItems(extracted: ExtractedOrder): OrderItem[] {
  return extracted.items.map((item) => {
    const product = findProduct(item.name, item.color, item.size);
    return {
      productId: product?.id ?? item.name.toLowerCase().replace(/\s+/g, "-"),
      name: product?.name ?? item.name,
      qty: item.quantity,
      rate: item.unitPrice ?? product?.price ?? 0,
      hsn: product?.hsn ?? "6214",
      color: item.color ?? product?.color,
      size: item.size,
    };
  });
}
