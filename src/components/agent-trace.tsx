import { CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import type { AgentAction } from "@/lib/types";

export function AgentTrace({ actions, compact = false }: { actions: AgentAction[]; compact?: boolean }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-border" aria-label="Agent trace">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">Agent trace</p>
          <h2 className="mt-1 font-display text-lg">Auditable operational events</h2>
        </div>
        <ShieldCheck className="size-5 text-primary" />
      </div>
      <ul className="mt-4 space-y-3">
        {actions.map((action) => (
          <li key={action.id} className="flex gap-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="font-medium">{action.type.replaceAll("_", " ")}</p>
              {!compact ? <p className="mt-0.5 text-xs text-muted">{action.reason}</p> : null}
              <p className="mt-1 font-mono text-[11px] text-subtle">{action.tool} · {action.status}</p>
            </div>
          </li>
        ))}
      </ul>
      {!compact ? (
        <p className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted">
          <Clock3 className="size-3.5" /> Demo mode records sandbox outcomes only. No real payments are initiated.
        </p>
      ) : null}
    </section>
  );
}
