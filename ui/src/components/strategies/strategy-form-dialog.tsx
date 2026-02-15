import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type StrategyFormValues = {
  name: string;
  type: string;
  enabled: boolean;
  interval_seconds: number;
  symbols: string[];
  paramsJson: string; // JSON string in the form
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  initialValues?: StrategyFormValues;
  onSubmit: (values: StrategyFormValues) => Promise<void> | void;
};

const DEFAULTS: StrategyFormValues = {
  name: "",
  type: "sma_cross",
  enabled: false,
  interval_seconds: 60,
  symbols: ["AAPL"],
  paramsJson: JSON.stringify(
    { fast: 10, slow: 30, qty: 1, stop_loss_pct: 0.01, take_profit_pct: 0.02 },
    null,
    2
  ),
};

function parseSymbols(raw: string): string[] {
  // Allow "AAPL, MSFT" or "AAPL MSFT"
  const cleaned = raw
    .split(/[,\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toUpperCase());

  // uniq
  return Array.from(new Set(cleaned));
}

function stringifySymbols(symbols: string[]): string {
  return (symbols ?? []).join(", ");
}

function safeJsonParse(s: string): { ok: true; value: any } | { ok: false; error: string } {
  try {
    const v = JSON.parse(s || "{}");
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
      return { ok: false, error: "Params must be a JSON object (e.g. { \"fast\": 10 })." };
    }
    return { ok: true, value: v };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Invalid JSON" };
  }
}

export function StrategyFormDialog({
  open,
  onOpenChange,
  title = "New strategy",
  initialValues,
  onSubmit,
}: Props) {
  const [values, setValues] = React.useState<StrategyFormValues>(initialValues ?? DEFAULTS);
  const [symbolsText, setSymbolsText] = React.useState<string>(
    stringifySymbols((initialValues ?? DEFAULTS).symbols)
  );

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when opening (important for reuse between create/edit)
  React.useEffect(() => {
    if (!open) return;
    const v = initialValues ?? DEFAULTS;
    setValues(v);
    setSymbolsText(stringifySymbols(v.symbols));
    setError(null);
    setSaving(false);
  }, [open, initialValues]);

  const submit = async () => {
    setError(null);

    const symbols = parseSymbols(symbolsText);
    if (!values.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!values.type.trim()) {
      setError("Type is required (e.g. sma_cross).");
      return;
    }
    if (!Number.isFinite(values.interval_seconds) || values.interval_seconds < 5) {
      setError("Interval must be at least 5 seconds.");
      return;
    }
    if (!symbols.length) {
      setError("Please enter at least one symbol.");
      return;
    }

    const parsed = safeJsonParse(values.paramsJson);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    const payload: StrategyFormValues = {
      ...values,
      name: values.name.trim(),
      type: values.type.trim(),
      symbols,
      paramsJson: JSON.stringify(parsed.value, null, 2),
    };

    setSaving(true);
    try {
      await onSubmit(payload);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => setValues((p) => ({ ...p, name: e.target.value }))}
              placeholder="My SMA Cross"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Input
              id="type"
              value={values.type}
              onChange={(e) => setValues((p) => ({ ...p, type: e.target.value }))}
              placeholder="sma_cross"
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Must match a backend registry key (e.g. <span className="font-mono">sma_cross</span>).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">Interval (seconds)</Label>
            <Input
              id="interval"
              type="number"
              min={5}
              value={values.interval_seconds}
              onChange={(e) =>
                setValues((p) => ({ ...p, interval_seconds: Number(e.target.value) }))
              }
              className="rounded-xl"
            />
          </div>

          <div className="flex items-end justify-between gap-3 rounded-xl border p-3">
            <div>
              <div className="text-sm font-medium">Enabled</div>
              <div className="text-xs text-muted-foreground">
                If enabled, the worker will run it on schedule.
              </div>
            </div>
            <Switch
              checked={values.enabled}
              onCheckedChange={(v) => setValues((p) => ({ ...p, enabled: v }))}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="symbols">Symbols</Label>
            <Input
              id="symbols"
              value={symbolsText}
              onChange={(e) => setSymbolsText(e.target.value)}
              placeholder="AAPL, MSFT, NVDA"
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Comma or space separated. Stored uppercased.
            </p>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="params">Params (JSON)</Label>
            <textarea
              id="params"
              value={values.paramsJson}
              onChange={(e) => setValues((p) => ({ ...p, paramsJson: e.target.value }))}
              className={cn(
                "min-h-[180px] w-full rounded-2xl border bg-background px-3 py-2",
                "font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
              )}
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Must be a JSON object (not an array). This is passed into the strategy.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button className="rounded-xl" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
