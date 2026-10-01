import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleAlert, CircleDollarSign, FileText, MessageSquare, TrendingUp } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { formatCompactINR, formatINR } from "@/lib/format";
import { isOverdue } from "@/lib/gst";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_app/desk")({ component: Desk });

function Desk() {
  const invoices = useStore((s) => s.invoices);
  const orders = useStore((s) => s.orders);
  const conversations = useStore((s) => s.conversations);
  const paid = invoices.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.total, 0);
  const open = invoices.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.total, 0);
  const overdue = invoices.filter((item) => isOverdue(item)).reduce((sum, item) => sum + item.total, 0);
  const productMap = new Map<string, number>();
  orders.forEach((order) => order.items.forEach((item) => productMap.set(item.name, (productMap.get(item.name) ?? 0) + item.qty)));
  const chart = [...productMap.entries()].slice(0, 6).map(([name, qty]) => ({ name: name.replace(/ \(.+\)/, ""), qty }));
  return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs tracking-[0.18em] text-muted uppercase">Revenue workspace</p><h1 className="mt-1 font-display text-3xl sm:text-4xl">Revenue operations, from the chat.</h1><p className="mt-2 max-w-xl text-sm text-muted">Live business state from the VYRA deterministic demo.</p></div><Button asChild><Link to="/recovery">Find stuck revenue <CircleDollarSign className="size-4" /></Link></Button></div><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Collected" value={formatCompactINR(paid)} hint="Marked paid" /><Metric label="To collect" value={formatCompactINR(open)} hint={`${formatINR(overdue)} overdue`} urgent /><Metric label="Orders" value={String(orders.length)} hint="Structured orders" /><Metric label="Unread chats" value={String(conversations.reduce((sum, item) => sum + item.unread, 0))} hint="Waiting in inbox" /></div><div className="mt-6 grid gap-4 lg:grid-cols-5"><section className="rounded-xl bg-surface p-5 shadow-border lg:col-span-3"><div className="flex items-center justify-between"><div><h2 className="font-display text-xl">What is moving</h2><p className="mt-1 text-sm text-muted">Pieces billed from structured orders.</p></div><TrendingUp className="size-4 text-muted" /></div><div className="mt-4 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip cursor={{ fill: "var(--color-surface-2)" }} /><Bar dataKey="qty" fill="var(--color-primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section><section className="rounded-xl bg-surface p-5 shadow-border lg:col-span-2"><h2 className="font-display text-xl">Do this next</h2><div className="mt-4 space-y-4"><Next to="/inbox" icon={MessageSquare} title="Review new customer chats" copy="Extract a structured order." /><Next to="/recovery" icon={CircleAlert} title="Recover overdue payments" copy="Prioritize safe follow-ups." /><Next to="/invoices" icon={FileText} title="Review invoice drafts" copy="Keep billing on track." /></div></section></div></div>;
}
function Metric({ label, value, hint, urgent = false }: { label: string; value: string; hint: string; urgent?: boolean }) { return <div className="rounded-xl bg-surface p-4 shadow-border"><p className="text-xs tracking-wide text-muted uppercase">{label}</p><p className={`mt-2 font-display text-3xl tabular-nums ${urgent ? "text-warn" : "text-fg"}`}>{value}</p><p className="mt-1 text-xs text-muted">{hint}</p></div>; }
function Next({ to, icon: Icon, title, copy }: { to: "/inbox" | "/recovery" | "/invoices"; icon: typeof MessageSquare; title: string; copy: string }) { return <Link to={to} className="flex gap-3 rounded-lg p-2 transition-colors hover:bg-surface-2"><span className="flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary"><Icon className="size-4" /></span><span><span className="block text-sm font-medium">{title}</span><span className="text-xs text-muted">{copy}</span></span></Link>; }
