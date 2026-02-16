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
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SymbolFormDialog } from "./symbol-form-dialog";

export type SymbolRow = {
  id: string;
  symbol: string;
  name?: string | null;
  exchange?: string | null;
  asset_class?: string | null;
  enabled: boolean;
  meta?: any;
  created_at?: string;
  updated_at?: string;
};

export function SymbolsTable({
  rows,
  onChanged,
}: {
  rows: SymbolRow[];
  onChanged: () => void;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "symbol", desc: false },
  ]);

  const [q, setQ] = React.useState("");
  const [enabledFilter, setEnabledFilter] = React.useState<
    "all" | "enabled" | "disabled"
  >("all");

  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SymbolRow | null>(null);

  const [confirmDelete, setConfirmDelete] = React.useState<SymbolRow | null>(
    null,
  );

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (enabledFilter === "enabled" && !r.enabled) return false;
      if (enabledFilter === "disabled" && r.enabled) return false;

      if (!needle) return true;
      const hay = [
        r.symbol,
        r.name ?? "",
        r.exchange ?? "",
        r.asset_class ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [rows, q, enabledFilter]);

const columns = React.useMemo<ColumnDef<SymbolRow>[]>(
    () => [
      {
        accessorKey: "symbol",
        header: "Symbol",
        cell: ({ row }) => (
          <div className="min-w-[120px]">
            <div className="font-medium">{row.original.symbol}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[240px]">
              {row.original.name ?? "—"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "exchange",
        header: "Exchange",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.exchange ?? "—"}
          </div>
        ),
      },
      {
        accessorKey: "asset_class",
        header: "Asset Class",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.asset_class ?? "—"}
          </div>
        ),
      },
      {
        accessorKey: "enabled",
        header: "Enabled",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={!!row.original.enabled}
              onCheckedChange={async (checked) => {
                await api.updateSymbol(row.original.id, { enabled: checked });
                onChanged();
              }}
            />
            <Badge
              variant={row.original.enabled ? "default" : "secondary"}
              className="rounded-full"
            >
              {row.original.enabled ? "enabled" : "disabled"}
            </Badge>
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                setEditing(row.original);
                setEditOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-xl"
              onClick={() => setConfirmDelete(row.original)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [onChanged],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-3">
          <Input
            className="rounded-xl"
            placeholder="Search symbol, name, exchange…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="w-[170px]">
            <Select
              value={enabledFilter}
              onValueChange={(v) => setEnabledFilter(v as any)}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Enabled" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {filtered.length} symbol{filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="whitespace-nowrap">
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
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
                  No symbols found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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

      {/* Edit dialog */}
      <SymbolFormDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditing(null);
        }}
        initial={editing ?? undefined}
        onSubmit={async (v) => {
          if (!editing) return;
          await api.updateSymbol(editing.id, v);
          await onChanged();
          setEditOpen(false);
          setEditing(null);
        }}
      />

      {/* Delete confirm */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete symbol?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {confirmDelete?.symbol}
              </span>
              .
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="rounded-xl"
                onClick={async () => {
                  if (!confirmDelete) return;
                  await api.deleteSymbol(confirmDelete.id);
                  setConfirmDelete(null);
                  onChanged();
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
