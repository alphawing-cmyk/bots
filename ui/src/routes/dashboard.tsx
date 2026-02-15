import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../lib/api";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { useWs } from "@/providers/ws-provider";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { lastMessage } = useWs();

  const [data, setData] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const loadMetrics = React.useCallback(() => {
    setErr(null);
    api
      .metrics()
      .then(setData)
      .catch((e) => setErr(String(e)));
  }, []);

  // initial load
  React.useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // live updates (react-use-websocket): refresh metrics when a run finishes/errors
  React.useEffect(() => {
    const msg = lastMessage;
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "run_completed" || msg.type === "run_error") {
      loadMetrics();
    }
  }, [lastMessage, loadMetrics]);

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

export default DashboardPage;
