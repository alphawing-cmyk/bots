import * as React from "react";
import {
  Outlet,
  Link,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Menu, LayoutDashboard, Activity, Settings, Bot } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Route = createRootRoute({
  component: RootComponent,
});

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
};

const NAV: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    exact: true,
  },
  { to: "/strategies", label: "Strategies", icon: <Bot className="h-4 w-4" /> },
  { to: "/runs", label: "Runs", icon: <Activity className="h-4 w-4" /> },
  { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

function RootComponent() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-64 md:flex-col">
        <Sidebar />
      </aside>

      {/* Content area */}
      <div className="md:pl-64">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-6">
          <Outlet />
        </main>
      </div>

      <TanStackRouterDevtools position="bottom-right" />
    </div>
  );
}

/* ---------------- Sidebar ---------------- */

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="relative flex h-full flex-col border-r bg-background">
      {/* Subtle sidebar sheen */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-muted/50 via-background to-background" />
      {/* Soft pattern */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="flex h-14 items-center gap-3 px-4">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl border bg-gradient-to-br from-background to-muted shadow-sm">
          <div className="absolute -inset-1 rounded-[18px] bg-gradient-to-br from-primary/15 to-transparent blur-md" />
          <Bot className="relative h-5 w-5" />
        </div>

        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">
            alpaca-bot
          </div>
          <div className="text-xs text-muted-foreground">
            Control center
          </div>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1.5 p-2">
        {NAV.map((item) => (
          <SideNavLink key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      <Separator />

      <div className="p-3">
        <div className="group rounded-2xl border bg-gradient-to-b from-background to-muted/30 p-3 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <div className="text-xs font-medium">Status</div>
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            Live updates enabled via WebSocket.
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Connection
            </span>
            <span className="rounded-full border bg-background px-2 py-0.5 text-[11px]">
              Connected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SideNavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = item.exact
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(item.to + "/");

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "bg-gradient-to-r from-primary/10 via-muted to-muted text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:shadow-sm hover:-translate-y-[1px]"
      )}
    >
      {/* Active accent bar */}
      <span
        className={cn(
          "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition-opacity",
          active ? "bg-primary opacity-100" : "opacity-0 group-hover:opacity-40"
        )}
      />
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg border transition",
          active
            ? "bg-background shadow-sm"
            : "bg-background/40 group-hover:bg-background"
        )}
      >
        {item.icon}
      </span>
      <span className="font-medium">{item.label}</span>

      {/* tiny active indicator glow */}
      {active ? (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_6px_rgba(0,0,0,0.02)]" />
      ) : null}
    </Link>
  );
}

/* ---------------- Header ---------------- */

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        {/* Mobile nav trigger */}
        <div className="md:hidden">
          <MobileNav />
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold tracking-tight">
            Trading Bot
          </div>
          <span className="rounded-full border bg-gradient-to-b from-background to-muted/40 px-2 py-0.5 text-xs text-muted-foreground shadow-sm">
            Paper
          </span>
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="hidden w-[320px] lg:block">
          <div className="relative">
            <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 via-transparent to-primary/10 blur-md opacity-0 transition-opacity focus-within:opacity-100" />
            <Input
              className="relative h-9 rounded-xl bg-background/60 shadow-sm transition focus-visible:bg-background"
              placeholder="Search runs, strategies, symbols…"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle placeholder */}
          <Button
            variant="outline"
            className="h-9 rounded-xl bg-background/60 shadow-sm hover:bg-background"
          >
            Theme
          </Button>

          <span className="hidden sm:inline-flex items-center gap-2 rounded-full border bg-background/60 px-2 py-1 text-xs text-muted-foreground shadow-sm">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            WS: connected
          </span>
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-xl bg-background/60 shadow-sm hover:bg-background"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 p-0 border-r bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
