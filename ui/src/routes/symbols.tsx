import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { SymbolsTable } from "@/components/symbols/symbols-table";
import { SymbolFormDialog } from "@/components/symbols/symbol-form-dialog";

export const Route = createFileRoute("/symbols")({
  component: SymbolsPage,
});

function SymbolsPage() {
  const [rows, setRows] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);

  const refresh = React.useCallback(() => api.listSymbols().then(setRows), []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Symbols</h1>
          <p className="text-sm text-muted-foreground">
            Manage your tradable universe (enable/disable, metadata, tags).
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>New Symbol</Button>
      </div>

      <SymbolsTable rows={rows} onChanged={refresh} />

      <SymbolFormDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={async (v) => {
          await api.createSymbol(v);
          await refresh();
          setOpen(false);
        }}
      />
    </div>
  );
}

export default SymbolsPage;
