import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CircleDollarSign,
  FileText,
  Home,
  IndianRupee,
  MessageSquare,
  MonitorPlay,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { formatCompactINR } from "@/lib/format";
import { isOverdue } from "@/lib/gst";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/desk", label: "Desk", icon: Home },
  { to: "/inbox", label: "Inbox", icon: MessageSquare },
  { to: "/demo", label: "Demo studio", icon: MonitorPlay },
  { to: "/recovery", label: "Recovery", icon: CircleDollarSign },
  { to: "/orders", label: "Orders", icon: ShoppingBag },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/payments", label: "Payments", icon: IndianRupee },
  { to: "/follow-ups", label: "Follow-ups", icon: Bell },
  { to: "/customers", label: "Customers", icon: Users },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const business = useStore((s) => s.business);
  const invoices = useStore((s) => s.invoices);
  const conversations = useStore((s) => s.conversations);
  const [more, setMore] = useState(false);

  const unread = conversations.reduce((n, c) => n + c.unread, 0);
  const toCollect = invoices
    .filter((i) => i.status !== "paid")
    .reduce((n, i) => n + i.total, 0);
  const followCount = invoices.filter((i) => isOverdue(i)).length;

  const badgeFor = (to: string) => {
    if (to === "/inbox") return unread;
    if (to === "/follow-ups") return followCount;
    return 0;
  };

  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-fg md:flex">
        <div className="flex items-center gap-2.5 px-4 pt-5 pb-6">
          <Mark className="size-8 text-sidebar-fg" />
          <div className="min-w-0">
            <p className="font-display text-lg leading-none tracking-tight">
              VYRA
            </p>
            <p className="mt-1 truncate text-xs text-sidebar-muted">
              {business.name}
            </p>
          </div>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2">
          {NAV.map((item) => {
            const active =
              item.to === "/desk"
                ? pathname === "/desk"
                : pathname.startsWith(item.to);
            const count = badgeFor(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-11 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-white/10 text-sidebar-fg"
                    : "text-sidebar-muted hover:bg-white/10 hover:text-sidebar-fg",
                )}
              >
                <item.icon className="size-4" />
                <span className="flex-1">{item.label}</span>
                {count > 0 ? (
                  <span className="min-w-5 rounded-full bg-primary-fg/15 px-1.5 text-center text-[11px] tabular-nums">
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <Link
          to="/settings"
          className={cn(
            "mx-2 flex h-11 shrink-0 items-center gap-2.5 rounded-md px-3 text-sm",
            pathname === "/settings"
              ? "bg-white/10 text-sidebar-fg"
              : "text-sidebar-muted hover:text-sidebar-fg",
          )}
        >
          <Settings className="size-4" />
          Settings
        </Link>
        <div className="mx-3 mb-3 mt-1 shrink-0 rounded-lg bg-white/10 p-3">
          <p className="text-[11px] tracking-wide text-sidebar-muted uppercase">
            To collect
          </p>
          <p className="mt-1 font-display text-xl tabular-nums">
            {formatCompactINR(toCollect)}
          </p>
          <p className="mt-2 text-[10px] tracking-wide text-sidebar-muted uppercase">Demo mode · simulated</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4 md:hidden">
          <Mark className="size-7 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-base leading-none">VYRA</p>
            <p className="truncate text-[11px] text-muted">{business.name}</p>
          </div>
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to="/settings" aria-label="Settings">
              <Settings className="size-4" />
            </Link>
          </Button>
        </header>
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-border bg-surface md:hidden">
        {NAV.slice(0, 4).map((item) => {
          const active =
            item.to === "/desk" ? pathname === "/desk" : pathname.startsWith(item.to);
          const count = badgeFor(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]",
                active ? "text-primary" : "text-muted",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
              {count > 0 ? (
                <span className="absolute top-1.5 right-1/2 size-1.5 translate-x-3 rounded-full bg-danger" />
              ) : null}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMore(true)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]",
            more ||
              ["/demo", "/recovery", "/payments", "/follow-ups", "/customers", "/settings"].some((p) =>
                pathname.startsWith(p),
              )
              ? "text-primary"
              : "text-muted",
          )}
        >
          <Bell className="size-5" />
          More
        </button>
      </nav>

      {more ? (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-fg/40 md:hidden"
          aria-label="Close menu"
          onClick={() => setMore(false)}
        />
      ) : null}
      <div
        className={cn(
          "fixed inset-x-0 bottom-16 z-50 rounded-t-xl bg-surface p-4 shadow-border transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden",
          more ? "translate-y-0" : "pointer-events-none translate-y-full",
        )}
      >
        <p className="mb-2 text-xs font-medium text-muted">More</p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { to: "/payments", label: "Payments", icon: IndianRupee },
              { to: "/demo", label: "Demo studio", icon: MonitorPlay },
              { to: "/recovery", label: "Recovery", icon: CircleDollarSign },
              { to: "/follow-ups", label: "Follow-ups", icon: Bell },
              { to: "/customers", label: "Customers", icon: Users },
              { to: "/settings", label: "Settings", icon: Settings },
            ] as const
          ).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMore(false)}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg bg-surface-2 text-xs text-fg"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
