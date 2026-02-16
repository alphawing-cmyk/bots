import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Home, Search, Bot, Activity, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/$404")({
  component: NotFoundPage,
});

function NotFoundPage() {
  const [q, setQ] = React.useState("");

  const quickLinks = [
    { to: "/dashboard", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
    { to: "/strategies", label: "Strategies", icon: <Bot className="h-4 w-4" /> },
    { to: "/runs", label: "Runs", icon: <Activity className="h-4 w-4" /> },
  ] as const;

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)]">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/60 via-background to-background" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />
        <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-12">
        <div className="mb-6 text-center">
          <div className="text-7xl font-bold tracking-tight">404</div>
          <div className="mt-2 text-xl font-semibold">Page not found</div>
          <p className="mt-2 text-sm text-muted-foreground">
            The page you’re trying to open doesn’t exist (or got moved).
          </p>
        </div>

        <Card className="w-full rounded-2xl shadow-sm">
          <CardHeader className="gap-2">
            <CardTitle className="text-base">Try one of these</CardTitle>

            {/* Optional search box (client-side only) */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Quick search (filters links below)…"
                className="h-10 rounded-xl pl-9"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {quickLinks
                .filter((l) =>
                  q.trim()
                    ? l.label.toLowerCase().includes(q.trim().toLowerCase())
                    : true,
                )
                .map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className={cn(
                      "group flex items-center gap-2 rounded-2xl border bg-background/60 px-4 py-3 text-sm shadow-sm transition",
                      "hover:bg-background hover:shadow-md hover:-translate-y-[1px]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl border bg-gradient-to-b from-background to-muted/30">
                      {l.icon}
                    </span>
                    <span className="font-medium">{l.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">
                      Open →
                    </span>
                  </Link>
                ))}
            </div>

            <Separator />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go back
              </Button>

              <Button asChild className="rounded-xl">
                <Link to="/dashboard">
                  <Home className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Tip: If you typed the URL manually, check for typos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default NotFoundPage;
