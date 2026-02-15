import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { BotWsClient, makeWsUrl } from "../lib/ws";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .metrics()
      .then(setData)
      .catch((e) => setErr(String(e)));
  }, []);

  useEffect(() => {
    const ws = new BotWsClient(makeWsUrl("/api/ws"));
    const unsub = ws.subscribe((msg) => {
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "run_completed" || msg.type === "run_error") {
        api
          .metrics()
          .then(setData)
          .catch((e) => setErr(String(e)));
      }
    });
    ws.start();
    return () => {
      unsub();
      ws.stop();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Bot health, runs, and quick stats.
        </p>
      </div>
      {err ? <div className="text-sm text-destructive">{err}</div> : null}
      {data ? (
        <StatsCards data={data} />
      ) : (
        <div className="text-sm text-muted-foreground">Loading…</div>
      )}
    </div>
  );
}
