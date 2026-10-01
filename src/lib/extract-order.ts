import { createServerFn } from "@tanstack/react-start";
import { CATALOG } from "./catalog";
import { parseOrderLocal } from "./parse-order";
import type { ExtractedOrder } from "./types";

const SYSTEM = `You extract confirmed wholesale orders from messy Indian WhatsApp chats (Hinglish: mixed Hindi + English, typos, voice-note transcripts).

Return ONLY valid JSON matching this schema:
{
  "intent": "INQUIRY | NEGOTIATION | CONFIRMED_ORDER | CANCELLATION | MODIFICATION | PAYMENT_CONFIRMATION | DELIVERY_QUERY | OTHER",
  "isConfirmedOrder": boolean,
  "confidence": number,
  "customerName": string | null,
  "items": [{"name": string, "quantity": number, "color": string, "size": string, "unitPrice": number, "notes": string}],
  "deliveryIntent": string | null,
  "paymentIntent": string | null,
  "warnings": string[],
  "reasoning": string
}

Rules:
- Distinguish INQUIRY vs CONFIRMED ORDER. Inquiries ask rate/price/availability ("rate kya hai", "available hai kya"). Confirmed orders request dispatch ("bhej dena", "bhej do", "pakka", "deal", "order confirm", "le raha hu").
- NEVER treat polite address words as customer names: Bhaiya, Bhai, Bhaiyya, Madam, Sir, Didi, Ji, Boss, Yaar. Use the provided WhatsApp contact name instead.
- Extract every product with quantity. Map to the catalog names when possible.
- Typos: duppata→dupatta, scarves→scarf, saari→saree.
- Multiple products in one sentence are normal ("5 red scarf aur 2 blue dupatta").
- Negotiation mixed with ordering: if they agree ("ok deal", "theek hai") treat as confirmed.
- Voice-note transcripts may lack punctuation.
- If quantity is missing, omit the item and add a warning.
- unitPrice: use catalog price when the name matches; otherwise null.
- confidence: 0-1. Lower if inquiry, missing qty, or ambiguous product.
- reasoning: one short auditable decision note (not a step-by-step explanation).
- Do not invent products that are not in the chat.`;

const FEW_SHOT = `Catalog:
${CATALOG.map((p) => `- ${p.name} | aliases: ${p.aliases.join(", ")} | ₹${p.price} | HSN ${p.hsn}`).join("\n")}

Example 1
Contact: Rakesh Traders
Chat: Bhaiya 5 red scarf aur 2 blue dupatta bhej dena kal tak
JSON: {"isConfirmedOrder":true,"confidence":0.94,"customerName":"Rakesh Traders","items":[{"name":"Red Scarf","quantity":5,"color":"Red","unitPrice":180},{"name":"Blue Dupatta","quantity":2,"color":"Blue","unitPrice":250}],"deliveryIntent":"kal tak","paymentIntent":null,"warnings":["Polite address Bhaiya ignored"],"reasoning":"Dispatch verb bhej dena + quantities."}

Example 2
Contact: Sharma Garments
Chat: Red dupatta ka rate kya hai?
JSON: {"isConfirmedOrder":false,"confidence":0.4,"customerName":"Sharma Garments","items":[{"name":"Blue Dupatta","quantity":0,"color":"Red","unitPrice":250}],"deliveryIntent":null,"paymentIntent":null,"warnings":["Inquiry, not an order","Quantity missing"],"reasoning":"Asking for rate."}`;

export const extractOrder = createServerFn({ method: "POST" })
  .validator((input: { messages: string; contactName: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; extracted: ExtractedOrder; source: "ai" | "local" } | { ok: false; error: string; extracted: ExtractedOrder; source: "local" }> => {
    const fallback = parseOrderLocal(data);
    const apiKey = process.env.GROQ_API_KEY;
    // Demo mode is deterministic and requires neither network nor credentials.
    // The production app uses Groq only when the server-side key is configured.
    const demoMode = process.env.VYRA_DEMO_MODE === "true";
    if (demoMode || !apiKey) {
      return { ok: true, extracted: fallback, source: "local" };
    }

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          temperature: 0,
          max_tokens: 700,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content: `${FEW_SHOT}\n\nNow extract:\nContact: ${data.contactName}\nChat:\n${data.messages}`,
            },
          ],
        }),
      });

      if (!res.ok) {
        return {
          ok: false,
          error: `AI unavailable (${res.status}). Used local parser.`,
          extracted: fallback,
          source: "local",
        };
      }

      const body = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      const raw = body.choices[0]?.message.content ?? "";
      // Some OpenAI-compatible models still wrap JSON mode output in a fenced
      // block. Accept the object without relaxing the shape validation below.
      const json = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .match(/\{[\s\S]*\}/)?.[0] ?? raw;
      const parsed = JSON.parse(json) as ExtractedOrder;
      if (!parsed || !Array.isArray(parsed.items)) {
        return {
          ok: false,
          error: "AI returned an unexpected shape. Used local parser.",
          extracted: fallback,
          source: "local",
        };
      }
      parsed.customerName = data.contactName;
      parsed.intent = parsed.isConfirmedOrder ? "CONFIRMED_ORDER" : "INQUIRY";
      if (parsed.items.some((i) => !i.quantity || i.quantity <= 0)) {
        parsed.items = parsed.items.filter((i) => i.quantity > 0);
        parsed.warnings = [
          ...(parsed.warnings ?? []),
          "Dropped items with missing quantity.",
        ];
      }
      return { ok: true, extracted: parsed, source: "ai" };
    } catch {
      return {
        ok: false,
        error: "AI request failed. Used local parser.",
        extracted: fallback,
        source: "local",
      };
    }
  });
