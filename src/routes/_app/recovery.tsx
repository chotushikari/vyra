import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AgentTrace } from "@/components/agent-trace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR, indianDate } from "@/lib/format";
import { prioritizeOutstanding } from "@/lib/revenue-agent";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_app/recovery")({ component: RecoveryPage });

function RecoveryPage() {
  const invoices = useStore((s) => s.invoices);
  const conversations = useStore((s) => s.conversations);
  const business = useStore((s) => s.business);
  const actions = useStore((s) => s.agentActions);
  const runRecovery = useStore((s) => s.runRevenueRecovery);
  const [ran, setRan] = useState(false);
  const candidates = prioritizeOutstanding(invoices, conversations, business);
  const priority = candidates[0];
  const outstanding = candidates.reduce((sum, item) => sum + item.invoice.total, 0);
  const overdue = candidates.filter((item) => item.daysOverdue > 0);

  function execute() {
    const result = runRecovery();
    if (!result) return;
    setRan(true);
    toast.success("Sandbox reminder sent and business state updated");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">VYRA agent · demo mode</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Revenue Recovery</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Ask the operational question that matters: where is money stuck, and what is the next safe step?</p>
        </div>
        <Button onClick={execute} disabled={!priority || ran}><Send className="size-4" /> {ran ? "Follow-up sent" : "Find stuck revenue"}</Button>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <Metric label="Outstanding revenue" value={formatINR(outstanding)} detail="Across unpaid invoices" />
        <Metric label="Overdue accounts" value={String(overdue.length)} detail="Prioritised by age and amount" urgent />
        <Metric label="Sensitive actions" value="0" detail="Real payments stay approval-only" />
      </div>

      {priority ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-5">
          <section className="rounded-xl border border-primary/20 bg-surface p-5 shadow-border lg:col-span-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-[0.14em] text-primary uppercase">Highest-priority account</p>
                <h2 className="mt-1 font-display text-2xl">{priority.invoice.customerName}</h2>
                <p className="mt-1 text-sm text-muted">{priority.invoice.number} · due {indianDate(priority.invoice.dueAt)}</p>
              </div>
              <Badge variant="danger">{priority.daysOverdue} days overdue</Badge>
            </div>
            <div className="mt-5 rounded-lg bg-surface-2 p-4">
              <p className="text-xs font-medium text-muted uppercase">Why this is first</p>
              <p className="mt-1 text-sm">{priority.reason}</p>
              <p className="mt-3 text-xs text-muted">Recent context: “{priority.context}”</p>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div><p className="text-xs text-muted">Next best action</p><p className="font-medium">Send contextual payment reminder</p></div>
              <Button onClick={execute} disabled={ran}><ArrowRight className="size-4" /> {ran ? "Completed in sandbox" : "Execute safely"}</Button>
            </div>
          </section>
          <section className="rounded-xl bg-surface p-5 shadow-border lg:col-span-2">
            <p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">Follow-up preview</p>
            <p className="mt-4 rounded-lg bg-surface-2 p-3 text-sm leading-6">{priority.followUp}</p>
            <p className="mt-4 flex gap-2 text-xs text-muted"><ShieldAlert className="size-4 shrink-0 text-warn" /> Sandbox adapter only. VYRA cannot initiate a real payment.</p>
          </section>
        </div>
      ) : (
        <section className="mt-6 rounded-xl bg-surface p-8 text-center shadow-border"><CheckCircle2 className="mx-auto size-6 text-primary" /><h2 className="mt-3 font-display text-xl">Nothing is waiting for recovery.</h2></section>
      )}

      {ran && actions.length > 0 ? <div className="mt-6"><AgentTrace actions={actions.slice(0, 5)} /></div> : null}
      <section className="mt-6 rounded-xl bg-surface p-5 shadow-border">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-xl">Recovery queue</h2><p className="mt-1 text-sm text-muted">Deterministic policy ranks overdue amount and age.</p></div><Link to="/inbox" className="text-sm text-primary hover:underline">Review conversations</Link></div>
        <ul className="mt-4 divide-y divide-border">{candidates.map((candidate) => <li key={candidate.invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium">{candidate.invoice.customerName}</p><p className="text-xs text-muted">{candidate.reason}</p></div><p className="font-display text-lg tabular-nums">{formatINR(candidate.invoice.total)}</p></li>)}</ul>
      </section>
    </div>
  );
}

function Metric({ label, value, detail, urgent = false }: { label: string; value: string; detail: string; urgent?: boolean }) {
  return <div className="rounded-xl bg-surface p-4 shadow-border"><p className="text-xs tracking-wide text-muted uppercase">{label}</p><p className={`mt-2 font-display text-3xl tabular-nums ${urgent ? "text-danger" : "text-fg"}`}>{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></div>;
}
