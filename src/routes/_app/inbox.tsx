import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Bot, MessageSquare, Send, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { extractOrder } from "@/lib/extract-order";
import { indianDateTime } from "@/lib/format";
import { parseOrderLocal } from "@/lib/parse-order";
import { replyAsOwner } from "@/lib/reply-as-owner";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/inbox")({
  component: InboxPage,
});

function InboxPage() {
  const conversations = useStore((s) => s.conversations);
  const markRead = useStore((s) => s.markRead);
  const openDraft = useStore((s) => s.openDraft);
  const addPastedChat = useStore((s) => s.addPastedChat);
  const appendMessage = useStore((s) => s.appendMessage);
  const [activeId, setActiveId] = useState<string | null>(
    conversations[0]?.id ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [ownerTyping, setOwnerTyping] = useState(false);
  const [agentStage, setAgentStage] = useState<"idle" | "replying" | "reading">("idle");
  const [message, setMessage] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState({
    name: "",
    city: "",
    phone: "",
    text: "",
  });

  const sorted = useMemo(
    () =>
      [...conversations].sort(
        (a, b) => +new Date(b.lastAt) - +new Date(a.lastAt),
      ),
    [conversations],
  );
  const active = sorted.find((c) => c.id === activeId) ?? null;

  async function extract(
    conversationId: string,
    incomingText?: string,
    messageSnapshot?: string,
  ) {
    const convo = conversations.find((c) => c.id === conversationId);
    if (!convo) return;
    setBusy(true);
    const messages = messageSnapshot ?? [
      ...convo.messages.map((m) => `${m.from}: ${m.text}`),
      ...(incomingText ? [`customer: ${incomingText}`] : []),
    ].join("\n");
    try {
      const result = await extractOrder({
        data: { messages, contactName: convo.name },
      });
      openDraft(conversationId, result.extracted, result.source);
      if (!result.ok) toast.message(result.error);
      else if (result.source === "local") {
        toast.message("Structured with the on-device parser.");
      } else {
        toast.success("Order pulled from the chat.");
      }
    } catch {
      const extracted = parseOrderLocal({
        messages: convo.messages.map((m) => m.text).join("\n"),
        contactName: convo.name,
      });
      openDraft(conversationId, extracted, "local");
      toast.message("Used the on-device parser.");
    } finally {
      setBusy(false);
    }
  }

  function openChat(id: string) {
    setActiveId(id);
    markRead(id);
  }

  async function simulateIncomingMessage() {
    if (!active || !message.trim()) {
      toast.error("Type a customer message to simulate it.");
      return;
    }
    const text = message.trim();
    appendMessage(active.id, text, "customer");
    setMessage("");
    setBusy(true);
    setAgentStage("replying");
    setOwnerTyping(true);
    try {
      const owner = await replyAsOwner({
        data: {
          customerMessage: text,
          contactName: active.name,
          recentMessages: active.messages.map((entry) => ({
            from: entry.from,
            text: entry.text,
          })),
        },
      });
      // A short delay makes the simulator read like a real WhatsApp exchange.
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      appendMessage(active.id, owner.reply, "business");
      setOwnerTyping(false);
      setAgentStage("reading");
      const snapshot = [
        ...active.messages.map((entry) => `${entry.from}: ${entry.text}`),
        `customer: ${text}`,
        `business: ${owner.reply}`,
      ].join("\n");
      await extract(active.id, undefined, snapshot);
      if (owner.source === "ai") {
        toast.success("Owner reply generated with live AI.");
      }
    } catch {
      setOwnerTyping(false);
      await extract(active.id, text);
      toast.message("VYRA continued with the demo reply and local extraction.");
    } finally {
      setOwnerTyping(false);
      setAgentStage("idle");
      setBusy(false);
    }
  }

  function submitPaste() {
    if (!paste.name.trim() || !paste.text.trim()) {
      toast.error("Name and chat text are required.");
      return;
    }
    const id = addPastedChat({
      name: paste.name.trim(),
      city: paste.city.trim() || "—",
      phone: paste.phone.trim() || "—",
      text: paste.text.trim(),
    });
    setPasteOpen(false);
    setPaste({ name: "", city: "", phone: "", text: "" });
    openChat(id);
    toast.success("Chat added to inbox.");
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] md:h-dvh">
      <aside
        className={cn(
          "w-full shrink-0 border-r border-border bg-surface md:w-80",
          active ? "hidden md:flex md:flex-col" : "flex flex-col",
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="font-display text-2xl">Inbox</h1>
            <p className="text-xs text-muted">WhatsApp stays here. We listen.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setPasteOpen(true)}>
            Paste chat
          </Button>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {sorted.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => openChat(c.id)}
                className={cn(
                  "flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors duration-150",
                  c.id === activeId ? "bg-primary-soft" : "hover:bg-bg",
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sidebar text-sm text-sidebar-fg">
                  {initials(c.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    <span className="text-[11px] text-subtle">
                      {indianDateTime(c.lastAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {c.city} · {c.lastMessage}
                  </span>
                </span>
                {c.unread > 0 ? (
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section
        className={cn(
          "min-w-0 flex-1 flex-col",
          active ? "flex" : "hidden md:flex",
        )}
      >
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b border-border bg-surface px-3 py-3">
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                onClick={() => setActiveId(null)}
                aria-label="Back to chats"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <span className="flex size-9 items-center justify-center rounded-full bg-sidebar text-xs text-sidebar-fg">
                {initials(active.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{active.name}</p>
                <p className="truncate text-xs text-muted">
                  {active.city} · {active.phone}
                </p>
              </div>
              <span className="hidden items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-[11px] font-medium text-primary sm:flex">
                <Bot className="size-3" /> Owner AI on
              </span>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => void extract(active.id)}
              >
                {busy ? (
                  "Reading chat…"
                ) : (
                  <>
                    <Wand2 className="size-4" />
                    Extract order
                  </>
                )}
              </Button>
            </header>
            <div className="chat-paper flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-8">
              {active.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-border",
                    m.from === "business"
                      ? "ml-auto rounded-br-xs bg-chat-out"
                      : "rounded-bl-xs bg-chat-in",
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <p className="mt-1 text-right text-[10px] text-subtle">
                    {indianDateTime(m.at)}
                  </p>
                </div>
              ))}
              {ownerTyping ? (
                <div className="max-w-[85%] rounded-lg rounded-bl-xs bg-chat-in px-3 py-2 text-sm shadow-border">
                  <span className="inline-flex items-center gap-2 text-muted">
                    <span className="flex gap-1" aria-label="Owner is typing">
                      <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-primary" />
                    </span>
                    Owner is typing…
                  </span>
                </div>
              ) : null}
            </div>
            <div className="border-t border-border bg-surface p-3 sm:px-5">
              <div className="mx-auto max-w-3xl rounded-lg bg-surface-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Sparkles className="size-3" />
                    {agentStage === "replying" ? "Owner is replying…" : agentStage === "reading" ? "VYRA is updating business state…" : "Live customer simulator · owner replies, then VYRA extracts"}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setMessage("Bhaiya 5 red scarf aur 2 blue dupatta bhej dena kal tak. Same rate pe kar dena.")}>Confirmed order</Button>
                    <Button size="sm" variant="ghost" onClick={() => setMessage("5 red scarves chahiye. Price kya hai? Kal tak mil sakta hai?")}>Safe inquiry</Button>
                  </div>
                </div>
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void simulateIncomingMessage();
                  }}
                >
                  <Input
                    aria-label="Simulated customer message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Type the customer’s WhatsApp message…"
                  />
                  <Button type="submit" disabled={busy}>
                    <Send className="size-4" />
                    {busy ? "Processing…" : "Send & analyze"}
                  </Button>
                </form>
                <p className="mt-2 text-xs text-muted">The customer message appears in WhatsApp, the owner replies naturally, then VYRA classifies intent, retrieves catalog context, and prepares the next safe action.</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted">
            <MessageSquare className="size-6" />
            <p className="text-sm">Pick a chat to extract an order.</p>
          </div>
        )}
      </section>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste a WhatsApp chat</DialogTitle>
            <DialogDescription>
              No WhatsApp API needed. Drop the messy Hinglish here and extract.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field
              label="Customer name"
              value={paste.name}
              onChange={(v) => setPaste({ ...paste, name: v })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="City"
                value={paste.city}
                onChange={(v) => setPaste({ ...paste, city: v })}
              />
              <Field
                label="Phone"
                value={paste.phone}
                onChange={(v) => setPaste({ ...paste, phone: v })}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted">Chat text</label>
              <Textarea
                rows={6}
                placeholder="Bhaiya 5 red scarf aur 2 blue dupatta bhej dena kal tak"
                value={paste.text}
                onChange={(e) => setPaste({ ...paste, text: e.target.value })}
              />
            </div>
            <Button onClick={submitPaste}>Add to inbox</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-medium text-muted">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}
