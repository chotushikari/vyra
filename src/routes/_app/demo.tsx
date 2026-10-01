import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, CheckCircle2, CircleDollarSign, FileText, Send, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractOrder } from "@/lib/extract-order";
import { formatINR } from "@/lib/format";
import { isOverdue } from "@/lib/gst";
import { replyAsOwner } from "@/lib/reply-as-owner";
import { useStore } from "@/lib/store";
import type { ExtractedOrder } from "@/lib/types";

export const Route = createFileRoute("/_app/demo")({ component: DemoStudio });

const SCENARIOS = [
  { id: "confirmed", label: "Confirmed order", text: "Bhaiya 5 red scarf aur 2 blue dupatta bhej dena kal tak. Same rate pe kar dena." },
  { id: "inquiry", label: "Price inquiry", text: "5 red scarves chahiye. Price kya hai? Kal tak mil sakta hai?" },
  { id: "payment", label: "Payment update", text: "Invoice mil gaya, UPI aaj evening tak kar deta hoon." },
] as const;

type DemoEvent = { id: string; label: string; tool: string; detail: string; state: "complete" | "running" | "review" };

function DemoStudio() {
  const conversations = useStore((state) => state.conversations);
  const invoices = useStore((state) => state.invoices);
  const orders = useStore((state) => state.orders);
  const appendMessage = useStore((state) => state.appendMessage);
  const openDraft = useStore((state) => state.openDraft);
  const active = conversations.find((item) => item.name === "Rahul Traders") ?? conversations[0];
  const [message, setMessage] = useState<string>(SCENARIOS[0].text);
  const [result, setResult] = useState<ExtractedOrder | null>(null);
  const [resultSource, setResultSource] = useState<"ai" | "local">("local");
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [ownerTyping, setOwnerTyping] = useState(false);
  const [running, setRunning] = useState(false);
  const outstanding = invoices.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.total, 0);
  const overdue = invoices.filter((item) => isOverdue(item)).length;
  const total = useMemo(() => result?.items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0) ?? 0, [result]);

  if (!active) return null;

  async function runSimulation() {
    const customerMessage = message.trim();
    if (!customerMessage || running) return;
    const initialEvents: DemoEvent[] = [
      { id: "received", label: "Message received", tool: "sandbox_whatsapp_adapter", detail: "Customer message added to the conversation.", state: "complete" },
      { id: "owner", label: "Owner reply", tool: "groq_owner_reply", detail: "Generating a concise WhatsApp response.", state: "running" },
    ];
    appendMessage(active.id, customerMessage, "customer");
    setMessage("");
    setResult(null);
    setResultSource("local");
    setEvents(initialEvents);
    setOwnerTyping(true);
    setRunning(true);
    try {
      const owner = await replyAsOwner({ data: { customerMessage, contactName: active.name, recentMessages: active.messages.map((item) => ({ from: item.from, text: item.text })) } });
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      appendMessage(active.id, owner.reply, "business");
      setOwnerTyping(false);
      setEvents((current) => [
        { ...current[0], state: "complete" },
        { ...current[1], detail: owner.source === "ai" ? "Live AI owner reply delivered to the sandbox chat." : "Demo owner reply delivered to the sandbox chat.", state: "complete" },
        { id: "classify", label: "Classify intent", tool: "intent_classifier", detail: "Reading the customer message against commerce intent patterns.", state: "running" },
      ]);
      const transcript = [...active.messages.map((item) => `${item.from}: ${item.text}`), `customer: ${customerMessage}`, `business: ${owner.reply}`].join("\n");
      let extraction = await extractOrder({ data: { contactName: active.name, messages: transcript } });
      // Long, messy histories can carry earlier orders into a new scenario.
      // Retry the current event by itself before selecting the deterministic fallback.
      if (extraction.source === "local") {
        extraction = await extractOrder({
          data: { contactName: active.name, messages: `customer: ${customerMessage}\nbusiness: ${owner.reply}` },
        });
      }
      setResult(extraction.extracted);
      setResultSource(extraction.source);
      const requiresReview = extraction.extracted.isConfirmedOrder;
      setEvents([
        { id: "received", label: "Message received", tool: "sandbox_whatsapp_adapter", detail: "Customer message added to the conversation.", state: "complete" },
        { id: "owner", label: "Owner reply", tool: "groq_owner_reply", detail: owner.source === "ai" ? "Live AI owner reply delivered to the sandbox chat." : "Demo owner reply delivered to the sandbox chat.", state: "complete" },
        { id: "classify", label: `Classified: ${extraction.extracted.intent.replaceAll("_", " ")}`, tool: "intent_classifier", detail: "Intent classification completed.", state: "complete" },
        { id: "extract", label: "Structured extraction", tool: extraction.source === "ai" ? "groq_structured_extraction" : "local_structured_extraction", detail: `${extraction.extracted.items.length} product line${extraction.extracted.items.length === 1 ? "" : "s"} resolved against the catalog.`, state: "complete" },
        { id: "decide", label: requiresReview ? "Approval required" : "Safe next action selected", tool: "action_policy", detail: requiresReview ? "Invoice drafting is held for merchant approval." : "No invoice is created until the customer confirms an order.", state: requiresReview ? "review" : "complete" },
      ]);
      toast.success(extraction.source === "ai" ? "Live AI completed the event flow." : "Demo parser completed the event flow.");
    } catch {
      setOwnerTyping(false);
      setEvents((current) => current.map((event) => event.state === "running" ? { ...event, detail: "Demo fallback is available; try again.", state: "review" } : event));
      toast.error("The simulation could not complete. Please try again.");
    } finally {
      setOwnerTyping(false);
      setRunning(false);
    }
  }

  return <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">VYRA · event-based demo</p><h1 className="mt-1 font-display text-3xl sm:text-4xl">Watch a conversation become revenue state.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">A judge-friendly rehearsal of the real loop: a customer messages, the owner replies, VYRA calls business tools, selects the safe action, and leaves an auditable event trail.</p></div><Badge variant="default"><Sparkles className="size-3" /> Live Groq AI · sandbox actions</Badge></div>
    <div className="mt-6 grid gap-3 rounded-xl border border-border bg-surface p-3 sm:grid-cols-3"><DemoStep active={running || events.length > 0} index="01" label="Conversation" copy="Customer + owner exchange" /><DemoStep active={events.length >= 3} index="02" label="Understand" copy="Intent, entities, catalog" /><DemoStep active={events.length >= 5} index="03" label="Act safely" copy="Approval-gated outcome" /></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_1.15fr_0.8fr]">
      <section className="flex min-h-[620px] flex-col overflow-hidden rounded-xl bg-surface shadow-border"><header className="flex items-center justify-between border-b border-border p-5"><div><p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">Simulated WhatsApp</p><h2 className="mt-1 font-display text-xl">{active.name}</h2></div><Badge variant="muted">Sandbox chat</Badge></header><div className="chat-paper min-h-0 flex-1 space-y-3 overflow-y-auto p-5">{active.messages.slice(-6).map((item) => <ChatBubble key={item.id} from={item.from} name={active.name} text={item.text} />)}{ownerTyping ? <div className="max-w-[85%] rounded-lg bg-chat-in px-3 py-2 text-sm shadow-border"><span className="flex items-center gap-2 text-muted"><Bot className="size-4 text-primary" /> Owner is typing…</span></div> : null}</div><div className="border-t border-border bg-surface p-4"><div className="flex flex-wrap gap-2">{SCENARIOS.map((scenario) => <Button key={scenario.id} size="sm" variant="ghost" disabled={running} onClick={() => setMessage(scenario.text)}>{scenario.label}</Button>)}</div><div className="mt-3 flex gap-2"><Input aria-label="Demo customer message" value={message} disabled={running} onChange={(event) => setMessage(event.target.value)} placeholder="Type a Hinglish customer message…" /><Button disabled={running} onClick={() => void runSimulation()}><Send className="size-4" /> {running ? "Running…" : "Run live"}</Button></div></div></section>
      <section className="min-h-[620px] rounded-xl bg-surface p-5 shadow-border"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">VYRA event stream</p><h2 className="mt-1 font-display text-2xl">What the agent did</h2></div><Zap className="size-5 text-primary" /></div>{events.length ? <ol className="mt-6 space-y-1">{events.map((event, index) => <EventRow key={event.id} event={event} last={index === events.length - 1} />)}</ol> : <EmptyEvents />}{result ? <div className="mt-6 border-t border-border pt-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">Structured result</p><p className="mt-1 text-sm text-muted">Customer resolved: {active.name}</p></div><Badge variant={result.isConfirmedOrder ? "paid" : "warn"}>{result.intent.replaceAll("_", " ")}</Badge></div>{result.items.length ? <div className="mt-4 divide-y divide-border rounded-lg border border-border">{result.items.map((item) => <div key={`${item.name}-${item.quantity}`} className="flex items-center justify-between gap-3 p-3 text-sm"><span><span className="font-medium">{item.quantity}× {item.name}</span><span className="block text-xs text-muted">{item.color ?? "Catalog matched"} · {result.deliveryIntent ?? "Delivery not stated"}</span></span><span className="tabular-nums">{formatINR((item.unitPrice ?? 0) * item.quantity)}</span></div>)}</div> : <div className="mt-4 rounded-lg bg-warn-soft p-3 text-sm text-warn">No order lines were created from this message.</div>}<div className="mt-4 flex items-center justify-between rounded-lg bg-primary-soft p-3"><span className="text-sm font-medium">Potential order value</span><span className="font-display text-xl text-primary">{formatINR(total)}</span></div>{result.isConfirmedOrder ? <Button className="mt-4 w-full" onClick={() => openDraft(active.id, result, resultSource)}><FileText className="size-4" /> Review invoice draft</Button> : <div className="mt-4 rounded-lg bg-surface-2 p-3 text-sm text-muted"><ShieldCheck className="mr-2 inline size-4 text-primary" /> No invoice is created until there is explicit confirmation.</div>}</div> : null}</section>
      <section className="min-h-[620px] rounded-xl bg-surface p-5 shadow-border"><p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">Business state</p><h2 className="mt-1 font-display text-2xl">Why this action</h2><div className="mt-5 grid grid-cols-3 gap-2"><Metric label="Orders" value={String(orders.length)} /><Metric label="Overdue" value={String(overdue)} danger /><Metric label="Open" value={formatINR(outstanding)} /></div><div className="mt-6 rounded-xl border border-border p-4"><p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">Decision</p><p className="mt-2 font-medium">{result?.isConfirmedOrder ? "Prepare an invoice draft for review" : result ? "Answer the customer; wait for a confirmed order" : "Run a scenario to see the next action"}</p><p className="mt-2 text-sm leading-6 text-muted">VYRA can understand and prepare. The merchant remains in control of invoicing and any irreversible action.</p></div><div className="mt-4 rounded-xl bg-surface-2 p-4"><p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">Judge line</p><p className="mt-2 text-sm leading-6">“This is an operational agent: it turns a chat into a decision and a safe business-state update — not just a response.”</p></div><a className="mt-5 flex items-center gap-2 text-sm font-medium text-primary hover:underline" href="/recovery"><CircleDollarSign className="size-4" /> Then show Revenue Recovery</a></section>
    </div>
  </div>;
}

