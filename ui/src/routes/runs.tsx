import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";

import { api } from "@/lib/api";
import { BotWsClient, makeWsUrl } from "@/lib/ws";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/runs")({
  component: RunsPage,
});

type RunRow = {
  id: string;
  strategy_id: string;
  started_at: string;
  finished_at?: string | null;
  status: "running" | "ok" | "error" | string;
  message?: string | null;
  signals?: any;
  orders?: any;
  metrics?: any;
};

type StrategyRow = {
  id: string;
  name: string;
  type: string;
};

function statusBadgeVariant(status: string) {
  if (status === "ok") return "default";
  if (status === "error") return "destructive";
  if (status === "running") return "secondary";
  return "outline";
}

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function durationMs(r: RunRow) {
  if (!r.started_at || !r.finished_at) return null;
  const a = new Date(r.started_at).getTime();
  const b = new Date(r.finished_at).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, b - a);
}

function fmtDuration(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  return `${s}s`;
}

function safeCount(obj: any, path: string) {
  // expected: signals = { count, items }, orders = []
  if (path === "signals") return Number(obj?.signals?.count ?? 0) || 0;
  if (path === "orders")
    return Array.isArray(obj?.orders) ? obj.orders.length : 0;
  return 0;
}

function toDateTimeLocalValue(d: Date) {
  // yyyy-MM-ddTHH:mm for <input type="datetime-local" />
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function RunsPage() {
  const [strategies, setStrategies] = React.useState<StrategyRow[]>([]);
  const [rows, setRows] = React.useState<RunRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [status, setStatus] = React.useState<string>("all");
  const [strategyId, setStrategyId] = React.useState<string>("all");

  // Default since: last 24 hours
  const [since, setSince] = React.useState<string>(() => {
    const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return toDateTimeLocalValue(d);
  });
  const [until, setUntil] = React.useState<string>("");

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "started_at", desc: true },
  ]);

  const strategyMap = React.useMemo(() => {
    const m = new Map<string, StrategyRow>();
    for (const s of strategies) m.set(s.id, s);
    return m;
  }, [strategies]);

  const load = React.useCallback(async () => {
    setError(null);

    const params = new URLSearchParams();
    params.set("limit", "200");

    if (status !== "all") params.set("status", status);
    if (strategyId !== "all") params.set("strategy_id", strategyId);

    // Convert datetime-local string to ISO if present
    if (since) params.set("since", new Date(since).toISOString());
    if (until) params.set("until", new Date(until).toISOString());

    try {
      const [s, r] = await Promise.all([
        api.listStrategies(),
        (async () => {
          const API_BASE =
            import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api";
          const res = await fetch(`${API_BASE}/runs?${params.toString()}`);
          if (!res.ok) throw new Error(await res.text());
          return (await res.json()) as RunRow[];
        })(),
      ]);

      setStrategies(s);
      setRows(r);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }, [since, status, strategyId, until]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Live updates: merge run events into table without polling
  React.useEffect(() => {
    const ws = new BotWsClient(makeWsUrl("/api/ws"));
    const unsub = ws.subscribe((msg) => {
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "run_completed" || msg.type === "run_error") {
        const run = msg.run as RunRow | undefined;
        if (!run?.id) return;

        // Apply current filters — if it doesn't match, ignore
        if (status !== "all" && run.status !== status) return;
        if (strategyId !== "all" && run.strategy_id !== strategyId) return;

        if (since) {
          const sinceIso = new Date(since).toISOString();
          if (run.started_at < sinceIso) return;
        }
        if (until) {
          const untilIso = new Date(until).toISOString();
          if (run.started_at > untilIso) return;
        }

        setRows((prev) => {
          const idx = prev.findIndex((x) => x.id === run.id);
          if (idx >= 0) {
            const next = prev.slice();
            next[idx] = run;
            return next;
          }
          // prepend newest
          return [run, ...prev].slice(0, 200);
        });
      }
    });

    ws.start();
    return () => {
      unsub();
      ws.stop();
    };
  }, [since, status, strategyId, until]);

  const columns = React.useMemo<ColumnDef<RunRow>[]>(
    () => [
      {
        accessorKey: "started_at",
        header: "Started",
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-sm">
            {fmtDateTime(row.original.started_at)}
          </div>
        ),
      },
      {
        id: "strategy",
        header: "Strategy",
        cell: ({ row }) => {
          const s = strategyMap.get(row.original.strategy_id);
          return (
            <div className="min-w-[180px]">
              <div className="font-medium">{s?.name ?? "Unknown"}</div>
              <div className="text-xs text-muted-foreground">
                {s?.type ?? row.original.strategy_id}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            className="rounded-full"
            variant={statusBadgeVariant(row.original.status)}
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "signals",
        header: "Signals",
        cell: ({ row }) => (
          <div className="tabular-nums">
            {safeCount(row.original, "signals")}
          </div>
        ),
      },
      {
        id: "orders",
        header: "Orders",
        cell: ({ row }) => (
          <div className="tabular-nums">
            {safeCount(row.original, "orders")}
          </div>
        ),
      },
      {
        id: "duration",
        header: "Duration",
        cell: ({ row }) => (
          <div className="tabular-nums text-sm text-muted-foreground">
            {fmtDuration(durationMs(row.original))}
          </div>
        ),
      },
      {
        accessorKey: "message",
        header: "Message",
        cell: ({ row }) => (
          <div className="max-w-[420px] truncate text-sm text-muted-foreground">
            {row.original.message || "—"}
          </div>
        ),
      },
    ],
    [strategyMap],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Runs</h1>
        <p className="text-sm text-muted-foreground">
          Inspect recent strategy executions, filter by status/strategy/time,
          and see errors quickly.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="gap-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Status</div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="running">running</SelectItem>
                  <SelectItem value="ok">ok</SelectItem>
                  <SelectItem value="error">error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Strategy</div>
              <Select value={strategyId} onValueChange={setStrategyId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="All strategies" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All strategies</SelectItem>
                  {strategies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Since</div>
              <Input
                type="datetime-local"
                className="rounded-xl"
                value={since}
                onChange={(e) => setSince(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Until</div>
              <Input
                type="datetime-local"
                className="rounded-xl"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" className="rounded-xl" onClick={load}>
              Apply
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setStatus("all");
                setStrategyId("all");
                const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
                setSince(toDateTimeLocalValue(d));
                setUntil("");
              }}
            >
              Reset
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead key={h.id} className="whitespace-nowrap">
                        {h.isPlaceholder
                          ? null
                          : flexRender(
                              h.column.columnDef.header,
                              h.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((r) => (
                    <TableRow key={r.id}>
                      {r.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      No runs found for your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Live updates are enabled (WebSocket). New runs will appear
            automatically.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
