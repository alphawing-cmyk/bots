import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Cable,
  CheckCircle2,
  Clock,
  Lock,
  PlugZap,
  Shield,
  Wrench,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl border">
              <Bot className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Alpaca Bot Framework</div>
              <div className="text-xs text-muted-foreground">
                Strategy runner + jobs + API
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost" size="sm">
              <Link to="/strategies">Strategies</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/strategies">View strategies</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/strategies">
                Create strategy <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-[-120px] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-gradient-to-r from-muted to-transparent blur-3xl opacity-60" />
            <div className="absolute right-[-160px] top-[140px] h-[420px] w-[520px] rounded-full bg-gradient-to-l from-muted to-transparent blur-3xl opacity-50" />
          </div>

          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
            <div className="flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <PlugZap className="h-3.5 w-3.5" />
                  Alpaca-ready
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Cable className="h-3.5 w-3.5" />
                  Queue + workers
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  Config-driven
                </Badge>
              </div>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                Build, run, and manage algorithmic trading strategies—cleanly.
              </h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
                A pragmatic framework for creating strategies, scheduling runs, tracking jobs,
                and iterating fast—without turning your codebase into a tangle.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg">
                  <Link to="/strategies">
                    Get started <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <MiniStat icon={Clock} label="Fast iteration" value="Add strategies in minutes" />
                <MiniStat icon={Lock} label="Safer ops" value="DB flags + audit trails" />
                <MiniStat icon={BarChart3} label="Visibility" value="Runs, jobs, statuses" />
              </div>
            </div>

            {/* Right hero card */}
            <div className="flex items-center">
              <Card className="w-full overflow-hidden rounded-2xl">
                <CardHeader className="space-y-2">
                  <CardTitle className="flex items-center justify-between">
                    <span>How it works</span>
                    <Badge variant="outline">High-level</Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    A simple, scalable loop: configs → signals → orders → tracking.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Step
                    n="01"
                    icon={Wrench}
                    title="Define a strategy"
                    desc="Drop a new strategy file and expose params you want configurable."
                  />
                  <Step
                    n="02"
                    icon={Cable}
                    title="Enable + schedule"
                    desc="Store config in the DB, toggle enabled, set interval, symbols, and params."
                  />
                  <Step
                    n="03"
                    icon={CheckCircle2}
                    title="Run & observe"
                    desc="Workers execute jobs, update statuses, and emit events you can surface in the UI."
                  />

                  <Separator />

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                      Ready to add your first strategy?
                    </div>
                    <Button asChild>
                      <Link to="/strategies">Open strategies</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Everything you need to operate strategies responsibly
              </h2>
              <p className="text-muted-foreground">
                Opinionated defaults with room to customize as you grow.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <FeatureCard
                icon={Shield}
                title="DB-controlled execution"
                desc="Enable/disable strategies and adjust intervals without redeploying."
              />
              <FeatureCard
                icon={Cable}
                title="Queue-based runs"
                desc="Decouple scheduling from execution for reliability and scale."
              />
              <FeatureCard
                icon={BarChart3}
                title="Run visibility"
                desc="Track job states, retries, durations, and outcomes."
              />
              <FeatureCard
                icon={Wrench}
                title="Strategy plug-in pattern"
                desc="Add new strategies as files—keep the framework stable."
              />
              <FeatureCard
                icon={Lock}
                title="Safer ops by design"
                desc="Centralized configs, consistent logging, and predictable interfaces."
              />
              <FeatureCard
                icon={Clock}
                title="Built for iteration"
                desc="Tune params quickly and keep experiments organized."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <Card className="rounded-2xl">
              <CardContent className="flex flex-col items-start justify-between gap-6 p-6 md:flex-row md:items-center md:p-10">
                <div className="space-y-2">
                  <div className="text-2xl font-semibold tracking-tight">
                    Start with one strategy. Scale to many.
                  </div>
                  <div className="text-muted-foreground">
                    Create your first strategy config and run it through the pipeline.
                  </div>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <Button asChild size="lg">
                    <Link to="/strategies">
                      Create strategy <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/">View documentation</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Alpaca Bot Framework
              </div>
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/strategies">Strategies</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/">Tasks</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border p-3">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  desc,
}: {
  n: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {n}
          </Badge>
          <div className="font-medium">{title}</div>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="space-y-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-muted/40">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{desc}</CardContent>
    </Card>
  );
}