function DemoStep({ active, index, label, copy }: { active: boolean; index: string; label: string; copy: string }) { return <div className={`flex items-center gap-3 rounded-lg p-3 transition-colors duration-200 ${active ? "bg-primary-soft" : "bg-surface-2"}`}><span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-primary text-primary-fg" : "bg-surface text-muted"}`}>{index}</span><span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted">{copy}</span></span></div>; }
function ChatBubble({ from, name, text }: { from: "customer" | "business"; name: string; text: string }) { return <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-border ${from === "business" ? "ml-auto bg-chat-out" : "bg-chat-in"}`}><p className="text-xs font-medium text-muted">{from === "business" ? "Owner" : name}</p><p className="mt-1 whitespace-pre-wrap">{text}</p></div>; }
function EventRow({ event, last }: { event: DemoEvent; last: boolean }) { const Icon = event.state === "review" ? ShieldCheck : event.state === "running" ? Sparkles : CheckCircle2; return <li className="relative flex gap-3 pb-4"><span className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ${event.state === "review" ? "bg-warn-soft text-warn" : event.state === "running" ? "bg-primary-soft text-primary" : "bg-primary text-primary-fg"}`}><Icon className={`size-4 ${event.state === "running" ? "animate-pulse" : ""}`} /></span>{!last ? <span className="absolute left-3.5 top-7 h-[calc(100%-1rem)] border-l border-border" /> : null}<span className="min-w-0 pt-0.5"><span className="block text-sm font-medium">{event.label}</span><span className="mt-0.5 block text-xs leading-5 text-muted">{event.detail}</span><span className="mt-1 block font-mono text-[10px] text-subtle">{event.tool} · {event.state === "review" ? "REVIEW REQUIRED" : event.state === "running" ? "RUNNING" : "SUCCESS"}</span></span></li>; }
function EmptyEvents() { return <div className="mt-6 flex min-h-96 flex-col items-center justify-center rounded-xl bg-surface-2 p-6 text-center"><Sparkles className="size-7 text-primary" /><p className="mt-3 font-medium">Ready for a real conversation</p><p className="mt-1 max-w-xs text-sm leading-6 text-muted">Choose a scenario, then watch VYRA reveal concise tools, decisions, and safe outcomes.</p></div>; }
function Metric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) { return <div className="rounded-lg bg-surface-2 p-3"><p className="text-xs text-muted">{label}</p><p className={`mt-1 font-display text-xl tabular-nums ${danger ? "text-danger" : "text-fg"}`}>{value}</p></div>; }
