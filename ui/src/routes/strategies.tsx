import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { StrategiesTable } from "@/components/strategies/strategies-table";
import { StrategyFormDialog } from "@/components/strategies/strategy-form-dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/strategies")({
  component: StrategiesPage,
});

function StrategiesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = () => api.listStrategies().then(setRows);

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Strategies</h1>
          <p className="text-sm text-muted-foreground">
            Enable/disable, edit params, and control intervals.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>New Strategy</Button>
      </div>

      <StrategiesTable rows={rows} onChanged={refresh} />

      <StrategyFormDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={async (v) => {
          await api.createStrategy(v);
          await refresh();
          setOpen(false);
        }}
      />
    </div>
  );
}
