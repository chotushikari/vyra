import { createServerFn } from "@tanstack/react-start";

type ReplyInput = {
  customerMessage: string;
  contactName: string;
  recentMessages: { from: "customer" | "business"; text: string }[];
};

const OWNER_SYSTEM = `You are the owner of a friendly Indian wholesale textiles business replying in WhatsApp.
Reply only with the message a human owner would send—no headings, no JSON, no claims you cannot verify.
Be concise, helpful and natural in Hinglish. You sell: Yellow Cotton Kurti ₹525, Red Saree ₹1,150, Green Saree ₹1,150, Red Scarf ₹180, Blue Dupatta ₹250.
For a clear order, acknowledge the items, confirm the known price where useful, ask only for missing delivery details, and say you will prepare the invoice. For availability/price questions, answer directly. Keep replies below 55 words.`;

function ownerFallback(message: string) {
  const text = message.toLowerCase();
  if (/bhej|confirm|pakka|order|piece|pcs|saree|scarf|dupatta|kurti/.test(text)) {
    return "Bilkul ji, noted. Main items aur rate verify karke invoice prepare kar raha hoon. Delivery location bhi share kar dijiye, phir dispatch schedule confirm kar deta hoon.";
  }
  if (/rate|price|kitne|kitna|available|stock/.test(text)) {
    return "Haan ji, available hai. Red Scarf ₹180 aur Blue Dupatta ₹250 per piece hai. Quantity aur delivery location bhej dijiye, main final total confirm kar deta hoon.";
  }
  if (/payment|upi|link|pay/.test(text)) {
    return "Ji, payment link ready kar raha hoon. Invoice ke saath WhatsApp par share kar deta hoon—UPI ya QR dono se pay kar sakte hain.";
  }
  return "Ji, bilkul. Aap product, quantity aur delivery location bata dijiye—main availability aur final rate turant confirm kar deta hoon.";
}

export const replyAsOwner = createServerFn({ method: "POST" })
  .validator((input: ReplyInput) => input)
  .handler(async ({ data }): Promise<{ reply: string; source: "ai" | "demo" }> => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || process.env.VYRA_DEMO_MODE === "true") {
      return { reply: ownerFallback(data.customerMessage), source: "demo" };
    }

    try {
      const history = data.recentMessages.slice(-8).map((message) => ({
        role: message.from === "customer" ? "user" : "assistant",
        content: message.text,
      }));
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          temperature: 0.55,
          max_tokens: 140,
          messages: [
            { role: "system", content: `${OWNER_SYSTEM}\nCustomer contact: ${data.contactName}` },
            ...history,
            { role: "user", content: data.customerMessage },
          ],
        }),
      });
      if (!response.ok) {
        return { reply: ownerFallback(data.customerMessage), source: "demo" };
      }
      const body = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const reply = body.choices?.[0]?.message?.content?.trim();
      return reply
        ? { reply, source: "ai" }
        : { reply: ownerFallback(data.customerMessage), source: "demo" };
    } catch {
      return { reply: ownerFallback(data.customerMessage), source: "demo" };
    }
  });
