import * as React from "react";
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
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  StrategyFormDialog,
  type StrategyFormValues,
} from "./strategy-form-dialog";

export type StrategyRow = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  interval_seconds: number;
  symbols: string[];
  params: Record<string, any>;
  last_run_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type Props = {
  rows: StrategyRow[];
  onChanged: () => void;
};

function fmtLastRun(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function safeSymbolList(v: any): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  return [];
}

function summarizeParams(params: any) {
  if (!params || typeof params !== "object") return "—";
  const entries = Object.entries(params).slice(0, 3);
  if (!entries.length) return "—";
  return entries.map(([k, val]) => `${k}:${String(val)}`).join(" · ");
}

export function StrategiesTable({ rows, onChanged }: Props) {

  console.log(rows);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "name", desc: false },
  ]);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<StrategyRow | null>(null);

  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const openEdit = (r: StrategyRow) => {
    setEditRow(r);
    setEditOpen(true);
  };

  const columns = React.useMemo<ColumnDef<StrategyRow>[]>(
    () => [
      {
        accessorKey: "enabled",
        header: "Status",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex items-center gap-2">
              <Switch
                checked={!!r.enabled}
                disabled={busyId === r.id}
                onCheckedChange={async (checked) => {
                  setError(null);
                  setBusyId(r.id);
                  try {
                    const payload: StrategyFormValues = {
                      name: r.name,
                      type: r.type,
                      enabled: checked,
                      interval_seconds: r.interval_seconds,
                      symbols: safeSymbolList(r.symbols),
                      paramsJson: JSON.stringify(r.params ?? {}, null, 2),
                    };
                    await api.updateStrategy(r.id, {
                      name: payload.name,
                      type: payload.type,
                      enabled: payload.enabled,
                      interval_seconds: payload.interval_seconds,
                      symbols: payload.symbols,
                      params: JSON.parse(payload.paramsJson || "{}"),
                    });
                    onChanged();
                  } catch (e: any) {
                    setError(e?.message ?? String(e));
                  } finally {
                    setBusyId(null);
                  }
                }}
              />
              <Badge
                variant={r.enabled ? "default" : "secondary"}
                className={cn("rounded-full")}
              >
                {r.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.name}</div>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline" className="rounded-full">
            {row.original.type}
          </Badge>
        ),
      },
      {
        accessorKey: "interval_seconds",
        header: "Interval",
        cell: ({ row }) => (
          <div className="tabular-nums">{row.original.interval_seconds}s</div>
        ),
      },
      {
        accessorKey: "symbols",
        header: "Symbols",
        cell: ({ row }) => {
          const syms = safeSymbolList(row.original.symbols);
          if (!syms.length)
            return <span className="text-muted-foreground">—</span>;
          const shown = syms.slice(0, 3);
          const rest = syms.length - shown.length;
          return (
            <div className="flex flex-wrap gap-1">
              {shown.slice(0,3).map((s) => (
                <Badge key={s} variant="secondary" className="rounded-full">
                  {s}
                </Badge>
              ))}
              {rest > 0 ? (
                <span className="text-xs text-muted-foreground">+{rest}</span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "params",
        header: "Params",
        cell: ({ row }) => (
          <div className="max-w-[340px] truncate text-sm text-muted-foreground">
            {summarizeParams(row.original.params)}
          </div>
        ),
      },
      {
        accessorKey: "last_run_at",
        header: "Last run",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {fmtLastRun(row.original.last_run_at)}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={() => openEdit(r)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={async () => {
                      const ok = window.confirm(
                        `Delete strategy "${r.name}"? This cannot be undone.`,
                      );
                      if (!ok) return;

                      setError(null);
                      setBusyId(r.id);
                      try {
                        await api.deleteStrategy(r.id);
                        onChanged();
                      } catch (e: any) {
                        setError(e?.message ?? String(e));
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [busyId, onChanged],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter, sorting },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue ?? "")
        .toLowerCase()
        .trim();
      if (!q) return true;
      const r = row.original;
      return (
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        safeSymbolList(r.symbols).join(",").toLowerCase().includes(q)
      );
    },
  });

  return (
    <>
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">All strategies</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search name, type, symbol…"
              className="h-9 w-65 rounded-xl"
            />
            <Button
              variant="secondary"
              className="rounded-xl"
              onClick={onChanged}
            >
              Refresh
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
                      No strategies found.
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
                className="rounded-xl"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <StrategyFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit strategy"
        initialValues={
          editRow
            ? {
                name: editRow.name,
                type: editRow.type,
                enabled: !!editRow.enabled,
                interval_seconds: editRow.interval_seconds ?? 60,
                symbols: safeSymbolList(editRow.symbols),
                paramsJson: JSON.stringify(editRow.params ?? {}, null, 2),
              }
            : undefined
        }
        onSubmit={async (v) => {
          if (!editRow) return;
          setError(null);
          setBusyId(editRow.id);
          try {
            await api.updateStrategy(editRow.id, {
              name: v.name,
              type: v.type,
              enabled: v.enabled,
              interval_seconds: v.interval_seconds,
              symbols: v.symbols,
              params: JSON.parse(v.paramsJson || "{}"),
            });
            onChanged();
            setEditOpen(false);
            setEditRow(null);
          } catch (e: any) {
            setError(e?.message ?? String(e));
          } finally {
            setBusyId(null);
          }
        }}
      />
    </>
  );
}
